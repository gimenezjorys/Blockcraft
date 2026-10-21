// Fort Boutique — hors ligne et retour (G16). Rien ne se perd pendant l'absence : aucun vol, aucune dégradation.
// Après 15 min : réserves des producteurs pleines, et chaque boutique avec au moins un commis et un caissier rapporte
// 0,2 × (recette du dernier jour ÷ sa durée en minutes) × minutes d'absence (au plus 8 h). Après 3 jours : Coffre de
// Bienvenue (une fois par absence).
import { OFFLINE } from '../data/balance.js';
import { FURNITURE } from '../data/furniture.js';
import { seedFrom } from '../core/rng.js';
import { utcDay } from '../core/time.js';
import { dayStats } from './stats.js';
import { furnState } from './state.js';
import { isUnlocked } from './progression.js';
import { rollChest, applyChest } from './chests.js';

const MIN = 60000;

/** Remplit les réserves des producteurs d'une boutique (jamais à la baisse). */
function fillShop(save, shop) {
  for (const it of shop.layout) {
    const def = FURNITURE[it.id];
    if (!def || def.day.kind !== 'producer') continue;
    const reserve = dayStats(def, furnState(save, it.id).level).reserve;
    it.stock = Math.max(Number.isFinite(it.stock) ? it.stock : 0, reserve);
  }
}

/** Gains du personnel pendant l'absence pour une boutique (0 sans commis ET caissier). */
export function staffIncome(save, shop, minutes) {
  if (!isUnlocked(save, 'staff') || !shop.staff.clerks.length || !shop.staff.cashier) return 0;
  const dayMin = Math.max(1, (shop.lastDayDurationS || 90) / 60);
  return Math.round(OFFLINE.staffShare * ((shop.lastDayTakings || 0) / dayMin) * Math.min(minutes, OFFLINE.capHours * 60));
}

/**
 * Retour après une absence (appelé au chargement, avant de recréer la partie). Les gains sont versés tout de suite ;
 * `offline.pendingDelivery` garde le ticket « Pendant ton absence » pour le prochain Matin.
 * @param {any} save
 * @param {number} t maintenant (ms)
 * @returns {{ minutes: number, coins: number, welcome: any } | null}
 */
export function collectOffline(save, t) {
  const away = t - (save.lastSeenAt || t);
  if (!(away >= OFFLINE.minAbsenceMin * MIN)) return null;
  const minutes = Math.min(away / MIN, OFFLINE.capHours * 60);
  let coins = 0;
  for (const shop of Object.values(save.shops)) {
    if (!shop || !shop.unlocked) continue;
    fillShop(save, shop);
    coins += staffIncome(save, shop, minutes);
  }
  save.player.coins += coins;
  let welcome = null;
  const leftDay = utcDay(save.lastSeenAt);
  if (away >= OFFLINE.welcomeDays * 24 * 60 * MIN && save.offline.welcomeChestForDay !== leftDay) {
    welcome = rollChest(save, 'welcome', { shopId: save.currentShop, seed: seedFrom(save.seed, 'bienvenue', leftDay) });
    applyChest(save, welcome);
    save.offline.welcomeChestForDay = leftDay;
  }
  save.offline.lastCollectAt = t;
  const prev = save.offline.pendingDelivery;
  // Deux retours avant un Matin : les tickets s'additionnent (rien ne disparaît de l'affichage).
  save.offline.pendingDelivery = {
    minutes: Math.round(minutes) + (prev ? prev.minutes || 0 : 0),
    coins: coins + (prev ? prev.coins || 0 : 0),
    welcome: welcome || (prev ? prev.welcome || null : null),
  };
  return { minutes, coins, welcome };
}
