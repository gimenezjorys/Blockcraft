// Fort Boutique — indices des 10 premières minutes (G19) et événements du jour (G7.7).
// Aucun texte : main fantôme, flèche dorée au sol, halo qui pulse, traînée rouge vers un voleur.

export const HINTS = {
  /** Un indice n'apparaît qu'après 4 s sans l'action attendue (G19, principes). */
  delayS: 4,
  /** Voleur : traînée rouge après 3 s sans réaction (G19 2:08). */
  thiefDelayS: 3,
  /** Les indices ne servent que pendant les 3 premiers cycles (les 10 minutes de G19). */
  untilCycle: 3,
  /** Distance à laquelle le marchand « réagit » à un voleur (cases). */
  thiefReactRange: 1.6,
  /** Tap sur l'étiquette d'objectif : la flèche vers l'endroit reste affichée ce temps (s). */
  forcedArrowS: 3,
  /** Longueur maximale de la flèche dorée au sol (cases). */
  arrowCells: 6,
  /** Matin : OUVRIR pulse après ce délai sans aucun tap, pendant la période des indices (s). */
  morningPulseS: 8,
};

/** Rush (G7.7) : dès le jour 2, une fois par jour entre 35 % et 70 % de la journée. */
export const RUSH = {
  fromDay: 2,
  window: [0.35, 0.7],
  customers: 5,
  spreadS: 4,
  tipMult: 1.5,
  tipS: 20,
};

/** Commande spéciale (G7.7) : dès le jour 3, une par jour au plus. */
export const SPECIAL_ORDER = {
  fromDay: 3,
  /** Moment d'arrivée (part de la journée). */
  window: [0.2, 0.45],
  count: [4, 6],
  deliverS: 50,
  /** Récompense : +30 % de la valeur des articles, plus un coffre en bois à l'aube. */
  bonus: 0.3,
  chest: 'wood',
  /** Remise des articles au client (par seconde) et distance (cases). */
  giveRate: 8,
  giveRange: 1.0,
};

/** Flèche d'objectif (v1.1, V2.1). */
export const GUIDE = {
  /** Fois qu'il faut faire chaque action de base (prendre, poser, encaisser, payer un emplacement) avant le mode discret. */
  masteryCount: 3,
  /** Recalcul de la cible (s) et stabilité minimale (s). */
  scanS: 0.25,
  holdS: 1.5,
  /** Flèche après ce temps sans action utile (s). */
  idleS: 4,
  /** Nouvel emplacement payable : flèche pendant (s). */
  newPadS: 3,
  /** Étagère « presque vide » (part de la capacité). */
  lowShelf: 0.25,
  /** Tas de pièces à montrer (pièces). */
  pileMin: 20,
  /** File d'attente qui fait apparaître la flèche (clients). */
  queueAlert: 3,
};
