// Fort Boutique — règles de combat (G9.2) : armure, multiplicateurs, ralentissements non cumulables,
// étourdissement, brûlure, poison, « taché », recul. Fonctions pures sur l'objet Grignotin.

/** Éléments qui ignorent l'armure. */
export const ARMOR_PIERCING = new Set(['fire', 'burn', 'poison', 'light']);

/** Réduction des effets de contrôle sur les boss (×0,5, G9.2). */
export const BOSS_CONTROL = 0.5;

/**
 * Dégâts reçus = max(1 ; dégâts − armure), sauf feu, brûlure, poison et lumière (G9.2).
 * @param {number} dmg dégâts après multiplicateurs
 * @param {number} armor
 * @param {string} element
 */
export function armorReduce(dmg, armor, element) {
  if (dmg <= 0) return 0;
  if (ARMOR_PIERCING.has(element)) return dmg;
  return Math.max(1, dmg - armor);
}

/**
 * Multiplicateurs : faiblesse, « taché » (+25 %), bonus de bestiaire, Courage de Mamie.
 * @param {any} m Grignotin
 * @param {string} element
 * @param {{ bestiary?: number, assist?: number }} [bonus]
 */
export function damageMultiplier(m, element, bonus = {}) {
  let k = 1;
  const weak = m.def.weak;
  if (weak) {
    if (weak[element]) k *= weak[element];
    else if (element === 'burn' && weak.fire) k *= weak.fire;
  }
  if (m.taggedT > 0) k *= 1 + m.tagAmt;
  k *= 1 + (bonus.bestiary || 0);
  k *= 1 + (bonus.assist || 0);
  return k;
}

/**
 * Applique un ralentissement : seul le plus fort compte, la durée se rafraîchit (G9.2).
 * @param {any} m
 * @param {number} amount 0 à 1 (0,4 = −40 %)
 * @param {number} dur s
 * @param {string} [element] 'cold' pour le golem (×0,5)
 */
export function applySlow(m, amount, dur, element) {
  let a = amount;
  if (element === 'cold' && m.def.coldResist) a *= m.def.coldResist;
  if (m.def.boss) a *= m.def.slowResist ?? BOSS_CONTROL;
  if (a <= 0) return;
  if (m.slowT <= 0 || a > m.slowAmt + 1e-9) {
    m.slowAmt = a;
    m.slowT = dur;
  } else if (Math.abs(a - m.slowAmt) <= 1e-9) {
    m.slowT = Math.max(m.slowT, dur);
  }
}

/** Ralentissement effectif (le plus fort entre l'effet et les auras). */
export function effectiveSlow(m) {
  return Math.max(m.slowT > 0 ? m.slowAmt : 0, m.auraSlow || 0);
}

/** @param {any} m @param {number} dur */
export function applyStun(m, dur) {
  if (m.def.noStun) return;
  const d = m.def.boss ? dur * BOSS_CONTROL : dur;
  m.stunT = Math.max(m.stunT, d);
}

/** Brûlure (feu) : garde le plus fort, rafraîchit la durée. */
export function applyBurn(m, dps, dur) {
  if (dps > m.burnDps || m.burnT <= 0) m.burnDps = dps;
  m.burnT = Math.max(m.burnT, dur);
}

/** Poison. */
export function applyPoison(m, dps, dur) {
  if (dps > m.poisonDps || m.poisonT <= 0) m.poisonDps = dps;
  m.poisonT = Math.max(m.poisonT, dur);
}

/** « Taché » : +25 % de dégâts subis. */
export function applyTag(m, amount, dur) {
  m.tagAmt = Math.max(m.taggedT > 0 ? m.tagAmt : 0, amount);
  m.taggedT = Math.max(m.taggedT, dur);
}

/**
 * Recul (cases), réduit de moitié pour un boss, nul s'il est immunisé.
 * @returns {number} distance de recul effective
 */
export function knockbackAmount(m, cells) {
  if (m.def.noKnockback) return 0;
  return m.def.boss ? cells * BOSS_CONTROL : cells;
}

/**
 * Fait avancer les effets dans le temps ; renvoie les dégâts de brûlure + poison du pas.
 * @param {any} m
 * @param {number} dt
 */
export function tickEffects(m, dt) {
  let dot = 0;
  if (m.slowT > 0) m.slowT -= dt;
  if (m.stunT > 0) m.stunT -= dt;
  if (m.taggedT > 0) m.taggedT -= dt;
  if (m.burnT > 0) {
    dot += m.burnDps * dt;
    m.burnT -= dt;
  }
  if (m.poisonT > 0) {
    dot += m.poisonDps * dt;
    m.poisonT -= dt;
  }
  return dot;
}

/** Remet à zéro tous les effets (Grignotin recyclé). */
export function clearEffects(m) {
  m.slowAmt = 0;
  m.slowT = 0;
  m.auraSlow = 0;
  m.stunT = 0;
  m.burnDps = 0;
  m.burnT = 0;
  m.poisonDps = 0;
  m.poisonT = 0;
  m.tagAmt = 0;
  m.taggedT = 0;
}
