// Fort Boutique — producteurs (G7.6) : un article à intervalle fixe, réserve plafonnée.
import { dayStats } from '../stats.js';

/**
 * Prépare les producteurs pour la journée (statistiques selon le niveau).
 * @param {any} g
 */
export function initProducers(g) {
  for (const f of g.furn) {
    if (f.def.day.kind !== 'producer') continue;
    const s = dayStats(f.def, f.level);
    f.interval = s.interval;
    f.reserve = s.reserve;
    f.stock = Math.min(f.stock, f.reserve);
    f.prodT = 0;
  }
}

/** @param {any} g @param {number} dt */
export function stepProducers(g, dt) {
  for (const f of g.furn) {
    if (f.def.day.kind !== 'producer' || f.stock >= f.reserve) continue;
    f.prodT += dt;
    if (f.prodT >= f.interval) {
      f.prodT -= f.interval;
      f.stock++;
      f.item.stock = f.stock;
      g.events.push('produce', f.cx, f.cy, f.stock, 0, f.def.day.product);
    }
  }
}

/** Remplit toutes les réserves (livraison du matin, G16). */
export function fillAllProducers(g) {
  for (const f of g.furn) {
    if (f.def.day.kind !== 'producer') continue;
    const s = dayStats(f.def, f.level);
    f.stock = s.reserve;
    f.item.stock = f.stock;
  }
}
