// Fort Boutique — meubles (G9.3 génériques, G9.4 producteurs). Une ligne de données par meuble :
// la forme de jour (`day`) et la forme de nuit (`night`, un comportement paramétré, G9.5).
// Unités : cases, secondes, dégâts. `rate` = tirs par seconde.

/**
 * @typedef {object} NightForm
 * @property {string} behavior projectile | lob | cone | pulse | auraBuff | auraSlow | melee | beamRamp |
 *   multiShot | pierceLine | push | light | wall | homingBounce | stunPulse
 */

export const FURNITURE = {
  // ---------- Génériques (toutes les boutiques) ----------
  etagere: {
    id: 'etagere', size: [1, 1], district: 'q1', unlockLevel: 1, price: 40, max: 12, generic: true, access: true,
    hp: 60, air: true, tags: ['sell'],
    day: { kind: 'shelf', capacity: 4 },
    night: { behavior: 'projectile', dmg: 6, rate: 1.0, range: 2.5, speed: 9, projectile: 'can' },
  },
  caisse: {
    id: 'caisse', size: [1, 1], district: 'q1', unlockLevel: 1, price: 0, max: 1, generic: true, access: true, unique: true,
    hp: 0, invulnerable: true, air: true, tags: ['sell'],
    day: { kind: 'register' },
    night: { behavior: 'projectile', dmg: 2.5, rate: 3.0, range: 2.2, speed: 11, projectile: 'coin' },
  },
  comptoir: {
    id: 'comptoir', size: [1, 1], district: 'q1', unlockLevel: 2, price: 20, max: 16, generic: true,
    hp: 140, air: false, tags: ['decor'],
    day: { kind: 'decor', attract: 1 },
    night: { behavior: 'wall' },
  },
  plante: {
    id: 'plante', size: [1, 1], district: 'q1', unlockLevel: 3, price: 90, max: 6, generic: true,
    hp: 90, air: false, tags: ['decor', 'defend'], target: 'nearest',
    day: { kind: 'decor', attract: 3 },
    night: { behavior: 'melee', dmg: 16, rate: 0.8, range: 1.1, swallowEvery: 8, swallowBelow: 0.15 },
  },
  cafe: {
    id: 'cafe', size: [1, 1], district: 'q2', unlockLevel: 8, price: 350, max: 3, generic: true,
    hp: 70, air: false, tags: ['decor'],
    day: { kind: 'coffee', radius: 2, customerSpeed: 0.2 },
    night: { behavior: 'auraBuff', radius: 1.5, rateBonus: 0.3 },
  },
  lanterne: {
    id: 'lanterne', size: [1, 1], district: 'q3', unlockLevel: 12, price: 300, max: 6, generic: true,
    hp: 50, air: true, tags: ['decor', 'defend'],
    day: { kind: 'decor', attract: 4 },
    night: { behavior: 'light', dmg: 7, rate: 1.0, range: 2.5, revealRadius: 2.5, lightRadius: 2.5, element: 'light' },
  },
  ventilo: {
    id: 'ventilo', size: [1, 1], district: 'q4', unlockLevel: 18, price: 600, max: 4, generic: true, orientable: true,
    hp: 80, air: true, tags: ['defend'],
    day: { kind: 'fan', radius: 2, patience: 0.15 },
    night: { behavior: 'push', every: 2.5, length: 3, push: 1, dmg: 4 },
  },
  aimant: {
    id: 'aimant', size: [1, 1], district: 'q4', unlockLevel: 20, price: 700, max: 2, generic: true,
    hp: 100, air: true, tags: ['defend'],
    day: { kind: 'magnet', radius: 3 },
    night: { behavior: 'auraSlow', radius: 2, slow: 0.4, onlyMetal: true },
  },
  horloge: {
    id: 'horloge', size: [1, 1], district: 'q5', unlockLevel: 26, price: 1500, max: 1, generic: true, rare: true,
    hp: 150, air: true, tags: ['defend'],
    day: { kind: 'clock', dayBonusS: 10 },
    night: { behavior: 'auraSlow', radius: 2, slow: 0.3, stunEvery: 10, stun: 0.8 },
  },

  // ---------- Producteurs (boutique de leur quartier) ----------
  cagette: {
    id: 'cagette', size: [1, 1], district: 'q1', unlockLevel: 1, price: 60, max: 4, access: true,
    hp: 60, air: false, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'pomme', interval: 2.2, reserve: 6 },
    night: { behavior: 'lob', dmg: 8, rate: 0.6, range: 3.5, radius: 0.8, speed: 6, projectile: 'apple' },
  },
  frigo: {
    id: 'frigo', size: [1, 1], district: 'q1', unlockLevel: 2, price: 150, max: 3, access: true,
    hp: 80, air: true, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'lait', interval: 3.0, reserve: 5 },
    night: { behavior: 'projectile', dmg: 3, rate: 1.0, range: 2.2, speed: 8, slow: 0.4, slowDur: 1.5, element: 'cold', projectile: 'frost' },
  },
  chaudron: {
    id: 'chaudron', size: [1, 1], district: 'q1', unlockLevel: 4, price: 300, max: 2, access: true,
    hp: 90, air: false, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'confiture', interval: 4.5, reserve: 4 },
    night: { behavior: 'lob', dmg: 6, rate: 0.5, range: 3.0, radius: 1.0, speed: 5, slow: 0.25, slowDur: 2, projectile: 'jam' },
  },
  four: {
    id: 'four', size: [2, 1], district: 'q2', unlockLevel: 7, price: 500, max: 2, access: true, orientable: true,
    hp: 140, air: false, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'baguette', interval: 3.5, reserve: 6 },
    night: { behavior: 'cone', angle: 90, length: 2.2, ticks: 5, dmg: 2, burn: 3, burnDur: 2, element: 'fire', light: 1.2 },
  },
  petrin: {
    id: 'petrin', size: [1, 1], district: 'q2', unlockLevel: 9, price: 650, max: 2, access: true,
    hp: 110, air: false, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'croissant', interval: 4.0, reserve: 5 },
    night: { behavior: 'pulse', every: 2.5, dmg: 12, radius: 1.3, knockback: 0.5 },
  },
  vitrine: {
    id: 'vitrine', size: [2, 1], district: 'q2', unlockLevel: 10, price: 900, max: 1, access: true,
    hp: 100, air: true, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'gateau', interval: 7.0, reserve: 3 },
    night: { behavior: 'projectile', dmg: 5, rate: 1.2, range: 3.0, speed: 8, slow: 0.5, slowDur: 1.5, projectile: 'cream' },
  },
  herbier: {
    id: 'herbier', size: [1, 1], district: 'q3', unlockLevel: 12, price: 1100, max: 3, access: true,
    hp: 80, air: false, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'tisane', interval: 4.0, reserve: 5 },
    night: { behavior: 'lob', dmg: 0, rate: 0.5, range: 3.0, radius: 1.0, speed: 5, poison: 6, poisonDur: 3, element: 'poison', projectile: 'spore' },
  },
  pilulier: {
    id: 'pilulier', size: [1, 1], district: 'q3', unlockLevel: 13, price: 1300, max: 3, access: true,
    hp: 70, air: true, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'pastilles', interval: 2.8, reserve: 6 },
    night: { behavior: 'projectile', dmg: 4, rate: 2.5, range: 2.6, speed: 10, projectile: 'pill' },
  },
  alambic: {
    id: 'alambic', size: [1, 1], district: 'q3', unlockLevel: 14, price: 2400, max: 1, access: true, rare: true,
    hp: 100, air: false, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'potion', interval: 6.5, reserve: 3 },
    night: { behavior: 'lob', dmg: 30, rate: 0.33, range: 4.0, radius: 1.3, speed: 5, projectile: 'potion' },
  },
  etabli: {
    id: 'etabli', size: [2, 1], district: 'q4', unlockLevel: 18, price: 3000, max: 2, access: true, orientable: true,
    hp: 160, air: true, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'clous', interval: 3.5, reserve: 6 },
    night: { behavior: 'pierceLine', dmg: 14, rate: 0.7, length: 4 },
  },
  enclume: {
    id: 'enclume', size: [1, 1], district: 'q4', unlockLevel: 19, price: 3600, max: 1, access: true,
    hp: 220, air: false, tags: ['sell', 'defend'], target: 'nearest',
    day: { kind: 'producer', product: 'marteau', interval: 6.0, reserve: 3 },
    night: { behavior: 'stunPulse', every: 3, dmg: 35, radius: 1.2, stun: 0.6 },
  },
  peinture: {
    id: 'peinture', size: [1, 1], district: 'q4', unlockLevel: 21, price: 4200, max: 2, access: true,
    hp: 80, air: true, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'peinture', interval: 4.5, reserve: 4 },
    night: { behavior: 'projectile', dmg: 3, rate: 1.5, range: 3.0, speed: 9, tag: 0.25, tagDur: 3, projectile: 'paint' },
  },
  bonbons: {
    id: 'bonbons', size: [1, 1], district: 'q5', unlockLevel: 24, price: 6000, max: 2, access: true,
    hp: 80, air: true, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'bonbons', interval: 3.0, reserve: 6, attract: 6 },
    night: { behavior: 'multiShot', targets: 3, dmg: 4, rate: 2.0, range: 2.6, speed: 10, projectile: 'candy' },
  },
  cristal: {
    id: 'cristal', size: [1, 1], district: 'q5', unlockLevel: 28, price: 9000, max: 1, access: true, rare: true,
    hp: 90, air: true, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'cristal', interval: 8.0, reserve: 2 },
    night: { behavior: 'beamRamp', dps: 10, rampPerS: 0.5, rampMax: 4, range: 3.2, element: 'light' },
  },
  pupitre: {
    id: 'pupitre', size: [1, 1], district: 'q5', unlockLevel: 30, price: 12000, max: 1, access: true, rare: true,
    hp: 90, air: true, tags: ['sell', 'defend'],
    day: { kind: 'producer', product: 'grimoire', interval: 10.0, reserve: 2 },
    night: { behavior: 'homingBounce', dmg: 18, rate: 0.6, range: 3.5, bounces: 3, falloff: 0.2, speed: 7, projectile: 'page' },
  },
};

export const FURNITURE_IDS = Object.keys(FURNITURE);

/** @param {string} id */
export function furnitureDef(id) {
  const d = FURNITURE[id];
  if (!d) throw new Error(`meuble inconnu : ${id}`);
  return d;
}

/** Empreinte (largeur, hauteur) selon la rotation 0 à 3 (impair = tourné de 90°). */
export function footprint(def, rot) {
  const [w, h] = def.size;
  return rot % 2 === 1 ? [h, w] : [w, h];
}

/** Attractivité de décor d'un meuble (G7.1). */
export function attractOf(def) {
  return def.day.attract || 0;
}
