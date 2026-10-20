// Fort Boutique — valeurs d'équilibrage générales. Toute la logique lit ses nombres ici (A6).
// Les réglages faits par les simulations (D2.5) sont signalés « réglé » et justifiés dans DECISIONS.md.

export const GRID = {
  /** Taille d'une case en pixels logiques (G6.1). */
  cellPx: 48,
  /** Ordonnée du mur du haut (G6.1). */
  topPx: 80,
  /** Tailles E0 à E3 (colonnes × lignes). */
  sizes: [[5, 6], [6, 7], [7, 8], [7, 9]],
};

export const PLAYER = {
  radius: 0.32,
  speed: 3.0,
  speedPerShoes: 0.15,
  /** Prise et dépose par proximité (G7.6). */
  pickupRange: 1.0,
  dropRange: 1.0,
  pickupRate: 6,
  dropRate: 8,
  stackBase: 4,
  stackPerLevel: 1,
  stackMax: 14,
  /** Distance de ramassage des tas de pièces (G7.4). */
  coinPickupRange: 0.8,
  /** Distance d'encaissement (G7.3). */
  cashRange: 1.3,
};

export const DAY = {
  /** Durée des journées : jour 1, jour 2, puis (G5.1). */
  durations: [90, 120, 150],
  clockBonusS: 10,
  closingS: 6,
  duskS: 4,
};

export const CUSTOMERS = {
  baseInterval: { q1: 4.2, q2: 3.9, q3: 3.6, q4: 3.3, q5: 3.0 },
  dayFactor: 0.95,
  weekFactor: 0.97,
  minInterval: 1.6,
  attractK: 0.015,
  maxBase: 3,
  cellsPerExtra: 8,
  /** Vitesse de marche (cases/s) — non fixée par G7 : choix DECISIONS.md. */
  speed: 1.8,
  /** Temps pour prendre un article sur l'étagère (s). */
  takeTime: 0.35,
  basket: [[1, 0.55], [2, 0.35], [3, 0.1]],
  /** Pourboire si servi moins de 3 s après l'arrivée en caisse. */
  tipWindowS: 3,
  tip: 0.1,
  tipHurried: 0.5,
  /** Encaissement (G7.4). */
  cashTime: 0.6,
  cashTimePerLevel: 0.04,
  cashTimeMin: 0.25,
  /** Premier client du tout premier jour : quand une étagère a un article, au plus tard après 10 s. */
  firstCustomerMaxWaitS: 10,
};

export const RECIPES = {
  maxLevel: 5,
  bonusPerLevel: 0.15,
  /** Coût = prix de base × ce facteur pour passer aux niveaux 2, 3, 4, 5 (G7.5). */
  costFactors: [25, 60, 140, 320],
  unlockLevel: 5,
};

export const PADS = {
  /** Durée de remplissage d'un emplacement : prix ÷ 40 s, entre 1,0 et 2,5 s (DECISIONS.md). */
  pricePerSecond: 40,
  minFillS: 1.0,
  maxFillS: 2.5,
  /** Pièces visibles qui volent dans le carré (G20.6). */
  visualCoinsPerS: 6,
};

export const ECONOMY = {
  /** Prix du catalogue × 1,6^(exemplaires possédés) (G9.1). */
  copyPriceFactor: 1.6,
  rareCoinFactor: 1.5,
  rarePlanDropDivisor: 3,
  upgradePlans: [2, 4, 8, 14, 24, 40, 64, 100, 150],
  upgradeCoins: [30, 80, 200, 500, 1200, 2800, 6000, 12000, 24000],
  maxFurnitureLevel: 10,
};

/** Gains par niveau de meuble (G9.1). */
export const FURNITURE_LEVEL = {
  dmgMult: 1.12, // M10 : 1,20 -> 1,12 (D2.5)
  rateAdd: 0.03,
  hpMult: 1.15,
  rangeLevels: [4, 7, 10],
  rangeAdd: 0.1,
  effectAdd: 0.05,
  effectMax: 1.45,
  prodMult: 0.93,
  reserveLevels: [3, 5, 7, 9],
  cashPerLevel: 0.04,
};

export const DISTRICT_FACTORS = {
  /** Multiplicateur de PV des Grignotins par quartier (G10.2). */
  hp: { q1: 1.0, q2: 2.0, q3: 3.6, q4: 6.2, q5: 10.0 },
  /** Multiplicateur de budget de menace par quartier (G8.3). */
  threat: { q1: 1.0, q2: 1.15, q3: 1.3, q4: 1.45, q5: 1.6 },
  /** Multiplicateur d'XP par quartier (G12.3). */
  xp: { q1: 1, q2: 2, q3: 3.2, q4: 4.6, q5: 6.4 },
};

/** Numéro de quartier (1 à 5) d'un identifiant de boutique. */
export const districtNumber = (id) => Number(String(id).slice(1)) || 1;
/** m_Q = 1 + 0,75 × (Q − 1) (G12.6). */
export const mQ = (id) => 1 + 0.75 * (districtNumber(id) - 1);
/** p_Q = 1 + 0,25 × (Q − 1) (G12.7). */
export const pQ = (id) => 1 + 0.25 * (districtNumber(id) - 1);

/** Types de clients (G7.2). share = part des arrivées ; fromDay = jour de la boutique où ils apparaissent. */
export const CUSTOMER_TYPES = {
  villager: { patience: 10, basket: 0, tip: 0.1, payMult: 1 },
  hurried: { patience: 6, basket: 1, tip: 0.5, payMult: 1, share: 0.15, fromDay: 3 },
  greedy: { patience: 12, basket: 3, tip: 0.1, payMult: 1, share: 0.1, fromDay: 2 },
  vip: { patience: 7, basket: 2, tip: 0.1, payMult: 3, priciest: true, perDayQ1: 1, perDay: 2, fromDay: 2 },
};

/** Effets de jour des meubles sur les clients (G9.3). */
export const DAY_AURAS = {
  coffeeSpeed: 0.2,
  coffeeRadius: 2,
  fanPatience: 0.15,
  fanRadius: 2,
};

/** Publicités (G18) : aucune proposition pendant les 10 premières minutes de jeu cumulé. */
export const ADS = {
  quietPlaytimeMs: 10 * 60 * 1000,
};
