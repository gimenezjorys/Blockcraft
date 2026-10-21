// Fort Boutique — icônes pour l'interface DOM : sprites du jeu dessinés dans de petits canvas, et SVG inline.
import { drawFurniture } from '../render/sprites/furniture.js';
import { drawProduct } from '../render/sprites/products.js';
import { drawMonster } from '../render/sprites/monsters.js';
import { FURNITURE } from '../data/furniture.js';
import { BOSSES } from '../data/monsters.js';

function canvasIcon(w, h, draw, cls = 'icon-canvas') {
  const c = document.createElement('canvas');
  const k = 2;
  c.width = w * k;
  c.height = h * k;
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  c.className = cls;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    draw(ctx);
  }
  return c;
}

/** Meuble (forme de jour, ou de nuit avec les yeux). */
export function furnitureIcon(id, size = 48, night = false) {
  const def = FURNITURE[id];
  const [fw, fh] = def ? def.size : [1, 1];
  const scale = size / (48 * Math.max(fw, fh));
  return canvasIcon(size, size, (ctx) => {
    ctx.translate((size - fw * 48 * scale) / 2, 8 * scale + (size - fh * 48 * scale) / 2);
    ctx.scale(scale, scale);
    drawFurniture(ctx, id, 0, 0, fw * 48, fh * 48, { night: night ? 1 : 0, eyes: night ? 1 : undefined, lookX: 0, lookY: 1, stock: 3, product: def && def.day.kind === 'shelf' ? 'pomme' : null, count: 2, cap: 4 });
  });
}

/** Produit. */
export function productIcon(id, size = 24) {
  return canvasIcon(size, size, (ctx) => {
    ctx.translate(size / 2, size / 2 + 1);
    drawProduct(ctx, id, size / 16);
  });
}

/** Grignotin (les boss, plus grands, sont réduits pour tenir dans l'icône avec leur couronne). */
export function monsterIcon(type, size = 40) {
  const k = BOSSES[type] ? 0.55 : 1;
  return canvasIcon(size, size, (ctx) => {
    ctx.translate(size / 2, size * 0.94);
    ctx.scale((size / 48) * k, (size / 48) * k);
    drawMonster(ctx, type, 0, {});
  });
}

/** Pièce, rubis, croquette, plan… (SVG). */
export const SVG = {
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#FFD23F" stroke="#2B1A33" stroke-width="2.2"/><circle cx="9" cy="9" r="2.5" fill="#FFF6C8"/></svg>',
  ruby: '<svg viewBox="0 0 24 24"><path d="M6 4h12l4 6-10 11L2 10z" fill="#FF3D6E" stroke="#2B1A33" stroke-width="2" stroke-linejoin="round"/><path d="M6 4l3 6 3-6 3 6 3-6M2 10h20" fill="none" stroke="#2B1A33" stroke-width="1.2"/></svg>',
  kibble: '<svg viewBox="0 0 24 24"><path d="M5 12a7 5 0 1 0 14 0a7 5 0 1 0-14 0" fill="#B86B3C" stroke="#2B1A33" stroke-width="2"/><circle cx="10" cy="11" r="1.4" fill="#2B1A33"/><circle cx="14" cy="13" r="1.4" fill="#2B1A33"/></svg>',
  plan: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" fill="#7FD8FF" stroke="#2B1A33" stroke-width="2"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#F2F6EE" stroke-width="1.8" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.3l1.4-7L2 9.5l7-.9z" fill="#FFD23F" stroke="#2B1A33" stroke-width="2" stroke-linejoin="round"/></svg>',
  starEmpty: '<svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.3l1.4-7L2 9.5l7-.9z" fill="rgba(43,26,51,.12)" stroke="#2B1A33" stroke-width="2" stroke-linejoin="round" stroke-dasharray="3 2"/></svg>',
  tv: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="3" fill="#2E4B44" stroke="#2B1A33" stroke-width="2"/><path d="M8 2l4 4 4-4" fill="none" stroke="#2B1A33" stroke-width="2" stroke-linecap="round"/><path d="M10 10l5 2.5-5 2.5z" fill="#F2F6EE"/></svg>',
  tvOff: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="3" fill="#2E4B44" stroke="#2B1A33" stroke-width="2"/><path d="M4 4l16 17" stroke="#FF6B6B" stroke-width="2.5" stroke-linecap="round"/></svg>',
  arrowUp: '<svg viewBox="0 0 24 24"><path d="M12 3l8 9h-5v9H9v-9H4z" fill="#46D39A" stroke="#2B1A33" stroke-width="2" stroke-linejoin="round"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z" fill="none" stroke="#2B1A33" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke="#2B1A33" stroke-width="2.4" stroke-linecap="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2.5" fill="#B8895C" stroke="#2B1A33" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#2B1A33" stroke-width="2"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M15.5 3.2A9 9 0 1 0 20.8 15 7.2 7.2 0 0 1 15.5 3.2z" fill="#FFF3B0" stroke="#2B1A33" stroke-width="2" stroke-linejoin="round"/><circle cx="9" cy="14" r="1.5" fill="#F1DE8C"/></svg>',
  rotate: '<svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.1-5" fill="none" stroke="#2B1A33" stroke-width="2.6" stroke-linecap="round"/><path d="M18.5 2.5v5h-5" fill="none" stroke="#2B1A33" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  store: '<svg viewBox="0 0 24 24"><path d="M12 3v11M7 9.5l5 5 5-5" fill="none" stroke="#2B1A33" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="17" width="16" height="4" rx="1.5" fill="#B8895C" stroke="#2B1A33" stroke-width="2"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.6.5.8 1.1.8 1.8V17h6v-.9c0-.7.2-1.3.8-1.8A6.5 6.5 0 0 0 12 2.5z" fill="#FFE066" stroke="#2B1A33" stroke-width="2" stroke-linejoin="round"/><path d="M9.5 20h5M10.5 22.5h3" stroke="#2B1A33" stroke-width="2" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#46D39A" stroke="#2B1A33" stroke-width="2"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#2B1A33" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="#DDB389" stroke="#2B1A33" stroke-width="2" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="#2B1A33" stroke-width="1.4"/></svg>',
  scroll: '<svg viewBox="0 0 24 24"><path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2z" fill="#FFF6E5" stroke="#2B1A33" stroke-width="2" stroke-linejoin="round"/><path d="M9 9h7M9 12.5h7M9 16h4" stroke="#2B1A33" stroke-width="1.8" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 48 56"><path d="M17 30V8.5a3.5 3.5 0 0 1 7 0V25l1-6.5a3.3 3.3 0 0 1 6.5 1V27l.7-4a3.2 3.2 0 0 1 6.3 1v5l.4-2.2a3 3 0 0 1 6 .8V38c0 9-6.5 15-15 15h-2c-6 0-9.5-2.5-12.5-7L8 37.5a3.4 3.4 0 0 1 5.4-4z" fill="#FFF6E5" stroke="#2B1A33" stroke-width="2.6" stroke-linejoin="round"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="#2B1A33" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/** Icône d'une fonction débloquée (cartes de déblocage, étiquette d'objectif) : la même que sur son bouton (P2, Léa). */
export function featureIconSvg(feature) {
  const map = {
    editor: SVG.rotate, quests: SVG.scroll, daily: SVG.star, calendar: SVG.check, merchantUpgrades: SVG.arrowUp,
    q2: SVG.map, q3: SVG.map, q4: SVG.map, q5: SVG.map, recipes: SVG.plan, wardrobe: SVG.ruby, achievements: SVG.star,
  };
  return map[feature] || SVG.star;
}

/**
 * Coffre en SVG (bois, argent, or, lune, bienvenue).
 * @param {string} type
 */
export function chestSvg(type) {
  const colors = {
    wood: ['#B86B3C', '#8A4A26', '#FFD23F'],
    silver: ['#BDC6CF', '#8D99A6', '#FFFFFF'],
    gold: ['#FFD23F', '#E59E1B', '#FFF6C8'],
    moon: ['#3A2E6E', '#1A1446', '#FFF3B0'],
    welcome: ['#FF8FB1', '#D9648A', '#FFF6C8'],
  }[type] || ['#B86B3C', '#8A4A26', '#FFD23F'];
  const [a, b, c] = colors;
  return `<svg class="chest-svg" viewBox="0 0 120 100" aria-hidden="true">
  <ellipse cx="60" cy="94" rx="44" ry="6" fill="#2B1A33" opacity=".2"/>
  <rect x="14" y="44" width="92" height="46" rx="8" fill="${a}" stroke="#2B1A33" stroke-width="4"/>
  <path class="chest-lid" d="M14 50 v-14 a46 22 0 0 1 92 0 v14z" fill="${b}" stroke="#2B1A33" stroke-width="4" stroke-linejoin="round"/>
  <rect x="50" y="40" width="20" height="22" rx="4" fill="${c}" stroke="#2B1A33" stroke-width="3"/>
  <rect x="14" y="58" width="92" height="7" fill="${b}" stroke="#2B1A33" stroke-width="3"/>
  ${type === 'moon' ? '<circle cx="86" cy="24" r="7" fill="#FFF3B0" stroke="#2B1A33" stroke-width="2"/>' : ''}
</svg>`;
}
