// Fort Boutique — primitives de dessin partagées : formes arrondies, contour encre, ombres, cache de sprites.
import { PALETTE as P } from '../../data/palette.js';

/** Chemin de rectangle arrondi. */
export function rr(ctx, x, y, w, h, r) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + k);
  ctx.lineTo(x + w, y + h - k);
  ctx.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  ctx.lineTo(x + k, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - k);
  ctx.lineTo(x, y + k);
  ctx.quadraticCurveTo(x, y, x + k, y);
  ctx.closePath();
}

/** Remplit puis entoure d'encre (2,5 px par défaut, G20.4). */
export function fillInk(ctx, fill, lw = 2.5) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = P.encre;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Rectangle arrondi rempli et entouré. */
export function box(ctx, x, y, w, h, r, fill, lw = 2.5) {
  rr(ctx, x, y, w, h, r);
  fillInk(ctx, fill, lw);
}

/** Cercle rempli et entouré. */
export function disc(ctx, x, y, r, fill, lw = 2.5) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (lw > 0) fillInk(ctx, fill, lw);
  else {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

/** Ombre portée douce (ellipse encre à 18 %). */
export function shadow(ctx, x, y, rx, ry) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = P.encre;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Assombrit ou éclaircit une couleur hexadécimale. */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (k < 0) {
    r *= 1 + k; g *= 1 + k; b *= 1 + k;
  } else {
    r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k;
  }
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Cache de sprites pré-rendus sur canvas hors écran (B5), par clé.
 */
export class SpriteCache {
  /** @param {(w: number, h: number) => HTMLCanvasElement} makeCanvas */
  constructor(makeCanvas, scale = 2) {
    this.makeCanvas = makeCanvas;
    this.scale = scale;
    /** @type {Map<string, { c: HTMLCanvasElement, w: number, h: number, ax: number, ay: number }>} */
    this.map = new Map();
  }
  /**
   * @param {string} key
   * @param {number} w largeur logique
   * @param {number} h hauteur logique
   * @param {number} ax ancre x (logique)
   * @param {number} ay ancre y
   * @param {(ctx: CanvasRenderingContext2D) => void} draw dessine en coordonnées logiques
   */
  get(key, w, h, ax, ay, draw) {
    let s = this.map.get(key);
    if (!s) {
      const c = this.makeCanvas(Math.ceil(w * this.scale), Math.ceil(h * this.scale));
      const ctx = c.getContext('2d');
      ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      ctx.translate(ax, ay);
      draw(ctx);
      s = { c, w, h, ax, ay };
      this.map.set(key, s);
      if (this.map.size > 600) this.map.delete(this.map.keys().next().value);
    }
    return s;
  }
  /** Dessine le sprite avec son ancre en (x, y). */
  blit(ctx, s, x, y, sx = 1, sy = 1) {
    if (sx === 1 && sy === 1) {
      ctx.drawImage(s.c, x - s.ax, y - s.ay, s.w, s.h);
    } else {
      ctx.drawImage(s.c, x - s.ax * sx, y - s.ay * sy, s.w * sx, s.h * sy);
    }
  }
  clear() {
    this.map.clear();
  }
}
