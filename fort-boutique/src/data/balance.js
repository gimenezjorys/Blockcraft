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
  /** M20 (DECISIONS.md) : au-delà du niveau `dmgHighFrom`, chaque niveau multiplie les dégâts par `dmgMultHigh`. */
  dmgHighFrom: 5,
  dmgMultHigh: 1.2, // M20 : +20 % par niveau au-delà du niveau 5 (valeur de G9.1 avant M10)
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
  hp: { q1: 1.0, q2: 1.5, q3: 2.7, q4: 4.25, q5: 6.5 }, // M16-M18 (D2.5) : Q2 2,0 -> 1,5 ; Q3 3,6 -> 2,7 ; M20 (courbe justifiée) : Q4 6,2 -> 4,25 ; Q5 10 -> 6,5
  /** Multiplicateur de budget de menace par quartier (G8.3). */
  threat: { q1: 1.0, q2: 0.8625, q3: 0.975, q4: 1.0875, q5: 1.2 }, // M16-M19 (D2.5) : Q2 1,15 -> 0,8625 ; Q3 1,3 -> 0,975 ; Q4 1,45 -> 1,0875 ; Q5 1,6 -> 1,2
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
  /** Client de la Commande spéciale (G7.7, parchemin) : n'entre que par data/tutorial.js (SPECIAL_ORDER). */
  order: { patience: 50, basket: 1, tip: 0, payMult: 1 },
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
  /** Aucune pub pendant les 10 premières minutes de jeu (G18.3). */
  quietPlaytimeMs: 10 * 60 * 1000,
  /** Placements récompensés (G18.1) : plafond et période (night = par nuit, day = par jour UTC, week, return = par retour). */
  rewarded: {
    rw_double_night: { cap: 1, per: 'night' },
    rw_bonus_chest: { cap: 3, per: 'day' },
    rw_morning_delivery: { cap: 1, per: 'return' },
    rw_daily_rubies: { cap: 1, per: 'day', rubies: 3 },
    rw_quest_reroll: { cap: 1, per: 'day' },
    rw_streak_restore: { cap: 1, per: 'week' },
    // M15 (D2.5) : +25 % -> +18,75 % de dégâts pour la revanche, pour tenir D2.4.7 (1,25 × au lieu de 1,43 ×).
    rw_boss_retry: { cap: 2, per: 'day', dmgBonus: 0.1875 },
  },
  /** Plafond global : 12 pubs récompensées par jour UTC. */
  rewardedPerDay: 12,
  /** Interstitielle it_dawn (G18.2). */
  interstitial: { minLevel: 5, minPlaytimeMs: 15 * 60 * 1000, minCycles: 3, minGapMs: 4 * 60 * 1000, quietAfterRewardedMs: 3 * 60 * 1000, perDay: 6 },
  /** Délais maximum avant un échec propre (B10). */
  rewardedTimeoutMs: 45000,
  interstitialTimeoutMs: 20000,
  /** Adaptateur « sim » : écran de 3 s. */
  simDurationS: 3,
};

/** Hors ligne et retour (G16). */
export const OFFLINE = { minAbsenceMin: 15, capHours: 8, staffShare: 0.2, welcomeDays: 3 };

/** Nuit sans fin (G13.2, niveau 16). */
export const ENDLESS = { budgetBase: 6, budgetGrowth: 1.12, hpGrowth: 1.08, jar: 1000, chestEvery: 5, chestsPerDay: 3, rivals: 15 };

/** Franchise de quartier (G13.4, niveau 16) : Lune rouge, étoiles (5 au plus), +10 % de ventes et de butin par étoile. */
export const FRANCHISE = { maxStars: 5, redMoonBase: 1.5, redMoonPerStar: 0.5, salesPerStar: 0.1, lootPerStar: 0.1 };
