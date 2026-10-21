// Fort Boutique — coffres (G12.7). Pièces × m_Q, plans × p_Q.
export const CHESTS = {
  wood: { id: 'wood', coins: [25, 45], plans: 6, types: 2, kibble: 0, rubies: 0, rareChance: 0 },
  silver: { id: 'silver', coins: [70, 120], plans: 14, types: 3, kibble: 2, rubies: 0, rareChance: 0.1 },
  gold: { id: 'gold', coins: [180, 300], plans: 30, types: 4, kibble: 5, rubies: 2, rareChance: 0.25 },
  moon: { id: 'moon', coins: [600, 600], plans: 70, types: 5, kibble: 10, rubies: 10, rareChance: 1, cosmetic: true },
  welcome: { id: 'welcome', coins: [150, 150], plans: 14, types: 3, kibble: 2, rubies: 5, rareChance: 0.1 },
};

/** Ordre des rangs (le Raton doré fait monter le coffre d'un rang, G8.8). */
export const CHEST_RANKS = ['wood', 'silver', 'gold'];

/** Coffre selon les étoiles (G8.5). */
export const CHEST_BY_STARS = { 1: 'wood', 2: 'silver', 3: 'gold' };

/** Premier coffre du jeu : contenu fixe qui garantit la première amélioration (G12.7). */
export const FIRST_CHEST = { coins: 30, plans: [['etagere', 4], ['cagette', 2]] };

/** Tirage des plans (G12.7). */
export const PLAN_DRAW = { ownedChance: 0.7, needWeight: 1.5, rareShare: 1 / 3 };

/** Taps pour ouvrir un coffre (G12.7). */
export const CHEST_TAPS = 3;
