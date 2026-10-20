// Fort Boutique — journal discret : silencieux en jeu, détaillé en mode debug.

let verbose = false;
const recent = [];

/** @param {boolean} on */
export function setVerbose(on) {
  verbose = !!on;
}

/**
 * Note un incident non bloquant (gardé en mémoire pour le panneau debug).
 * @param {string} msg
 * @param {unknown} [detail]
 */
export function note(msg, detail) {
  recent.push(detail === undefined ? msg : `${msg} ${String(detail)}`);
  if (recent.length > 50) recent.shift();
  if (verbose && typeof console !== 'undefined') console.warn('[Fort Boutique]', msg, detail ?? '');
}

/** @returns {string[]} */
export function recentNotes() {
  return recent.slice();
}
