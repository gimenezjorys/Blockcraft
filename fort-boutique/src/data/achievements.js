// Fort Boutique — succès (G14.3, niveau 6) et paliers du bestiaire (G14.4). Chaque succès : une mesure, un seuil,
// des rubis. Les mesures viennent des statistiques de la sauvegarde (src/game/achievements.js).
const tiers = (prefix, metric, list) => list.map(([goal, rubies]) => ({ id: `${prefix}_${goal}`, metric, goal, rubies }));

const BOSS_IDS = ['roi_raton', 'grande_pate', 'dame_blanche', 'ferrailleur', 'reine_phalene'];
const BESTIARY_TYPES = ['raton', 'souris', 'gloubi', 'termite', 'chauvesouris', 'herisson', 'champiboum', 'fantome', 'lutin', 'gourmand', 'corbeau', 'golem', 'phalene'];

export const ACHIEVEMENTS = [
  ...tiers('sold', 'sold', [[100, 5], [1000, 10], [10000, 20], [100000, 40]]),
  ...tiers('vip', 'vip', [[10, 5], [100, 15]]),
  ...tiers('nights3', 'nights3', [[1, 5], [10, 10], [50, 20], [200, 40]]),
  ...tiers('thieves', 'thieves', [[10, 5], [100, 15], [500, 30]]),
  ...BOSS_IDS.map((b) => ({ id: `boss_${b}`, metric: `boss:${b}`, goal: 1, rubies: 10 })),
  ...BOSS_IDS.map((b) => ({ id: `boss5_${b}`, metric: `boss5:${b}`, goal: 1, rubies: 20 })),
  ...tiers('furn', 'furnTypes', [[5, 5], [12, 15], [24, 40]]),
  ...tiers('furnlvl', 'furnLevel', [[5, 10], [10, 40]]),
  ...tiers('daily', 'dailyStreak', [[3, 5], [7, 15], [30, 50]]),
  ...BESTIARY_TYPES.map((m) => ({ id: `best_${m}`, metric: `kills:${m}`, goal: 100, rubies: 3 })),
  ...tiers('moka', 'mokaLevel', [[5, 10], [10, 25]]),
  ...tiers('franchise', 'franchiseStars', [[1, 10], [5, 25], [25, 60]]),
];

/** Bestiaire (G14.4) : paliers de victoires, bonus de dégâts (night.js) et rubis. */
export const BESTIARY = { tiers: [25, 250, 2500], rubies: [2, 5, 10] };
