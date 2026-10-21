// Fort Boutique — paramètres des vagues (G8.3, G10.4). Les poids par quartier sont dans data/districts.js.

export const WAVES = {
  /** Nombre de vagues par nuit de la semaine 1 (N1 à N7). */
  countWeek1: [2, 3, 3, 4, 4, 4, 5],
  /** Semaine 2 et suivantes : 5 vagues (N7 : 6). */
  countLater: 5,
  countLaterBoss: 6,
  /** Budget de menace : B = (5 + 2,5 (k − 1)) × (0,7 + 0,15 (i − 1)) × F_Q × (1 + 0,1 (s − 1)). */
  budgetBase: 6.25, // M10 : 5 -> 6,25 (D2.5)
  budgetPerNight: 3.125, // M10 : 2,5 -> 3,125
  budgetWaveBase: 0.7,
  budgetPerWave: 0.15,
  budgetPerWeek: 0.1,
  bossEscort: 0.5,
  /** Rythme (s). */
  telegraphS: 2.5,
  memberGapS: 0.35,
  groupGapS: 0.9,
  groupGapLateS: 0.7,
  pauseS: 3.5,
  /** Plafond de sécurité d'une nuit (s). */
  maxNightS: 240,
  /** Raton doré : une nuit sur 10. */
  goldenChance: 0.1,
  /** Première nuit du jeu, scénarisée (G19 1:49 et 2:08). */
  tutorial: [[{ type: 'raton', count: 3 }], [{ type: 'raton', count: 4, scriptedThief: true }]],
  /** Rythme de la nuit scénarisée (G19 : bulle 1:46, vague 1 1:49, vague 2 ≈ 2:08, fin ≈ 2:22, soit ≈ 36 s). */
  tutorialStartS: 3,
  tutorialMemberGapS: 2.0,
  tutorialPauseS: 5,
  /** Les ratons de cette nuit gardent les PV d'avant le réglage M10 (20 au lieu de 25) : seuls les meubles suffisent,
   *  seul le voleur scénarisé atteint la caisse (G19 « première victoire »). */
  tutorialHpMult: 0.8,
  /** Nuits d'apprentissage (Q1, semaine 1, nuits 2 et 3) : un nouveau Grignotin, puis une nouvelle entrée. Les vagues
   *  entrent plus lentement pour laisser le temps de voir (G19 : nuit 2 ≈ 60 s, 3 vagues ; avec le rythme de G8.3 elle
   *  ne durait que 28 s dans la petite boutique). Budget de menace inchangé. Dès la nuit 4 : rythme normal. */
  learning: { district: 'q1', week: 1, nights: [2, 3], memberGapS: 1.05, groupGapS: 2.7, pauseS: 6 },
};

/** Mise à l'échelle des PV (G10.2) : M_Q × (1 + 0,12 (k − 1)) × 1,35^(s − 1). */
export const SCALING = {
  hpPerNight: 0.12,
  hpPerWeek: 1.35,
  lootPerDistrict: 0.6,
  lootPerWeek: 0.1,
  thiefSpeed: 1.5, // M10 : 1,2 -> 1,5 (D2.5)
  recoverBonus: 1.1,
};

/** Étoiles (G8.5). */
export const STARS = { two: 0.7, three: 1.0 };
