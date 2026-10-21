// Fort Boutique — cycle complet (G5) : Matin -> Jour -> Crépuscule -> Nuit -> Aube -> Matin,
// reprise exacte après rechargement (G5.2). Logique pure : l'interface appelle ces transitions.
import { seedFrom } from '../core/rng.js';
import { CHEST_BY_STARS } from '../data/chests.js';
import { NIGHT } from '../data/night.js';
import { xpToNext } from '../data/xp.js';
import { startDay } from './day/day.js';
import { claimNight } from './night/night.js';
import { rollChest, applyChest, upgradeChestRank } from './chests.js';
import { fillAllProducers } from './day/producers.js';
import { DISTRICTS, DISTRICT_IDS } from '../data/districts.js';
import { districtOpen, applyLevelUps } from './progression.js';
import { defaultShop } from '../save/schema.js';
import { trackQuest } from './quest-track.js';
import { recordNight } from './streak.js';
import { now, utcDay, utcWeekday } from '../core/time.js';
import { currentEvent } from './weekly-events.js';
import { franchiseBossWin } from './franchise.js';

/**
 * Où reprendre une partie chargée (G5.2) : jour avec le temps restant, nuit depuis le début, aube, matin.
 * @param {any} g
 * @returns {'intro' | 'morning' | 'day' | 'night' | 'dawn'}
 */
export function resumePoint(g) {
  const ph = g.shop.phase;
  if (g.save.stats.cycles === 0 && g.shop.day === 1 && ph.name === 'morning' && !g.save.progress.flags.introDone) return 'intro';
  if (ph.name === 'day' && ph.dayTimeLeftS > 0) return 'day';
  if (ph.name === 'night' || ph.name === 'dusk' || ph.name === 'closing' || (ph.name === 'day' && ph.dayTimeLeftS <= 0)) return 'night';
  if (ph.name === 'dawn') return 'dawn';
  return 'morning';
}

/** Matin (hub) : la boutique attend le bouton OUVRIR. */
export function enterMorning(g) {
  g.phase = { name: 'morning', t: 0 };
  g.shop.phase.name = 'morning';
  g.day = null;
  g.night = null;
  for (const f of g.furn) {
    f.eyes = 0;
    f.broken = false;
  }
}

/** OUVRIR : la journée commence. */
export function openShop(g) {
  startDay(g);
}

/**
 * Reprise au début de la nuit après un rechargement (G5.2). Si la page a été fermée pendant la fermeture,
 * la fin de journée n'a pas été comptée : le tas resté sur la caisse est crédité (A0.2) et la recette notée.
 * @param {any} g
 * @returns {number} recette du jour (base du Bocal)
 */
export function resumeNight(g) {
  const ph = g.shop.phase;
  if (ph.name !== 'night') {
    if (ph.dayPile > 0) g.save.player.coins += ph.dayPile;
    ph.dayPile = 0;
    g.shop.lastDayTakings = ph.dayTakings || 0;
    ph.dayTimeLeftS = 0;
    ph.name = 'night';
  }
  const takings = ph.dayTakings || 0;
  const sales = ph.daySales || 0;
  const tips = ph.dayTips || 0;
  // Anciennes sauvegardes (sans ventes ni pourboires) : la recette entière compte comme ventes.
  g.dayResult = sales + tips > 0 ? { takings, sales, tips } : { takings, sales: takings, tips: 0 };
  return takings;
}

/** Fin de journée : la reprise se fera au début de la nuit (même graine, mêmes vagues). */
export function markNightPending(g) {
  g.shop.phase.name = 'night';
}

/**
 * La nuit est finie : on calcule le coffre et on attribue les gains une seule fois.
 * @param {any} g
 * @returns {any} état de l'aube (sauvegardé dans shop.phase.dawn)
 */
export function enterDawn(g) {
  const result = g.nightResult || (g.night && g.night.result);
  const ph = g.shop.phase;
  let chestType = result.bossNight ? (result.bossWin ? 'moon' : null) : CHEST_BY_STARS[result.stars] || 'wood';
  if (chestType && result.golden) chestType = chestType === 'moon' ? 'moon' : upgradeChestRank(chestType);
  const first = !g.save.progress.flags.firstChestDone && chestType !== null;
  const day = g.dayResult || { sales: g.shop.lastDayTakings, tips: 0 };
  ph.dawn = {
    result,
    day: { sales: day.sales || 0, tips: day.tips || 0 },
    chest: chestType ? { type: first ? 'wood' : chestType, first, opened: false, seed: seedFrom(g.save.seed, 'aube', g.save.stats.cycles, g.shopId) } : null,
    adDoubled: false,
    // Coffres en bois gagnés par les Commandes spéciales du jour (G7.7), ouverts après celui de la nuit.
    extra: Array.from({ length: Math.max(0, ph.orderChests | 0) }, (_, i) => ({
      type: 'wood', first: false, opened: false, seed: seedFrom(g.save.seed, 'commande', g.save.stats.cycles, g.shopId, i),
    })),
  };
  ph.orderChests = 0;
  ph.retryDmg = 0;
  // Fête de Mamie (G13.5) : un coffre d'argent en plus à la première aube du dimanche (une fois par dimanche).
  const ev = currentEvent();
  const today = utcDay();
  const ep = g.save.daily.eventProgress;
  if (ev.sundayChest && utcWeekday() === 6 && ep.sundayDay !== today && !result.tutorial) {
    ep.sundayDay = today;
    ph.dawn.extra.push({ type: ev.sundayChest, first: false, opened: false, seed: seedFrom(g.save.seed, 'dimanche', today) });
  }
  ph.name = 'dawn';
  const levelFrom = g.save.player.level;
  claimNight(g, result);
  // La flamme de la boutique avance une fois par jour UTC (G15.2).
  ph.dawn.streak = recordNight(g.save, now());
  // G19 2:57 : la première aube fête toujours le niveau 2 ; il ne manque au plus que quelques XP à un joueur hésitant
  // (P2, Léa), on les complète une seule fois.
  if (result.tutorial && g.save.player.level === 1) g.save.player.xp = Math.max(g.save.player.xp, xpToNext(1));
  // L'XP du jour et de la nuit fait monter de niveau maintenant (G12.3) ; le ruban de l'aube le montre.
  applyLevelUps(g);
  // Le passage de niveau se montre sur l'écran de l'aube (ruban), même après un rechargement.
  ph.dawn.level = { from: levelFrom, to: g.save.player.level };
  g.phase = { name: 'dawn', t: 0 };
  return ph.dawn;
}

/**
 * Ouvre le coffre de l'aube (3 taps côté interface).
 * @returns {ReturnType<typeof rollChest> | null}
 */
export function openDawnChest(g) {
  const dawn = g.shop.phase.dawn;
  if (!dawn || !dawn.chest || dawn.chest.opened) return null;
  const c = dawn.chest;
  const content = rollChest(g.save, c.type, { shopId: g.shopId, seed: c.seed, first: c.first });
  // Le cosmétique du quartier vient avec le premier Coffre de Lune (le compteur de boss n'avance qu'en quittant l'aube).
  if (c.type === 'moon' && !g.save.cosmetics.owned.includes(`moon_${g.shopId}`)) {
    content.cosmetic = `moon_${g.shopId}`;
  }
  applyChest(g.save, content);
  c.opened = true;
  c.content = content;
  if (c.first) g.save.progress.flags.firstChestDone = true;
  return content;
}

/**
 * Ouvre un coffre en plus de l'aube (Commande spéciale).
 * @param {any} g
 * @param {number} i
 */
export function openExtraChest(g, i) {
  const dawn = g.shop.phase.dawn;
  const c = dawn && dawn.extra && dawn.extra[i];
  if (!c || c.opened) return null;
  const content = rollChest(g.save, c.type, { shopId: g.shopId, seed: c.seed });
  applyChest(g.save, content);
  c.opened = true;
  c.content = content;
  return content;
}

/**
 * Aube -> Matin : on avance d'une nuit (ou de semaine après la Pleine Lune, G8.9).
 * @param {any} g
 */
export function leaveDawn(g) {
  const shop = g.shop;
  const dawn = shop.phase.dawn;
  // G3.8 « Rien ne se perd » : un coffre resté fermé s'ouvre tout seul en quittant l'aube.
  if (dawn && dawn.chest && !dawn.chest.opened) openDawnChest(g);
  if (dawn && dawn.extra) dawn.extra.forEach((c, i) => !c.opened && openExtraChest(g, i));
  const r = dawn ? dawn.result : null;
  if (r && r.bossNight) {
    if (r.bossWin) {
      shop.bossBeatenCount++;
      // Franchise (G13.4) : le boss battu en Lune rouge donne une étoile ; la semaine continue normalement.
      franchiseBossWin(shop);
      shop.week++;
      // Quartier suivant : sa carte se fête au Matin s'il est vraiment ouvert (boss vaincu ET niveau, G12.4).
      const next = DISTRICT_IDS.find((id) => DISTRICTS[id].previousBoss === g.shopId);
      if (next && shop.bossBeatenCount === 1 && districtOpen(g.save, next)) {
        if (!g.save.shops[next]) g.save.shops[next] = defaultShop(next);
        g.save.shops[next].unlocked = true;
        if (!g.save.progress.pendingDistricts.includes(next)) g.save.progress.pendingDistricts.push(next);
      }
      shop.night = 1;
      shop.bossAssist = 0;
      const st = g.save.stats;
      st.bossKills[g.district.boss] = (st.bossKills[g.district.boss] || 0) + 1;
      // Succès « vaincu en semaine 5 » (G14.3) : la semaine du combat, avant le passage à la suivante.
      if (shop.week - 1 >= 5) st.bossKillsW5[g.district.boss] = (st.bossKillsW5[g.district.boss] || 0) + 1;
      trackQuest(g.save, 'moon');
    } else {
      shop.bossAssist = Math.min(Math.round(NIGHT.assistMax / NIGHT.assistPerFail), shop.bossAssist + 1);
    }
  } else {
    shop.night = Math.min(7, shop.night + 1);
  }
  shop.day++;
  g.save.stats.cycles++;
  shop.phase.dawn = null;
  shop.phase.dawnClaimed = true;
  shop.phase.dayTakings = 0;
  shop.phase.dayTimeLeftS = 0;
  enterMorning(g);
}

/** Livraison du matin après une absence (G16) : réserves pleines. */
export function morningDelivery(g) {
  fillAllProducers(g);
}

/**
 * Revanche tout de suite après une Pleine Lune perdue (pub rw_boss_retry, G18.1) : la même nuit recommence avec +25 %
 * de dégâts et un Bocal vide (les pièces de la première tentative sont déjà gagnées). Le Courage de Mamie n'avance pas.
 * @param {any} g
 * @param {number} bonus 0,25
 * @returns {boolean}
 */
export function retryBossNight(g, bonus) {
  const ph = g.shop.phase;
  const r = ph.dawn && ph.dawn.result;
  if (!r || !r.bossNight || r.bossWin) return false;
  if (ph.dawn.chest && !ph.dawn.chest.opened) openDawnChest(g);
  ph.dawn = null;
  ph.dawnClaimed = false;
  ph.name = 'night';
  ph.retryDmg = 1 + bonus;
  for (const f of g.furn) {
    f.broken = false;
    f.eyes = 1;
  }
  return true;
}

/**
 * Crée la boutique de chaque quartier ouvert (boss précédent vaincu ET niveau) qui n'existe pas encore : un niveau
 * atteint après la victoire sur le boss ouvre aussi le quartier (G12.4). Sa carte se fête au Matin suivant.
 * @param {any} save
 * @returns {string[]} quartiers ouverts maintenant
 */
export function openReadyDistricts(save) {
  const opened = [];
  for (const id of DISTRICT_IDS) {
    if (save.shops[id] && save.shops[id].unlocked) continue;
    if (!districtOpen(save, id)) continue;
    save.shops[id] = save.shops[id] || defaultShop(id);
    save.shops[id].unlocked = true;
    if (!save.progress.pendingDistricts.includes(id)) save.progress.pendingDistricts.push(id);
    opened.push(id);
  }
  return opened;
}
