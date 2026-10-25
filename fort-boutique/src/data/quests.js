// Fort Boutique — quêtes du jour et de la semaine (G14.1, G14.2). Objectif = base + parQ × Q (Q = quartier le plus
// avancé débloqué) ; « m » multiplie par m_Q. `max` : on garde le meilleur de la journée (recette d'un jour).
export const DAILY_QUESTS = [
  { id: 'serve', kind: 'serve', base: 30, perQ: 10 },
  { id: 'sell', kind: 'sell', base: 12, perQ: 4, product: true },
  { id: 'night3', kind: 'night3', base: 1 },
  { id: 'thieves', kind: 'thief', base: 2, halfQ: true },
  { id: 'kills', kind: 'kill', base: 40, perQ: 15 },
  { id: 'upgrade', kind: 'upgrade', base: 1 },
  { id: 'chests', kind: 'chest', base: 2 },
  { id: 'daily', kind: 'daily', base: 1, needs: 'dailyChallenge' },
  { id: 'takings', kind: 'takings', base: 150, mQ: true, max: true },
  { id: 'vip', kind: 'vip', base: 3, minDay: 2 },
  { id: 'order', kind: 'order', base: 1, minDay: 3 },
  { id: 'bell', kind: 'bell', base: 3 },
  { id: 'rush', kind: 'rush', base: 1, minDay: 2 },
  { id: 'loot', kind: 'loot', base: 60, mQ: true },
  { id: 'move', kind: 'move', base: 3, needs: 'editor' },
];

/** Quêtes de la semaine (niveau 8) : toutes les 5, chaque semaine UTC. */
export const WEEKLY_QUESTS = [
  { id: 'w_moon', kind: 'moon', base: 1 },
  { id: 'w_serve', kind: 'serve', base: 400 },
  { id: 'w_stars', kind: 'stars', base: 15 },
  { id: 'w_daily', kind: 'daily', base: 5 },
  { id: 'w_levels', kind: 'upgrade', base: 5 },
];

export const QUESTS = {
  perDay: 3,
  freeRerolls: 1,
  adRerolls: 1,
  /** Récompenses dans l'ordre des réclamations (G14.1). */
  rewards: [
    { coins: 80, coinsMQ: true, plans: 4 },
    { rubies: 3, kibble: 2 },
    { chest: 'silver' },
  ],
  allBonus: { rubies: 5 },
  weeklyEach: { chest: 'gold' },
  weeklyAll: { chest: 'moon', cosmetic: 'week' },
};

/** Cosmétique de la semaine (les 5 quêtes de la semaine) : rotation selon la semaine UTC. */
export const WEEKLY_COSMETICS = ['week_apron_moon', 'week_sign_flowers', 'week_eyes_star', 'week_coins_leaves', 'week_theme_night', 'week_cat_bell', 'week_outfit_knight', 'week_sign_candy'];
