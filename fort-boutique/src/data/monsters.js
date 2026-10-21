// Fort Boutique — Grignotins (G10.1) et boss (G10.3). Valeurs de base : semaine 1, nuit 1, Q1.
// steal = part du Bocal initial volée ; threat = coût de menace (G8.3).

export const MONSTERS = {
  raton: { id: 'raton', hp: 25, armor: 0, speed: 1.0, steal: 0.04, loot: 2, threat: 1, group: [2, 5] },
  souris: { id: 'souris', hp: 11, armor: 0, speed: 1.8, steal: 0.02, loot: 1, threat: 0.5, group: [3, 5] },
  gloubi: {
    id: 'gloubi', hp: 62, armor: 0, speed: 0.6, steal: 0.06, loot: 3, threat: 2, group: [2, 5],
    weak: { fire: 1.5 }, split: { into: 'mini_gloubi', count: 2 },
  },
  mini_gloubi: { id: 'mini_gloubi', hp: 17, armor: 0, speed: 0.9, steal: 0.02, loot: 1, threat: 0, child: true, weak: { fire: 1.5 } },
  termite: { id: 'termite', hp: 42, armor: 0, speed: 0.8, steal: 0.04, loot: 3, threat: 1.5, group: [2, 5], gnaw: { stop: 1, dps: 10 } },
  chauvesouris: { id: 'chauvesouris', hp: 14, armor: 0, speed: 1.4, steal: 0.03, loot: 2, threat: 1, group: [2, 5], flying: true },
  herisson: { id: 'herisson', hp: 44, armor: 3, speed: 0.9, steal: 0.05, loot: 4, threat: 2, group: [2, 5] },
  champiboum: {
    id: 'champiboum', hp: 18, armor: 0, speed: 1.1, steal: 0, loot: 2, threat: 1, group: [2, 5],
    explode: { dmg: 40, radius: 1, stunMerchant: 0.8 },
  },
  fantome: { id: 'fantome', hp: 26, armor: 0, speed: 0.9, steal: 0.05, loot: 4, threat: 2, group: [2, 5], ghost: true, weak: { light: 2 } },
  lutin: { id: 'lutin', hp: 30, armor: 0, speed: 1.0, steal: 0.06, loot: 4, threat: 2, group: [2, 5], teleport: { every: 4, cells: 2, warn: 0.5 } },
  gourmand: { id: 'gourmand', hp: 200, armor: 4, speed: 0.5, steal: 0.15, loot: 15, threat: 6, group: [2, 5], noKnockback: true },
  corbeau: { id: 'corbeau', hp: 20, armor: 0, speed: 1.7, steal: 0.05, loot: 3, threat: 1.5, group: [3, 3], flying: true, formation: 'V' },
  golem: { id: 'golem', hp: 360, armor: 8, speed: 0.45, steal: 0.2, loot: 25, threat: 10, group: [2, 5], metal: true, coldResist: 0.5 },
  phalene: { id: 'phalene', hp: 24, armor: 0, speed: 1.2, steal: 0.04, loot: 3, threat: 1.5, group: [2, 5], flying: true, lampDps: 6 },
  raton_dore: { id: 'raton_dore', hp: 50, armor: 0, speed: 1.5, steal: 0.04, loot: 20, threat: 0, golden: true },
};

export const BOSSES = {
  roi_raton: {
    id: 'roi_raton', district: 'q1', hp: 1125, armor: 2, speed: 0.55, steal: 0.35, loot: 150, boss: true,
    noKnockback: true, fleeSpeed: 0.75, summon: { type: 'raton', count: 3, every: 4.8 },
  },
  grande_pate: {
    // M16 (D2.5) : PV 1 700 -> 1 275, vitesse 0,5 -> 0,375, vol 35 % -> 26,25 %, 4 -> 3 gloubis par scission.
    id: 'grande_pate', district: 'q2', hp: 1275, armor: 0, speed: 0.375, steal: 0.2625, loot: 250, boss: true,
    weak: { fire: 1.5 }, slowResist: 0.5, splitAt: [0.66, 0.33], splitSpawn: { type: 'gloubi', count: 3 },
  },
  dame_blanche: {
    id: 'dame_blanche', district: 'q3', hp: 1500, armor: 0, speed: 0.6, steal: 0.35, loot: 350, boss: true,
    ghost: true, weak: { light: 2 }, vanish: { every: 7, dur: 3 }, summon: { type: 'fantome', count: 2, every: 10 },
  },
  ferrailleur: {
    id: 'ferrailleur', district: 'q4', hp: 3400, armor: 10, speed: 0.4, steal: 0.4, loot: 500, boss: true,
    metal: true, noKnockback: true, noStun: true, smash: { dps: 30, radius: 1 },
  },
  reine_phalene: {
    id: 'reine_phalene', district: 'q5', hp: 4800, armor: 2, speed: 0.6, steal: 0.4, loot: 800, boss: true,
    flying: true, douse: { every: 9, radius: 2, dur: 4 }, summon: { type: 'chauvesouris', count: 4, every: 8 },
  },
};

/** @param {string} id */
export function monsterDef(id) {
  const d = MONSTERS[id] || BOSSES[id];
  if (!d) throw new Error(`Grignotin inconnu : ${id}`);
  return d;
}

/** Types « volants » (colonne Air des meubles, G9.2). */
export const isAirborne = (def) => !!(def.flying || def.ghost);

/** Types visibles au bestiaire (hors enfants). */
export const BESTIARY_IDS = Object.keys(MONSTERS).filter((id) => !MONSTERS[id].child);
