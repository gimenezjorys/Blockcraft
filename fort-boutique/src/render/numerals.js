// Fort Boutique — lettrage « sticker » sur canvas (G20.3). Les chiffres-tampons pré-rendus arrivent en M21.
import { PALETTE as P } from '../data/palette.js';

const FONT = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif';

/**
 * Texte « sticker » : remplissage + contour encre + ombre décalée de 3 px vers le bas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x centre
 * @param {number} y ligne médiane
 * @param {number} size px
 * @param {string} [fill]
 * @param {'center' | 'left' | 'right'} [align]
 */
export function stickerText(ctx, text, x, y, size, fill = P.orReflet, align = 'center') {
  ctx.font = `900 ${Math.round(size)}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.28);
  ctx.strokeStyle = P.encre;
  ctx.fillStyle = P.encre;
  ctx.strokeText(text, x, y + size * 0.16);
  ctx.fillText(text, x, y + size * 0.16);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** Formate un nombre court pour le HUD (1 234 -> « 1 234 », 12 500 -> « 12,5k »). */
export function shortNumber(n) {
  const v = Math.floor(n);
  if (v < 10000) return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (v < 1e6) return `${(v / 1000).toFixed(v < 1e5 ? 1 : 0).replace('.0', '')}k`;
  return `${(v / 1e6).toFixed(1).replace('.0', '')}M`;
}
