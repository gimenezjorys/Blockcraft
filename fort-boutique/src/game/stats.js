// Fort Boutique — statistiques d'un meuble selon son niveau (G9.1).
import { FURNITURE_LEVEL as FL, CUSTOMERS } from '../data/balance.js';

/** Nombre de paliers de niveau atteints parmi une liste (ex. [3, 5, 7, 9]). */
const stepsReached = (levels, level) => levels.filter((l) => level >= l).length;

/**
 * @param {any} def définition (data/furniture.js)
 * @param {number} level 1 à 10
 */
export function dayStats(def, level) {
  const d = def.day;
  const L = Math.max(1, level);
  return {
    interval: d.interval ? d.interval * Math.pow(FL.prodMult, L - 1) : 0,
    reserve: d.reserve ? d.reserve + stepsReached(FL.reserveLevels, L) : 0,
    capacity: d.kind === 'shelf' ? (d.capacity || 4) + (L - 1) : 0,
    cashTime: Math.max(CUSTOMERS.cashTimeMin, CUSTOMERS.cashTime - FL.cashPerLevel * (L - 1)),
  };
}

/**
 * @param {any} def
 * @param {number} level
 */
export function nightStats(def, level) {
  const n = def.night;
  const L = Math.max(1, level);
  const effect = Math.min(FL.effectMax, 1 + FL.effectAdd * (L - 1));
  return {
    dmg: (n.dmg || 0) * Math.pow(FL.dmgMult, L - 1),
    dps: (n.dps || 0) * Math.pow(FL.dmgMult, L - 1),
    rate: (n.rate || 0) * (1 + FL.rateAdd * (L - 1)),
    range: (n.range || n.radius || n.length || 0) + FL.rangeAdd * stepsReached(FL.rangeLevels, L),
    hp: def.hp ? def.hp * Math.pow(FL.hpMult, L - 1) : 0,
    effect,
  };
}
