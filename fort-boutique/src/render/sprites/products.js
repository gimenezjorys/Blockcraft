// Fort Boutique — icônes des produits (3 couleurs max, G20.4), dessinées autour de (0, 0), taille ~14 px.
import { PALETTE as P } from '../../data/palette.js';
import { PRODUCTS } from '../../data/products.js';
import { rr, fillInk, disc } from './draw.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} id produit
 * @param {number} [s] échelle (1 = 14 px)
 */
export function drawProduct(ctx, id, s = 1) {
  const p = PRODUCTS[id];
  const [c1, c2, c3] = p ? p.colors : ['#cccccc', '#999999', '#666666'];
  ctx.save();
  ctx.scale(s, s);
  const lw = 1.6;
  switch (id) {
    case 'pomme':
      disc(ctx, 0, 1, 6, c1, lw);
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(1, -7);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = c3;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(3, -6, 3, 1.6, -0.5, 0, Math.PI * 2);
      fillInk(ctx, c2, 1.2);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.arc(-2.5, -1, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'lait':
      rr(ctx, -4, -4, 8, 11, 2.5);
      fillInk(ctx, c1, lw);
      rr(ctx, -2.5, -7.5, 5, 4, 1);
      fillInk(ctx, c3, lw);
      ctx.fillStyle = c2;
      ctx.fillRect(-3, 0, 6, 3);
      break;
    case 'confiture':
      rr(ctx, -5, -3, 10, 10, 3);
      fillInk(ctx, c1, lw);
      rr(ctx, -5.5, -6.5, 11, 4, 1.5);
      fillInk(ctx, c2, lw);
      ctx.fillStyle = c3;
      ctx.fillRect(-2, 1, 4, 3);
      break;
    case 'baguette':
      ctx.save();
      ctx.rotate(-0.6);
      rr(ctx, -9, -3, 18, 6, 3);
      fillInk(ctx, c1, lw);
      ctx.strokeStyle = c2;
      ctx.lineWidth = 1.4;
      for (const x of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.moveTo(x - 1.5, -2);
        ctx.lineTo(x + 1.5, 2);
        ctx.stroke();
      }
      ctx.restore();
      break;
    case 'croissant':
      ctx.beginPath();
      ctx.arc(0, 4, 8, Math.PI * 1.1, Math.PI * 1.9);
      ctx.arc(0, 4, 3, Math.PI * 1.9, Math.PI * 1.1, true);
      ctx.closePath();
      fillInk(ctx, c1, lw);
      break;
    case 'gateau':
      rr(ctx, -6, -2, 12, 8, 2);
      fillInk(ctx, c1, lw);
      rr(ctx, -6, -4, 12, 4, 2);
      fillInk(ctx, c2, lw);
      disc(ctx, 0, -6, 2, c3, 1.2);
      break;
    default: {
      // Fiole / boîte générique aux couleurs du produit.
      rr(ctx, -5, -5, 10, 11, 3);
      fillInk(ctx, c1, lw);
      ctx.fillStyle = c2;
      ctx.fillRect(-3, -1, 6, 4);
      disc(ctx, 0, -6, 2, c3, 1.2);
    }
  }
  ctx.restore();
}

/** Bulle « ? » + icône du produit voulu (client qui attend, G7.3). */
export function drawWantBubble(ctx, id, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  rr(ctx, -14, -13, 28, 22, 8);
  fillInk(ctx, P.ticket, 2);
  ctx.beginPath();
  ctx.moveTo(-3, 9);
  ctx.lineTo(0, 14);
  ctx.lineTo(3, 9);
  ctx.fillStyle = P.ticket;
  ctx.fill();
  ctx.translate(-5, -2);
  drawProduct(ctx, id, 0.75);
  ctx.translate(13, 0);
  ctx.fillStyle = P.encre;
  ctx.font = '900 12px ui-rounded, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, 1);
  ctx.restore();
}
