// Fort Boutique — meubles : vue de dessus légèrement oblique (dessus + face avant de 12 px, G20.4),
// formes de jour et de nuit (yeux qui suivent la cible, arme sortie).
import { PALETTE as P } from '../../data/palette.js';
import { PRODUCTS } from '../../data/products.js';
import { rr, fillInk, box, disc, shadow, shade } from './draw.js';
import { drawProduct } from './products.js';

const FRONT = 12;

/** Couleurs de base (dessus, face) de chaque meuble. */
const LOOK = {
  etagere: [P.bois, P.boisFonce],
  caisse: [P.boisFonce, '#6A3519'],
  comptoir: [P.kraft, P.kraftOmbre],
  plante: ['#FF8FB1', '#D9648A'],
  cagette: ['#D9925A', P.bois],
  frigo: ['#F4FBFF', '#BFD9E6'],
  chaudron: ['#4A3B55', P.encre],
  four: ['#C9733F', '#8A4A26'],
  petrin: ['#E8D3B0', '#BFA27C'],
  vitrine: ['#F4FBFF', '#FF8FB1'],
  cafe: ['#6B4A3A', '#4A3328'],
  lanterne: [P.or, P.orOmbre],
  herbier: ['#46D39A', '#2BA877'],
  pilulier: ['#FFFDF6', '#7FD8FF'],
  alambic: ['#BDEBFF', '#9B5DE5'],
  etabli: ['#B86B3C', '#6B7785'],
  enclume: ['#6B7785', '#454E59'],
  peinture: ['#4D96FF', '#2F6ACB'],
  ventilo: ['#BDEBFF', '#6B7785'],
  aimant: ['#FF4F5E', '#6B7785'],
  bonbons: ['#FF8FB1', '#2EC4B6'],
  cristal: ['#9B5DE5', '#6A3FA8'],
  pupitre: ['#8A4A26', '#5A2E15'],
  horloge: ['#8A4A26', P.or],
};

/**
 * Corps de meuble générique : dessus + face avant, contour encre, coins arrondis.
 * (x, y) = coin haut-gauche de l'empreinte en pixels ; w, h en pixels.
 */
function body(ctx, x, y, w, h, top, front, r = 8) {
  shadow(ctx, x + w / 2, y + h - 2, w / 2 - 2, 6);
  rr(ctx, x + 4, y - 4, w - 8, h - 6, r);
  fillInk(ctx, front);
  rr(ctx, x + 4, y - 4, w - 8, h - 6 - FRONT, r);
  fillInk(ctx, top);
  // Reflet discret sur le dessus.
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  rr(ctx, x + 9, y, w - 18, 5, 2.5);
  ctx.fill();
}

/** Yeux de nuit : deux ovales blancs, pupilles qui suivent la cible (G20.4). */
/** Détails des yeux de la Garde-robe : paupières, lunettes, cils, sourcils. */
function eyeExtra(ctx, x, cy, s, size, style) {
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (style === 'sleepy') {
    ctx.moveTo(x - 5 * size, cy - 1 * size);
    ctx.lineTo(x + 5 * size, cy - 1 * size);
  } else if (style === 'glasses') {
    ctx.arc(x, cy, 6.5 * size, 0, Math.PI * 2);
  } else if (style === 'lashes') {
    for (const k of [-3, 0, 3]) {
      ctx.moveTo(x + k * size, cy - 6 * size);
      ctx.lineTo(x + k * 1.3 * size, cy - 8.5 * size);
    }
  } else if (style === 'frown') {
    ctx.moveTo(x - 5 * size * s, cy - 9 * size);
    ctx.lineTo(x + 4 * size * s, cy - 6.5 * size);
  }
  ctx.stroke();
}

export function drawEyes(ctx, cx, cy, open, lookX, lookY, broken, size = 1, style = 'round') {
  if (open <= 0.02 && !broken) return;
  const ex = 7 * size;
  for (const s of [-1, 1]) {
    const x = cx + s * ex;
    if (broken) {
      // Yeux fermés en spirale.
      ctx.strokeStyle = P.encre;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.4) {
        const rad = (a / (Math.PI * 4)) * 4.5 * size;
        const px = x + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      continue;
    }
    ctx.beginPath();
    ctx.ellipse(x, cy, 5.2 * size, 6.2 * size * open, 0, 0, Math.PI * 2);
    fillInk(ctx, P.blanc, 1.8);
    if (open > 0.4) {
      const l = Math.hypot(lookX, lookY) || 1;
      const px = x + (lookX / l) * 1.8 * size;
      const py = cy + (lookY / l) * 2.2 * size * open;
      const pupil = style === 'cal_eyes_heart' ? '#FF4F6E' : style === 'week_eyes_star' ? '#FFB000' : P.encre;
      disc(ctx, px, py, 2.6 * size, pupil, 0);
      disc(ctx, px + 0.9 * size, py - 1 * size, 0.9 * size, P.blanc, 0);
    }
    if (open > 0.4 && style && style !== 'round') eyeExtra(ctx, x, cy, s, size, style);
  }
  if (open > 0.4 && style === 'glasses') {
    ctx.strokeStyle = P.encre;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 2 * size, cy);
    ctx.lineTo(cx + 2 * size, cy);
    ctx.stroke();
  }
}

function stockDots(ctx, x, y, w, product, count, cap, perRow) {
  if (!product || count <= 0) return;
  const n = Math.min(count, cap);
  for (let i = 0; i < n; i++) {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    ctx.save();
    ctx.translate(x + 9 + col * ((w - 18) / Math.max(1, perRow - 1)), y + row * 11);
    drawProduct(ctx, product, 0.62);
    ctx.restore();
  }
}

/**
 * Dessine un meuble.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} id
 * @param {number} x pixels (coin haut-gauche de l'empreinte)
 * @param {number} y
 * @param {number} w pixels
 * @param {number} h
 * @param {{ night?: number, product?: string|null, count?: number, cap?: number, stock?: number, reserve?: number,
 *   eyes?: number, lookX?: number, lookY?: number, broken?: boolean, rot?: number, jar?: number }} [o]
 */
export function drawFurniture(ctx, id, x, y, w, h, o = {}) {
  const [top, front] = LOOK[id] || [P.bois, P.boisFonce];
  const night = o.night || 0;
  const cx = x + w / 2;
  ctx.save();
  if (o.broken) ctx.globalAlpha = 0.85;
  switch (id) {
    case 'etagere': {
      body(ctx, x, y, w, h, top, front, 6);
      // Deux planches.
      ctx.fillStyle = shade(top, -0.25);
      ctx.fillRect(x + 8, y + 10, w - 16, 2.5);
      ctx.fillRect(x + 8, y + 21, w - 16, 2.5);
      stockDots(ctx, x, y + 6, w, o.product, o.count || 0, o.cap || 4, Math.ceil((o.cap || 4) / 2));
      if (night > 0.5) {
        // Canon de conserve.
        box(ctx, cx - 5, y - 14, 10, 12, 3, '#BDC6CF', 2);
      }
      break;
    }
    case 'caisse': {
      body(ctx, x, y, w, h, top, front, 6);
      box(ctx, x + 9, y - 2, w - 18, 16, 4, P.or, 2);
      ctx.fillStyle = P.encre;
      ctx.fillRect(x + 13, y + 2, w - 26, 4);
      // Le Bocal de Mamie.
      const jar = o.jar === undefined ? 1 : o.jar;
      rr(ctx, x + w - 19, y + 8, 12, 15, 4);
      fillInk(ctx, 'rgba(189,235,255,.85)', 2);
      if (jar > 0) {
        ctx.fillStyle = P.or;
        const fh = 11 * Math.min(1, jar);
        rr(ctx, x + w - 17, y + 21 - fh, 8, fh, 2);
        ctx.fill();
      }
      if (night > 0.5) box(ctx, x + 6, y - 10, 9, 9, 3, P.orOmbre, 2);
      break;
    }
    case 'comptoir': {
      body(ctx, x, y, w, h, top, front, 7);
      ctx.strokeStyle = P.kraftOmbre;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 14);
      ctx.lineTo(x + w - 10, y + 14);
      ctx.stroke();
      break;
    }
    case 'plante': {
      shadow(ctx, cx, y + h - 2, 15, 5);
      box(ctx, cx - 12, y + 16, 24, 20, 6, top, 2.5);
      ctx.fillStyle = front;
      ctx.fillRect(cx - 10, y + 30, 20, 4);
      const leaf = night > 0.5 ? '#2BA877' : '#46D39A';
      for (const [lx, ly, a] of [[-9, 6, -0.6], [9, 6, 0.6], [0, 0, 0]]) {
        ctx.save();
        ctx.translate(cx + lx, y + ly);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 12, 0, 0, Math.PI * 2);
        fillInk(ctx, leaf, 2);
        ctx.restore();
      }
      if (night > 0.5) {
        // Gueule de la plante carnivore.
        ctx.beginPath();
        ctx.ellipse(cx, y - 6, 11, 8, 0, 0, Math.PI * 2);
        fillInk(ctx, P.pomme, 2);
        ctx.fillStyle = P.blanc;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * 4 - 1.5, y - 6);
          ctx.lineTo(cx + i * 4, y - 2);
          ctx.lineTo(cx + i * 4 + 1.5, y - 6);
          ctx.fill();
        }
      }
      break;
    }
    case 'cagette': {
      body(ctx, x, y, w, h, top, front, 5);
      ctx.strokeStyle = shade(front, -0.25);
      ctx.lineWidth = 2;
      for (const yy of [y + 6, y + 14, y + 22]) {
        ctx.beginPath();
        ctx.moveTo(x + 8, yy);
        ctx.lineTo(x + w - 8, yy);
        ctx.stroke();
      }
      const n = Math.min(6, o.stock || 0);
      for (let i = 0; i < n; i++) {
        ctx.save();
        ctx.translate(x + 13 + (i % 3) * 11, y + 6 + Math.floor(i / 3) * 10);
        drawProduct(ctx, 'pomme', 0.72);
        ctx.restore();
      }
      break;
    }
    case 'frigo': {
      body(ctx, x, y, w, h, top, front, 7);
      ctx.fillStyle = shade(top, -0.12);
      ctx.fillRect(x + 8, y + 12, w - 16, 2);
      box(ctx, x + w - 14, y + 2, 4, 9, 2, '#BDC6CF', 1.4);
      const n = Math.min(5, o.stock || 0);
      for (let i = 0; i < n; i++) {
        ctx.save();
        ctx.translate(x + 11 + i * 6.5, y + 21);
        drawProduct(ctx, 'lait', 0.5);
        ctx.restore();
      }
      if (night > 0.5) {
        ctx.fillStyle = 'rgba(127,216,255,.6)';
        rr(ctx, cx - 8, y + h - 12, 16, 6, 3);
        ctx.fill();
      }
      break;
    }
    case 'chaudron': {
      shadow(ctx, cx, y + h - 2, 17, 6);
      ctx.beginPath();
      ctx.ellipse(cx, y + 20, 18, 16, 0, 0, Math.PI * 2);
      fillInk(ctx, top);
      ctx.beginPath();
      ctx.ellipse(cx, y + 10, 15, 6, 0, 0, Math.PI * 2);
      fillInk(ctx, (o.stock || 0) > 0 ? '#9B5DE5' : '#3A2E45', 2);
      if (night > 0.5) {
        ctx.fillStyle = 'rgba(255,181,71,.6)';
        ctx.beginPath();
        ctx.ellipse(cx, y + 9, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default: {
      body(ctx, x, y, w, h, top, front, 7);
      const prodId = Object.keys(PRODUCTS).find((k) => PRODUCTS[k].source === id);
      if (prodId) {
        ctx.save();
        ctx.translate(cx, y + 12);
        drawProduct(ctx, prodId, 1);
        ctx.restore();
      } else {
        disc(ctx, cx, y + 12, 7, shade(top, 0.3), 2);
      }
    }
  }
  if (o.eyes !== undefined && (o.eyes > 0 || o.broken)) {
    drawEyes(ctx, cx, y + h - 14, o.eyes, o.lookX || 0, o.lookY || 1, o.broken, w > 60 ? 1.1 : 1, o.eyeStyle);
  }
  ctx.restore();
}
