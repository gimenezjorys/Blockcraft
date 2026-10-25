// Fort Boutique — plans de boutique (v1.1, V3 et V4) : des emplacements prévus, dessinés comme dans un vrai magasin.
// Tout est en données : une carte par taille (E0 5 × 6, E1 6 × 7, E2 7 × 8, E3 7 × 9), ligne 0 = mur du fond.
// Une case = deux caractères, séparées par des espaces :
//   P1, P2…  producteur (fabrique : cagette, frigo, four, vitrine…), contre un mur ; le numéro est l'ordre de remplissage
//   E1, E2…  présentoir (étagère) : l'allée entre les producteurs et la caisse
//   D1, D2…  défense (plante, comptoir, lanterne, ventilateur…) : sur le trajet des Grignotins
//   C1       la caisse (fixe)
//   ..       case libre ; ## entrée (porte, porte de derrière, fenêtre) : toujours libre
// `trap` : variante de la carte pour les quartiers à trappe (case (2, h − 4) libre), quand la carte normale l'occupe.
// `staff` : postes du personnel (des personnages, ils ne bloquent rien) : caissier derrière la caisse, commis en réserve.
// Les meubles de 2 cases (four, vitrine, établi) prennent deux emplacements voisins du même type sur la même ligne.
// Règles de dessin : docs/PROMPT_V1_1.md, 3.2 ; vérifiées à 100 % de remplissage (validateLayout).

/** Les 3 plans, dans l'ordre de l'écran Plans. */
export const PLAN_IDS = ['allee', 'comptoir', 'forteresse'];

/** Plan par défaut ; les autres s'ouvrent au niveau 3 (comme l'ancien aménagement). */
export const DEFAULT_PLAN = 'allee';
export const PLANS_UNLOCK_LEVEL = 3;

export const SHOP_PLANS = {
  // L'Allée : équilibré (plan 3.3 du document de mission pour l'E0).
  allee: {
    sizes: [
      {
        map: [
          'P1 ## P2 P3 P4',
          '.. .. .. .. ##',
          'D1 E1 E2 E3 ..',
          '## .. .. .. ..',
          'D3 .. .. C1 D2',
          '.. .. ## .. ..',
        ],
        trap: [
          'P1 ## P2 P3 P4',
          '.. .. .. .. ##',
          'D1 E3 .. E1 E2',
          '## .. .. .. ..',
          'D3 .. .. C1 D2',
          '.. .. ## .. ..',
        ],
        staff: { cashier: [3, 5], clerk: [0, 5] },
      },
      {
        map: [
          'P1 ## P2 P3 P4 P5',
          '.. .. .. .. .. ##',
          'D1 E1 E2 E3 E4 ..',
          '.. .. .. .. .. ..',
          '## .. .. .. .. D4',
          'D2 .. .. C1 .. D3',
          '.. .. ## .. .. ..',
        ],
        staff: { cashier: [3, 6], clerk: [0, 6] },
      },
      {
        map: [
          'P1 ## P2 P3 P4 P5 P6',
          '.. .. .. .. .. .. ##',
          'D1 E1 E2 E3 .. E4 E5',
          '.. .. .. .. .. .. ..',
          'P7 .. .. .. .. .. D4',
          '## .. .. .. .. .. ..',
          'D2 .. .. C1 .. D5 D3',
          '.. .. ## .. .. .. ..',
        ],
        staff: { cashier: [3, 7], clerk: [0, 7] },
      },
      {
        map: [
          'P1 ## P2 P3 P4 P5 P6',
          '.. .. .. .. .. .. ##',
          'D1 E1 E2 E3 E4 E5 ..',
          '.. .. .. .. .. .. ..',
          'P7 .. E6 E7 E8 .. P8',
          '.. .. .. .. .. .. ..',
          '## .. .. .. .. .. D4',
          'D2 .. .. C1 .. D5 D3',
          '.. .. ## .. .. .. ..',
        ],
        staff: { cashier: [3, 8], clerk: [0, 8] },
      },
    ],
  },
  // Le Comptoir rapide : présentoirs près de la porte et de la caisse ; les Grignotins arrivent vite.
  comptoir: {
    sizes: [
      {
        map: [
          'P1 ## P2 P3 P4',
          '.. .. .. .. ##',
          '.. .. .. .. ..',
          '## .. .. .. D1',
          'D2 E2 .. C1 E3',
          '.. E1 ## .. ..',
        ],
        staff: { cashier: [3, 5], clerk: [0, 5] },
      },
      {
        map: [
          'P1 ## P2 P3 P4 P5',
          '.. .. .. .. .. ##',
          '.. .. .. .. .. ..',
          '.. .. .. .. .. D1',
          '## .. .. .. .. D2',
          'D3 E2 .. C1 E3 E4',
          '.. E1 ## .. .. ..',
        ],
        staff: { cashier: [3, 6], clerk: [0, 6] },
      },
      {
        map: [
          'P1 ## P2 P3 P4 P5 P6',
          '.. .. .. .. .. .. ##',
          'P7 .. .. .. .. .. P8',
          '.. .. .. .. .. .. D2',
          '.. .. .. .. .. .. D1',
          '## .. .. .. .. .. ..',
          'D3 E2 .. C1 E3 E4 ..',
          '.. E1 ## .. .. E5 E6',
        ],
        staff: { cashier: [3, 7], clerk: [0, 7] },
      },
      {
        map: [
          'P1 ## P2 P3 P4 P5 P6',
          '.. .. .. .. .. .. ##',
          'P7 .. .. .. .. .. P8',
          'P9 .. .. .. .. .. ..',
          '.. .. .. .. .. .. D1',
          '.. .. .. .. .. .. D2',
          '## E3 .. .. .. .. ..',
          'D3 E2 .. C1 E4 E5 ..',
          '.. E1 ## .. .. E6 E7',
        ],
        staff: { cashier: [3, 8], clerk: [0, 8] },
      },
    ],
  },
  // La Forteresse : présentoirs en chicane ; les Grignotins font un grand détour, les clients aussi.
  forteresse: {
    sizes: [
      {
        map: [
          'P1 ## P2 P3 P4',
          '.. .. .. .. ##',
          '.. .. .. .. D3',
          '## E1 E2 E3 ..',
          '.. D1 .. C1 D2',
          '.. .. ## .. ..',
        ],
        staff: { cashier: [3, 5], clerk: [0, 5] },
      },
      {
        map: [
          'P1 ## P2 P3 P4 P5',
          '.. .. .. .. .. ##',
          'E1 E2 E3 E4 .. ..',
          '.. .. .. .. .. ..',
          '## .. D1 D2 D3 D4',
          'D5 .. .. C1 .. ..',
          '.. .. ## .. .. ..',
        ],
        staff: { cashier: [3, 6], clerk: [0, 6] },
      },
      {
        map: [
          'P1 ## P2 P3 P4 P5 P6',
          '.. .. .. .. .. .. ##',
          'E1 E2 E3 E4 E5 .. ..',
          '.. .. .. .. .. .. ..',
          'P7 .. .. D1 D2 D3 D4',
          '## .. .. .. .. .. ..',
          'D5 .. .. C1 .. .. ..',
          '.. .. ## .. .. .. ..',
        ],
        staff: { cashier: [3, 7], clerk: [0, 7] },
      },
      {
        map: [
          'P1 ## P2 P3 P4 P5 P6',
          '.. .. .. .. .. .. ##',
          'E1 E2 E3 E4 E5 .. ..',
          '.. .. .. .. .. .. ..',
          'P7 .. D1 D2 D3 D4 D5',
          '.. .. .. .. .. .. ..',
          '## E6 E7 E8 E9 .. ..',
          'D6 .. .. C1 .. .. ..',
          '.. .. ## .. .. .. ..',
        ],
        staff: { cashier: [3, 8], clerk: [0, 8] },
      },
    ],
  },
};

/** Types d'emplacement. */
export const SLOT_TYPES = ['producteur', 'presentoir', 'defense', 'caisse'];
export const SLOT_CODE = { P: 'producteur', E: 'presentoir', D: 'defense', C: 'caisse' };
