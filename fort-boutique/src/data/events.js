// Fort Boutique — Défi du jour (G13.3), événements de la semaine (G13.5) et saisons (G13.6).

/** Défi du jour : même graine pour tout le monde (jour UTC). */
export const DAILY = {
  expansion: 1,
  furnitureMin: 8,
  furnitureMax: 10,
  furnitureLevel: 5,
  waves: 5,
  /** Budget de menace des vagues : budget × (0,7 + 0,15 (i − 1)) ; PV × hpMult. Réglés par la simulation (D2.4.8). */
  budget: 24,
  hpMult: 1.5,
  /** Nuit jouée (6, semaine 1 : toutes les entrées ouvertes, sans Pleine Lune) et valeur du Bocal. */
  night: 6,
  jar: 300,
  /** Score (G13.3). */
  score: { jar: 1000, thief: 25, noBroken: 100, cleanWave: 50 },
  /** Récompenses de la première tentative du jour. */
  rewards: { low: { rubies: 3, chest: 'wood' }, high: { rubies: 5, chest: 'silver' } },
  /** Rivaux simulés du jour (G13.3) : loi normale bornée, tirée de la graine du jour. */
  rivals: { count: 20, mean: 900, sd: 150, min: 300, max: 1400 },
};

/** Événements de la semaine, dans l'ordre de `utcWeek mod 6`. */
export const WEEKLY_EVENTS = [
  { id: 'gloubis', weightMult: { gloubi: 2 }, lootType: { gloubi: 1.5 }, goal: { kind: 'kill', type: 'gloubi', n: 150 }, reward: 'evt_cat_gloubi' },
  { id: 'market', cheapMult: 1.5, goal: { kind: 'sellCheap', n: 300 }, reward: 'evt_apron_apple' },
  { id: 'windy', speedMult: 1.15, lootMult: 1.3, goal: { kind: 'nights2', n: 10 }, reward: 'evt_coins_leaves' },
  { id: 'lanterns', weightMult: { fantome: 2 }, lantern: true, goal: { kind: 'kill', type: 'fantome', n: 100 }, reward: 'evt_lantern_paper' },
  { id: 'mamie', xpMult: 1.25, sundayChest: 'silver', goal: { kind: 'order', n: 20 }, reward: 'evt_apron_mamie' },
  { id: 'ratons', weightMult: { raton: 2 }, goldenChance: 0.2, goal: { kind: 'kill', type: 'raton', n: 300 }, reward: 'evt_crown_raton' },
];

/** Récompense déjà obtenue : 20 rubis à la place. */
export const EVENT_DUPLICATE_RUBIES = 20;

/** Saisons (date UTC, bornes incluses) : [mois, jour]. Pendant une saison : XP +10 %. */
export const SEASONS = [
  { id: 'halloween', from: [10, 15], to: [11, 5], cosmetics: ['pumpkin_hat', 'cat_pumpkin', 'halloween'] },
  { id: 'winter', from: [12, 1], to: [12, 31], cosmetics: ['wool_beanie', 'cat_scarf', 'hiver'] },
  { id: 'spring', from: [3, 20], to: [4, 10], cosmetics: ['flower_crown', 'theme_spring'] },
  { id: 'summer', from: [7, 1], to: [7, 31], cosmetics: ['sun_hat', 'theme_summer'] },
];
export const SEASON_XP = 0.1;
