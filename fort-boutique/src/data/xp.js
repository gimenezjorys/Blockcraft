// Fort Boutique — XP du niveau de marchand (G12.3).

/** XP pour passer du niveau L au niveau L+1, pour L = 1 à 29. */
const TABLE = [
  120, 150, 200, 240, 280, 320, 650, 700, 750, 800, 850,
  1150, 1200, 1250, 1300, 1350, 1400, 1700, 1750, 1800, 1850, 1900, 1950,
  2900, 3000, 3100, 3200, 3300, 3400,
];

export const MAX_LEVEL = 40;

/**
 * XP nécessaire pour passer du niveau `level` au suivant (Infinity au niveau 40).
 * @param {number} level
 */
export function xpToNext(level) {
  if (level >= MAX_LEVEL) return Infinity;
  if (level <= 29) return TABLE[level - 1];
  return 3600 + 200 * (level - 30);
}

/** Gains d'XP de base, multipliés par X_Q (G12.3). */
export const XP_GAINS = {
  itemSold: 2,
  customerServed: 1,
  nightPerStar: 15,
  boss: 100,
  dailyQuest: 40,
};

/** Bonus de ventes au-delà du niveau 30 : +2 % par niveau, jusqu'à +20 % (G12.3). */
export function highLevelSalesBonus(level) {
  return Math.min(0.2, Math.max(0, level - 30) * 0.02);
}
