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
    case 'pastilles':
      // Boîte ronde de pastilles, trois pastilles posées dessus.
      ctx.beginPath();
      ctx.ellipse(0, 3, 7, 4, 0, 0, Math.PI * 2);
      fillInk(ctx, c1, lw);
      disc(ctx, -3, -1, 2.2, c2, 1.2);
      disc(ctx, 1.5, -2.5, 2.2, c3, 1.2);
      disc(ctx, 3.5, 0.5, 2.2, c2, 1.2);
      break;
    case 'tisane':
      // Tasse fumante avec une feuille.
      rr(ctx, -5, -2, 9, 8, 3);
      fillInk(ctx, c2, lw);
      ctx.beginPath();
      ctx.arc(5, 2, 2.5, -Math.PI / 2, Math.PI / 2);
      ctx.lineWidth = lw;
      ctx.strokeStyle = P.encre;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-0.5, 1.5, 3, 1.8, -0.5, 0, Math.PI * 2);
      fillInk(ctx, c1, 1.1);
      ctx.strokeStyle = c3;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2, -4);
      ctx.quadraticCurveTo(0, -6, -1, -8);
      ctx.moveTo(1.5, -4);
      ctx.quadraticCurveTo(3.5, -6, 2.5, -8);
      ctx.stroke();
      break;
    case 'potion':
      // Fiole ronde, col étroit, bouchon, liquide qui brille.
      disc(ctx, 0, 2.5, 5.5, c3, lw);
      ctx.beginPath();
      ctx.arc(0, 2.5, 4.2, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = c1;
      ctx.fill();
      rr(ctx, -2, -6, 4, 4.5, 1);
      fillInk(ctx, c3, lw);
      rr(ctx, -2.5, -8, 5, 2.5, 1);
      fillInk(ctx, c1, 1.2);
      disc(ctx, -1.8, 1, 1, c2, 0);
      break;
    case 'clous':
      // Trois clous en éventail, tête ronde.
      for (const a of [-0.45, 0, 0.45]) {
        ctx.save();
        ctx.rotate(a);
        rr(ctx, -1, -4, 2, 11, 1);
        fillInk(ctx, c1, 1.2);
        rr(ctx, -3, -6, 6, 2.5, 1.2);
        fillInk(ctx, c2, 1.2);
        ctx.restore();
      }
      break;
    case 'peinture':
      // Pot de peinture avec coulure et anse.
      rr(ctx, -6, -3, 12, 10, 2);
      fillInk(ctx, c2, lw);
      ctx.fillStyle = c1;
      ctx.fillRect(-6, -3, 12, 3.5);
      ctx.beginPath();
      ctx.moveTo(-3, 0.5);
      ctx.lineTo(-3, 4);
      ctx.arc(-2, 4, 1, Math.PI, 0, true);
      ctx.lineTo(-1, 0.5);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -3, 6, Math.PI * 1.15, Math.PI * 1.85);
      ctx.strokeStyle = P.encre;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = c3;
      ctx.fillRect(2, 2, 2.5, 2.5);
      break;
    case 'marteau':
      ctx.save();
      ctx.rotate(-0.6);
      rr(ctx, -1.5, -3, 3, 12, 1.2);
      fillInk(ctx, c2, lw);
      rr(ctx, -6, -7, 12, 5, 1.5);
      fillInk(ctx, c1, lw);
      ctx.fillStyle = c3;
      ctx.fillRect(-5, -6, 3, 1.5);
      ctx.restore();
      break;
    case 'bonbons':
      // Bonbon enveloppé, deux papillotes.
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 4, 0);
        ctx.lineTo(sx * 9, -4);
        ctx.lineTo(sx * 9, 4);
        ctx.closePath();
        fillInk(ctx, c2, 1.2);
      }
      disc(ctx, 0, 0, 5, c1, lw);
      ctx.strokeStyle = c3;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-3, -2);
      ctx.quadraticCurveTo(0, 1, 3, -2);
      ctx.moveTo(-3, 1.5);
      ctx.quadraticCurveTo(0, 4.5, 3, 1.5);
      ctx.stroke();
      break;
    case 'cristal':
      // Boule de cristal sur son socle, reflet en étoile.
      rr(ctx, -5, 4, 10, 4, 1.5);
      fillInk(ctx, c2, lw);
      disc(ctx, 0, -1, 6, c1, lw);
      ctx.fillStyle = c3;
      ctx.beginPath();
      ctx.arc(-2.2, -3.2, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.arc(1.8, 0.5, 1.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'grimoire':
      // Livre épais, fermoir doré, lune sur la couverture.
      rr(ctx, -6, -7, 12, 14, 2);
      fillInk(ctx, c1, lw);
      ctx.fillStyle = c3;
      ctx.fillRect(-6, -7, 2.5, 14);
      rr(ctx, 4, -1.5, 3, 3, 0.8);
      fillInk(ctx, c2, 1.1);
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.arc(1, -1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.arc(2.2, -2, 2.6, 0, Math.PI * 2);
      ctx.fill();
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
export function drawWantBubble(ctx, id, alpha = 1, fill = P.ticket) {
  ctx.save();
  ctx.globalAlpha = alpha;
  rr(ctx, -14, -13, 28, 22, 8);
  fillInk(ctx, fill, 2);
  ctx.beginPath();
  ctx.moveTo(-3, 9);
  ctx.lineTo(0, 14);
  ctx.lineTo(3, 9);
  ctx.fillStyle = fill;
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

/**
 * Bulle d'état au-dessus d'un objet (v1.1, V2.2).
 * kind : 'empty' (produit + « ! » rouge), 'low' (petite icône grisée), 'full' (coche verte + nombre),
 * 'queue' (nombre de clients + horloge).
 * @param {CanvasRenderingContext2D} ctx (origine au point d'ancrage, au-dessus de l'objet)
 */
export function drawStatusBubble(ctx, kind, product, n, t) {
  ctx.save();
  if (kind === 'low') {
    ctx.globalAlpha = 0.55;
    drawProduct(ctx, product, 0.7);
    ctx.restore();
    return;
  }
  const bob = Math.sin(t * 4) * 1.5;
  ctx.translate(0, bob);
  rr(ctx, -15, -13, 30, 22, 8);
  fillInk(ctx, P.ticket, 2);
  ctx.beginPath();
  ctx.moveTo(-3, 9);
  ctx.lineTo(0, 14);
  ctx.lineTo(3, 9);
  ctx.fillStyle = P.ticket;
  ctx.fill();
  ctx.font = '900 12px ui-rounded, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (kind === 'empty') {
    ctx.save();
    ctx.translate(-5, -2);
    drawProduct(ctx, product, 0.7);
    ctx.restore();
    disc(ctx, 8, -2, 5, P.danger, 1.4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('!', 8, -1.5);
  } else if (kind === 'full') {
    ctx.strokeStyle = P.etiquetteVerte;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(-6, 2);
    ctx.lineTo(0, -6);
    ctx.stroke();
    ctx.fillStyle = P.encre;
    ctx.fillText(String(n), 7, -1.5);
  } else if (kind === 'queue') {
    disc(ctx, -6, -2, 5.5, P.craieJaune, 1.4);
    ctx.strokeStyle = P.encre;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-6, -5);
    ctx.lineTo(-6, -2);
    ctx.lineTo(-3.5, -1);
    ctx.stroke();
    ctx.fillStyle = P.encre;
    ctx.fillText(String(n), 7, -1.5);
  }
  ctx.restore();
}

/** Petite flèche verte qui pulse dans un coin : meuble améliorable (V2.2). */
export function drawUpgradeBadge(ctx, x, y, t) {
  const k = 1 + 0.12 * Math.sin(t * 6);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  disc(ctx, 0, 0, 7, P.etiquetteVerte, 1.6);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, -4.5);
  ctx.lineTo(4, 0);
  ctx.lineTo(1.5, 0);
  ctx.lineTo(1.5, 4);
  ctx.lineTo(-1.5, 4);
  ctx.lineTo(-1.5, 0);
  ctx.lineTo(-4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
