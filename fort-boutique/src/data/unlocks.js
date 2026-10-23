// Fort Boutique — déblocages par niveau de marchand (G12.4). Les meubles se débloquent selon data/furniture.js.
export const FEATURE_LEVELS = {
  chests: 1,
  furnitureLevels: 1,
  calendar: 2,
  merchantUpgrades: 2,
  editor: 3,
  quests: 4,
  daily: 4,
  cat: 5,
  expansion1: 5,
  recipes: 5,
  wardrobe: 6,
  bestiary: 6,
  achievements: 6,
  q2: 7,
  weeklyQuests: 8,
  expansion2: 9,
  // v1.1 (V5) : le personnel s'embauche dans la boutique dès le jour 4 (plus de niveau requis, plus de carte).
  staff: 1,
  q3: 12,
  expansion3: 14,
  endless: 16,
  franchise: 16,
  q4: 18,
  q5: 24,
};

/** Ordre d'affichage des cartes de déblocage (au Matin suivant, 3 cartes au plus). */
export const UNLOCK_CARD_ORDER = ['q2', 'q3', 'q4', 'q5', 'editor', 'quests', 'daily', 'cat', 'calendar', 'merchantUpgrades',
  'recipes', 'expansion1', 'wardrobe', 'bestiary', 'achievements', 'weeklyQuests', 'expansion2', 'expansion3',
  'endless', 'franchise'];
