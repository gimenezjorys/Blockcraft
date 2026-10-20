// Fort Boutique — les 5 quartiers (G13.1) : produits, meubles, Grignotins, boss, entrées, calendrier d'apparition (G10.4).

export const DISTRICTS = {
  q1: {
    id: 'q1', n: 1, accent: '#FF4F5E', requiredLevel: 1, previousBoss: null, boss: 'roi_raton',
    products: ['pomme', 'lait', 'confiture'],
    furniture: ['etagere', 'comptoir', 'plante', 'cagette', 'frigo', 'chaudron'],
    // Nuit d'introduction de chaque type (semaine 1).
    intro: { raton: 1, souris: 2, gloubi: 4, termite: 5 },
    weights: { raton: 40, souris: 25, gloubi: 20, termite: 15 },
    // Nuit à partir de laquelle chaque entrée s'ouvre (semaine 1) ; semaines suivantes : toutes.
    entrances: { backdoor: 1, windowLeft: 3, windowRight: 5 },
    dark: false,
    // Emplacements d'achat de l'Épicerie (G6.7), prix « tutoriel ».
    pads: [
      { id: 'P1', furniture: 'etagere', x: 4, y: 2, price: 40, when: { firstSale: true } },
      { id: 'P2', furniture: 'cagette', x: 0, y: 2, price: 60, when: { after: 'P1' } },
      { id: 'P3', furniture: 'frigo', x: 4, y: 0, price: 150, when: { minDay: 2, minLevel: 2 } },
      { id: 'P4', furniture: 'etagere', x: 4, y: 3, price: 80, when: { after: 'P3' } },
      { id: 'P5', furniture: 'plante', x: 2, y: 2, price: 90, when: { minDay: 3, minLevel: 3 } },
      { id: 'P6', furniture: 'comptoir', x: 2, y: 1, price: 20, when: { after: 'P5' } },
    ],
  },
  q2: {
    id: 'q2', n: 2, accent: '#FF9F43', requiredLevel: 7, previousBoss: 'q1', boss: 'grande_pate',
    products: ['baguette', 'croissant', 'gateau'],
    furniture: ['four', 'petrin', 'vitrine', 'cafe'],
    intro: { raton: 0, souris: 0, gloubi: 0, chauvesouris: 1, herisson: 2, champiboum: 4 },
    weights: { raton: 15, souris: 15, chauvesouris: 20, herisson: 20, champiboum: 15, gloubi: 15 },
    entrances: { backdoor: 1, windowLeft: 1, windowRight: 1, chimney: 1 },
    dark: false,
  },
  q3: {
    id: 'q3', n: 3, accent: '#9B5DE5', requiredLevel: 12, previousBoss: 'q2', boss: 'dame_blanche',
    products: ['pastilles', 'tisane', 'potion'],
    furniture: ['lanterne', 'herbier', 'pilulier', 'alambic'],
    intro: { chauvesouris: 0, herisson: 0, termite: 0, fantome: 1, lutin: 3, gourmand: 5 },
    weights: { fantome: 25, lutin: 20, gourmand: 10, chauvesouris: 15, herisson: 15, termite: 15 },
    entrances: { backdoor: 1, windowLeft: 1, windowRight: 1, chimney: 1, trapdoor: 2 },
    dark: true,
  },
  q4: {
    id: 'q4', n: 4, accent: '#4D96FF', requiredLevel: 18, previousBoss: 'q3', boss: 'ferrailleur',
    products: ['clous', 'peinture', 'marteau'],
    furniture: ['etabli', 'enclume', 'peinture', 'ventilo', 'aimant'],
    intro: { gourmand: 0, herisson: 0, champiboum: 0, lutin: 0, corbeau: 1, golem: 3 },
    weights: { corbeau: 20, golem: 10, gourmand: 15, herisson: 20, champiboum: 15, lutin: 20 },
    entrances: { backdoor: 1, windowLeft: 1, windowRight: 1, chimney: 1, trapdoor: 1 },
    dark: false,
  },
  q5: {
    id: 'q5', n: 5, accent: '#2EC4B6', requiredLevel: 24, previousBoss: 'q4', boss: 'reine_phalene',
    products: ['bonbons', 'cristal', 'grimoire'],
    furniture: ['bonbons', 'cristal', 'pupitre', 'horloge'],
    intro: { corbeau: 0, fantome: 0, golem: 0, lutin: 0, gloubi: 0, champiboum: 0, phalene: 1 },
    weights: { phalene: 25, corbeau: 15, fantome: 15, golem: 10, lutin: 15, gloubi: 10, champiboum: 10 },
    entrances: { backdoor: 1, windowLeft: 1, windowRight: 1, chimney: 1, trapdoor: 1 },
    dark: false,
  },
};

export const DISTRICT_IDS = Object.keys(DISTRICTS);

/** @param {string} id */
export function districtDef(id) {
  return DISTRICTS[id] || DISTRICTS.q1;
}

/** Entrées des Grignotins : case et type (sol / volants). Calculé depuis la taille de la grille (G6.2). */
export function entranceCell(kind, w, h) {
  switch (kind) {
    case 'backdoor': return { x: 1, y: 0, ground: true, air: true };
    case 'windowLeft': return { x: 0, y: h - 3, ground: true, air: true };
    case 'windowRight': return { x: w - 1, y: 1, ground: true, air: true };
    case 'chimney': return { x: w - 2, y: 0, ground: false, air: true, overhead: true };
    case 'trapdoor': return { x: 2, y: h - 4, ground: true, air: false, inside: true };
    default: return null;
  }
}
