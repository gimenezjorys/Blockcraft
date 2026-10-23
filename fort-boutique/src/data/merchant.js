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
  // v1.1 (V2.4) : visite d'un nouvel objectif (trot en cases/s, assis 2 s).
  trotSpeed: 4,
  sitS: 2,
  followDelayS: 0.4,
  followOffset: 0.6,
  fetchEveryS: 8,
  fetchRadius: 3,
  // M13 (D2.5, au-delà de la marge, justifié dans DECISIONS.md) : 9 -> 3,375 dégâts (× 0,375) et 1 -> 0,75 bond/s :
  // Moka aide sans faire passer le Fort au-dessus de 80 % de ★★★ ; × 1,18 par niveau (≈ 15 dégâts au niveau 10).
  dmg: 3.375,
  rate: 0.75,
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
  // v1.1 (V5) : plus de niveau requis : on embauche dans la boutique, par des emplacements d'embauche (HIRE_PADS).
  unlockLevel: 1,
  // 1 commis pour 2 producteurs (arrondi au-dessus), 4 au plus ; améliorations × m_Q (niveaux 2 à 5).
  clerk: { max: 4, perProducers: 2, carry: 3, carryPerLevel: 1, speed: 2.2, speedPerLevel: 0.2, maxLevel: 5, levels: [400, 900, 1800, 3600] },
  cashier: { max: 2, cashTime: 0.9, cashTimePerLevel: 0.1, cashTimeMin: 0.4, maxLevel: 5, levels: [300, 700, 1500, 3000] },
};

/**
 * Emplacements d'embauche (v1.1, V5.1), dans l'ordre : `n` = n-ième employé de ce poste ; `day` au Quartier 1,
 * `dayQ` dans les quartiers 2 à 5 (dès le jour 2) ; prix × m_Q hors du Q1. Le 2e caissier attend la boutique agrandie.
 */
export const HIRE_PADS = [
  { id: 'H1', role: 'cashier', n: 1, price: 250, day: 4, dayQ: 2 },
  { id: 'H2', role: 'clerk', n: 1, price: 350, day: 5, dayQ: 3 },
  { id: 'H3', role: 'clerk', n: 2, price: 700, day: 7, dayQ: 4 },
  { id: 'H4', role: 'cashier', n: 2, price: 1200, day: 10, dayQ: 6, minExpansion: 1 },
  { id: 'H5', role: 'clerk', n: 3, price: 1400, day: 9, dayQ: 6 },
  { id: 'H6', role: 'clerk', n: 4, price: 2800, day: 12, dayQ: 8 },
];

/** Accélérer le temps (V6) : vitesses du jour et de la nuit, déblocages. */
export const SPEED = { day: [1, 2, 3], night: [1, 2], x2Day: 2, x3Day: 4, slowFrameMs: 14, slowFrames: 20 };

/** Pilote automatique (V5.3) : retour du marchand à la caisse après 1 s sans geste ; « Passer la journée » en 1,5 s. */
export const AUTOPILOT = { idleS: 1, skipS: 1.5, dayShare: 0.5 };
