// Fort Boutique — calendrier de 7 jours (G15.1) : une réclamation par jour UTC, jours non consécutifs permis.
export const CALENDAR = [
  { day: 1, coins: 150, coinsMQ: true },
  { day: 2, chest: 'silver' },
  { day: 3, rubies: 10 },
  { day: 4, plans: 20, choice: 3 },
  { day: 5, chest: 'gold' },
  { day: 6, kibble: 10, rubies: 10 },
  { day: 7, chest: 'moon', cosmetic: true },
];

/** Cosmétiques du calendrier (rotation de 8, un par tour de calendrier). */
export const CALENDAR_COSMETICS = ['cal_apron_stars', 'cal_sign_lantern', 'cal_eyes_heart', 'cal_coins_hearts', 'cal_theme_autumn', 'cal_cat_scarf', 'cal_outfit_baker', 'cal_sign_neon'];

/** Série (G15.2). */
export const STREAK = {
  bonusPerDay: 0.02,
  bonusMax: 0.2,
  milestones: [[3, 5], [7, 15], [14, 25], [30, 50], [100, 100]],
  freezeEvery: 7,
  freezesMax: 2,
  relightHours: 48,
  relightRubies: 20,
};
