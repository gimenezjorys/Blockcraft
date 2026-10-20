// Fort Boutique — XP, niveau de marchand et déblocages (G12.3, G12.4). Complété en M7.
import { xpToNext, MAX_LEVEL } from '../data/xp.js';
import { DISTRICT_FACTORS } from '../data/balance.js';

/**
 * Ajoute de l'XP (déjà multipliée par X_Q si besoin) et fait monter de niveau.
 * @param {any} g partie (ou { save, events })
 * @param {number} amount
 * @returns {number} nombre de niveaux gagnés
 */
export function addXp(g, amount) {
  const p = g.save.player;
  if (!(amount > 0)) return 0;
  p.xp += amount;
  let gained = 0;
  while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level++;
    gained++;
    if (g.save.progress && Array.isArray(g.save.progress.pendingUnlocks)) g.save.progress.pendingUnlocks.push(p.level);
    if (g.events) g.events.push('level_up', 0, 0, p.level);
  }
  if (p.level >= MAX_LEVEL) p.xp = Math.min(p.xp, 0);
  p.xp = Math.round(p.xp * 100) / 100;
  return gained;
}

/** Multiplicateur d'XP du quartier (X_Q). */
export function xpFactor(shopId) {
  return DISTRICT_FACTORS.xp[shopId] || 1;
}

/** Progression vers le niveau suivant (0 à 1). */
export function levelProgress(player) {
  const need = xpToNext(player.level);
  return Number.isFinite(need) ? Math.min(1, player.xp / need) : 1;
}
