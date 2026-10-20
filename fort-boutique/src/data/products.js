// Fort Boutique — produits (G7.5) : prix de base et meuble producteur. Icônes de 3 couleurs au plus (G20.4).
export const PRODUCTS = {
  pomme: { id: 'pomme', district: 'q1', price: 4, source: 'cagette', colors: ['#FF4F5E', '#46D39A', '#8A4A26'] },
  lait: { id: 'lait', district: 'q1', price: 7, source: 'frigo', colors: ['#FFFFFF', '#7FD8FF', '#4D96FF'] },
  confiture: { id: 'confiture', district: 'q1', price: 12, source: 'chaudron', colors: ['#9B5DE5', '#FFFDF6', '#FF4F5E'] },
  baguette: { id: 'baguette', district: 'q2', price: 14, source: 'four', colors: ['#F2C26B', '#E59E1B', '#8A4A26'] },
  croissant: { id: 'croissant', district: 'q2', price: 20, source: 'petrin', colors: ['#FFB547', '#E59E1B', '#FFF6C8'] },
  gateau: { id: 'gateau', district: 'q2', price: 45, source: 'vitrine', colors: ['#FF8FB1', '#FFFDF6', '#FF4F5E'] },
  pastilles: { id: 'pastilles', district: 'q3', price: 18, source: 'pilulier', colors: ['#7FD8FF', '#FF8FB1', '#FFFFFF'] },
  tisane: { id: 'tisane', district: 'q3', price: 30, source: 'herbier', colors: ['#46D39A', '#FFFDF6', '#2E4B44'] },
  potion: { id: 'potion', district: 'q3', price: 60, source: 'alambic', colors: ['#9B5DE5', '#C8FF2E', '#BDEBFF'] },
  clous: { id: 'clous', district: 'q4', price: 40, source: 'etabli', colors: ['#BDC6CF', '#6B7785', '#B86B3C'] },
  peinture: { id: 'peinture', district: 'q4', price: 55, source: 'peinture', colors: ['#4D96FF', '#BDC6CF', '#FF4F5E'] },
  marteau: { id: 'marteau', district: 'q4', price: 80, source: 'enclume', colors: ['#6B7785', '#B86B3C', '#BDC6CF'] },
  bonbons: { id: 'bonbons', district: 'q5', price: 60, source: 'bonbons', colors: ['#FF8FB1', '#FFE066', '#2EC4B6'] },
  cristal: { id: 'cristal', district: 'q5', price: 140, source: 'cristal', colors: ['#BDEBFF', '#9B5DE5', '#FFFFFF'] },
  grimoire: { id: 'grimoire', district: 'q5', price: 220, source: 'pupitre', colors: ['#9B5DE5', '#FFD23F', '#2B1A33'] },
};

export const PRODUCT_IDS = Object.keys(PRODUCTS);
