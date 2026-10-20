// Horloge simulée pour les tests Node (logique pure).
import { setClock, setPerfClock } from '../../src/core/time.js';

/** Date de référence : lundi 19 octobre 2026, 12:00 UTC. */
export const REF_MS = Date.UTC(2026, 9, 19, 12, 0, 0);

/**
 * Installe une horloge contrôlable.
 * @param {number} [start]
 */
export function fakeClock(start = REF_MS) {
  let t = start;
  let perf = 0;
  setClock(() => t);
  setPerfClock(() => perf);
  return {
    get now() { return t; },
    set(ms) { t = ms; },
    advance(ms) { t += ms; perf += ms; },
    restore() { setClock(null); setPerfClock(null); },
  };
}
