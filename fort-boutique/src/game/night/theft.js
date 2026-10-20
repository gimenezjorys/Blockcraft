// Fort Boutique — vol et fuite (G8.4) : un Grignotin arrivé à la caisse prend son % du Bocal initial
// (plafonné à ce qui reste), devient voleur (+20 % de vitesse) et repart par où il est venu.

/**
 * Montant volé : % du Bocal initial, plafonné à ce qui reste.
 * @param {number} stealPct ex. 0,04
 * @param {number} jarInitial
 * @param {number} jarLeft
 */
export function theftAmount(stealPct, jarInitial, jarLeft) {
  if (stealPct <= 0 || jarLeft <= 0) return 0;
  return Math.min(jarLeft, Math.max(1, Math.round(stealPct * jarInitial)));
}

/** Le Grignotin vole le Bocal et devient voleur. */
export function stealFromJar(g, m) {
  const n = g.night;
  const amount = theftAmount(m.def.steal, n.jarInitial, n.jar);
  n.jar -= amount;
  m.carry = amount;
  m.thief = true;
  m.stoleAt = n.t;
  m.next = -1;
  n.thefts++;
  n.theftWave[m.wave] = (n.theftWave[m.wave] || 0) + 1;
  g.events.push('thief_grab', m.x, m.y, amount, m.id, m.type);
}

/** Le voleur est sorti : les pièces sont perdues pour cette nuit. */
export function escape(g, m) {
  const n = g.night;
  n.lost += m.carry;
  n.escaped++;
  n.lostWave[m.wave] = (n.lostWave[m.wave] || 0) + (m.carry > 0 ? 1 : 0);
  if (m.def.boss) n.bossEscaped = true;
  g.events.push('thief_escape', m.x, m.y, m.carry, m.id, m.type);
  m.carry = 0;
  m.alive = false;
  const arr = n.monsters.active;
  const i = arr.indexOf(m);
  if (i >= 0) n.monsters.releaseAt(i);
}

/**
 * Bocal gardé (G8.5) : Bocal final ÷ Bocal initial, plafonné à 100 % pour l'affichage et les étoiles.
 * @param {number} jarFinal
 * @param {number} jarInitial
 */
export function keptRatio(jarFinal, jarInitial) {
  if (jarInitial <= 0) return 1;
  return Math.max(0, Math.min(1, jarFinal / jarInitial));
}

/**
 * Étoiles : ★ dans tous les cas, ★★ si ≥ 70 % gardé, ★★★ si 100 % (G8.5).
 * @param {number} kept 0 à 1
 */
export function starsFor(kept) {
  if (kept >= 1 - 1e-9) return 3;
  if (kept >= 0.7 - 1e-9) return 2;
  return 1;
}

/** Valeur du Bocal au début de la nuit : max(20 × Q, arrondi(0,5 × recette du jour)) (G8.2). */
export function jarValue(districtN, dayTakings) {
  return Math.max(20 * districtN, Math.round(0.5 * dayTakings));
}
