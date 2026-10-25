// Fort Boutique — cosmétiques (G17, Garde-robe au niveau 6, rubis uniquement). price : rubis (0 = de base) ;
// source : event | calendar | week | moon | franchise (gagnés, jamais achetés) ; season : achetable pendant la saison.
export const COSMETIC_CATEGORIES = ['outfit', 'cat', 'theme', 'coinFx', 'eyes', 'sign'];

const c = (cat, price, extra = {}) => ({ cat, price, ...extra });

export const COSMETICS = {
  // Tenues du marchand.
  apron_stripes: c('outfit', 0),
  straw_hat: c('outfit', 30),
  overalls: c('outfit', 40),
  chef_hat: c('outfit', 50),
  wool_beanie: c('outfit', 60, { season: 'winter' }),
  pumpkin_hat: c('outfit', 80, { season: 'halloween' }),
  wizard_cape: c('outfit', 90),
  cardboard_armor: c('outfit', 120),
  moon_suit: c('outfit', 150),
  flower_crown: c('outfit', 60, { season: 'spring' }),
  sun_hat: c('outfit', 60, { season: 'summer' }),
  evt_apron_apple: c('outfit', null, { source: 'event' }),
  evt_apron_mamie: c('outfit', null, { source: 'event' }),
  evt_crown_raton: c('outfit', null, { source: 'event' }),
  cal_apron_stars: c('outfit', null, { source: 'calendar' }),
  cal_outfit_baker: c('outfit', null, { source: 'calendar' }),
  week_apron_moon: c('outfit', null, { source: 'week' }),
  week_outfit_knight: c('outfit', null, { source: 'week' }),
  // Moka.
  cat_bow: c('cat', 20),
  cat_beanie: c('cat', 40),
  cat_glasses: c('cat', 40),
  cat_scarf: c('cat', 50, { season: 'winter' }),
  cat_crown: c('cat', 60),
  cat_pumpkin: c('cat', 60, { season: 'halloween' }),
  cat_cape: c('cat', 70),
  cat_knight: c('cat', 90),
  cat_halo: c('cat', 100),
  evt_cat_gloubi: c('cat', null, { source: 'event' }),
  cal_cat_scarf: c('cat', null, { source: 'calendar' }),
  week_cat_bell: c('cat', null, { source: 'week' }),
  // Thèmes de boutique (sol + murs).
  classic: c('theme', 0),
  pastel: c('theme', 150),
  foret: c('theme', 200),
  bonbon: c('theme', 220),
  neon: c('theme', 250),
  halloween: c('theme', 200, { season: 'halloween' }),
  hiver: c('theme', 200, { season: 'winter' }),
  theme_spring: c('theme', 200, { season: 'spring' }),
  theme_summer: c('theme', 200, { season: 'summer' }),
  cal_theme_autumn: c('theme', null, { source: 'calendar' }),
  week_theme_night: c('theme', null, { source: 'week' }),
  // Effets.
  fx_trail: c('coinFx', 80),
  fx_confetti: c('coinFx', 100),
  coins_stars: c('coinFx', 120),
  coins_hearts: c('coinFx', 120),
  evt_coins_leaves: c('coinFx', null, { source: 'event' }),
  cal_coins_hearts: c('coinFx', null, { source: 'calendar' }),
  week_coins_leaves: c('coinFx', null, { source: 'week' }),
  // Yeux des meubles.
  round: c('eyes', 0),
  sleepy: c('eyes', 60),
  glasses: c('eyes', 60),
  lashes: c('eyes', 60),
  frown: c('eyes', 60),
  cal_eyes_heart: c('eyes', null, { source: 'calendar' }),
  week_eyes_star: c('eyes', null, { source: 'week' }),
  // Enseignes.
  wood: c('sign', 0),
  sign_neon: c('sign', 150),
  sign_gold: c('sign', 200),
  moon_q1: c('sign', null, { source: 'moon' }),
  moon_q2: c('sign', null, { source: 'moon' }),
  moon_q3: c('sign', null, { source: 'moon' }),
  moon_q4: c('sign', null, { source: 'moon' }),
  moon_q5: c('sign', null, { source: 'moon' }),
  cal_sign_lantern: c('sign', null, { source: 'calendar' }),
  cal_sign_neon: c('sign', null, { source: 'calendar' }),
  week_sign_flowers: c('sign', null, { source: 'week' }),
  week_sign_candy: c('sign', null, { source: 'week' }),
  evt_lantern_paper: c('sign', null, { source: 'event' }),
};

/** Objets portés au départ (de base). */
export const BASE_COSMETICS = Object.keys(COSMETICS).filter((id) => COSMETICS[id].price === 0);
