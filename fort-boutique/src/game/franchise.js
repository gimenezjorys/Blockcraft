// Fort Boutique — Franchise de quartier (G13.4, niveau 16, boss du quartier vaincu au moins une fois) : la semaine
// repart à 1, disposition et meubles gardés, la boutique passe en Lune rouge (PV × (1,5 + 0,5 × étoiles)). Battre à
// nouveau le boss donne une étoile de franchise (5 au plus) : +10 % de ventes et de butin par étoile, pour toujours.
import { FRANCHISE } from '../data/balance.js';
import { isUnlocked } from './progression.js';

/** Peut-on franchiser cette boutique maintenant ? */
export function canFranchise(save, shopId) {
  const shop = save.shops[shopId];
  if (!shop || !shop.unlocked || !isUnlocked(save, 'franchise')) return { ok: false, reason: 'level' };
  if (shop.bossBeatenCount < 1) return { ok: false, reason: 'boss' };
  if (shop.redMoon) return { ok: false, reason: 'running' };
  if (shop.franchiseStars >= FRANCHISE.maxStars) return { ok: false, reason: 'max' };
  if (shop.phase.name !== 'morning') return { ok: false, reason: 'phase' };
  return { ok: true };
}

/** Franchiser : semaine 1, Lune rouge. */
export function startFranchise(save, shopId) {
  if (!canFranchise(save, shopId).ok) return false;
  const shop = save.shops[shopId];
  shop.week = 1;
  shop.night = 1;
  shop.redMoon = true;
  shop.bossAssist = 0;
  return true;
}

/** Boss vaincu en Lune rouge : une étoile de plus, la Lune rouge s'arrête. @returns {boolean} étoile gagnée */
export function franchiseBossWin(shop) {
  if (!shop.redMoon) return false;
  shop.redMoon = false;
  shop.franchiseStars = Math.min(FRANCHISE.maxStars, (shop.franchiseStars || 0) + 1);
  return true;
}

/** Multiplicateur de PV de la Lune rouge. */
export function redMoonMult(shop) {
  return shop.redMoon ? FRANCHISE.redMoonBase + FRANCHISE.redMoonPerStar * (shop.franchiseStars || 0) : 1;
}

/** Bonus permanent de ventes (+10 % par étoile). */
export function franchiseSalesBonus(shop) {
  return FRANCHISE.salesPerStar * (shop.franchiseStars || 0);
}
