// Fort Boutique — améliorations du marchand (G11.1), agrandissements (G12.6), Moka et personnel (G11.2, G11.3).

/** Coûts des niveaux 2, 3, 4… ; `max` = niveau maximal. */
export const MERCHANT_UPGRADES = {
  shoes: { id: 'shoes', max: 9, costs: [80, 180, 400, 850, 1700, 3300, 6500, 12000] },
  basket: { id: 'basket', max: 11, costs: [60, 140, 300, 650, 1300, 2600, 5000, 9000, 16000, 28000] },
  broom: { id: 'broom', max: 10, costs: [100, 250, 600, 1300, 2600, 5000, 9000, 16000, 30000] },
  whistle: { id: 'whistle', max: 6, costs: [300, 900, 2500, 6000, 14000] },
  bell: { id: 'bell', max: 6, costs: [400, 1200, 3000, 7000, 15000] },
};

export const MERCHANT_UPGRADE_IDS = Object.keys(MERCHANT_UPGRADES);

/** Agrandissements E1, E2, E3 : coût de base × m_Q et niveau requis (G12.6). */
export const EXPANSIONS = [
  { to: 1, base: 300, level: 5 },
  { to: 2, base: 1500, level: 9 },
  { to: 3, base: 6000, level: 14 },
];

/** Moka (G11.2). */
export const CAT = {
  unlockLevel: 5,
  followDelayS: 0.4,
  followOffset: 0.6,
  fetchEveryS: 8,
  fetchRadius: 3,
  dmg: 9,
  rate: 1,
  range: 2,
  dmgPerLevel: 1.18,
  rangeLevels: [4, 7, 10],
  rangeAdd: 0.1,
  maxLevel: 10,
  /** Croquettes pour les niveaux 2 à 10. */
  kibbleCosts: [5, 10, 20, 35, 55, 80, 110, 150, 200],
};

/** Personnel (G11.3). Les coûts sont multipliés par Q (numéro du quartier). */
export const STAFF = {
  unlockLevel: 10,
  clerk: { max: 2, carry: 3, carryPerLevel: 1, speed: 2.2, speedPerLevel: 0.2, maxLevel: 5, hire: 1500, levels: [2000, 4000, 8000, 15000] },
  cashier: { max: 1, cashTime: 0.9, cashTimePerLevel: 0.1, cashTimeMin: 0.5, maxLevel: 5, hire: 2500, levels: [3000, 6000, 12000, 24000] },
};
