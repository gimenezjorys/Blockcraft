// Fort Boutique — dessin des indices sans texte (G19) : flèche dorée au sol, halo qui pulse, traînée rouge vers un voleur,
// main fantôme qui montre le geste ; et la carte de la Commande spéciale (G7.7), en haut à droite.
import { PALETTE as P } from '../data/palette.js';
import { rr, fillInk, disc } from './sprites/draw.js';
import { stickerText } from './numerals.js';

const C = 48;

/** Chevron (pointe vers dx, dy) centré en (x, y). */
function chevron(ctx, x, y, dx, dy, s, color, alpha) {
  const a = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(-s * 0.6, -s * 0.7);
  ctx.lineTo(s * 0.5, 0);
  ctx.lineTo(-s * 0.6, s * 0.7);
  ctx.lineTo(-s * 0.15, 0);
  ctx.closePath();
  fillInk(ctx, color, 2);
  ctx.restore();
}

/**
 * Indices dans le monde (au-dessus du voile de nuit).
 * @param {CanvasRenderingContext2D} ctx
 * @param {any} hints g.hints
 * @param {{ x: number, y: number }} from position du marchand (cases)
 * @param {number} ox origine de la grille
 * @param {number} oy
 * @param {number} t temps (s)
 */
export function drawHintsWorld(ctx, hints, from, ox, oy, t) {
  if (!hints) return;
  const a = hints.arrow;
  if (a) {
    const color = a.color === 'red' ? P.danger : P.or;
    // Chevrons qui « coulent » du marchand vers la cible.
    let px = from.x;
    let py = from.y;
    a.path.forEach((pt, i) => {
      const dx = pt.x - px;
      const dy = pt.y - py;
      const k = 0.55 + 0.45 * Math.sin(t * 6 - i * 0.9);
      chevron(ctx, ox + (px + dx * 0.5) * C, oy + (py + dy * 0.5) * C + 10, dx, dy, 9, color, 0.35 + 0.55 * k);
      px = pt.x;
      py = pt.y;
    });
    // La cible : anneau qui pulse et grosse flèche qui rebondit (pointée vers le bas).
    const tx = ox + a.tx * C;
    const ty = oy + a.ty * C;
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.4 * pulse;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(tx, ty + 12, 15 + pulse * 4, 7 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (a.color !== 'red') {
      const b = Math.abs(Math.sin(t * 4)) * 8;
      chevron(ctx, tx, ty - 34 - b, 0, 1, 13, color, 0.95);
    }
  }
  const hl = hints.halo;
  if (hl) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.45 * pulse;
    ctx.strokeStyle = P.craieJaune;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ox + hl.x * C, oy + hl.y * C, hl.r * C + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** Main fantôme (pixels écran) : index tendu, paume ronde. */
function hand(ctx, x, y, press) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.9;
  if (press > 0) {
    ctx.strokeStyle = P.craie;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7 * press;
    ctx.beginPath();
    ctx.arc(0, 0, 10 + (1 - press) * 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
  }
  // Index.
  rr(ctx, -5, -2, 10, 26, 5);
  fillInk(ctx, P.ticket, 2.4);
  // Paume et doigts repliés.
  rr(ctx, -9, 16, 26, 24, 10);
  fillInk(ctx, P.ticket, 2.4);
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(4 + i * 6, 18);
    ctx.lineTo(4 + i * 6, 25);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Main fantôme qui montre le geste du joystick : appui en bas de l'écran, glissement vers la cible (G19 0:06).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ dx: number, dy: number }} h direction (unitaire)
 * @param {number} t
 */
export function drawGhostHand(ctx, h, t) {
  if (!h) return;
  const cycle = 1.6;
  const k = (t % cycle) / cycle;
  const x0 = 180;
  const y0 = 520;
  const move = k < 0.15 ? 0 : k < 0.75 ? (k - 0.15) / 0.6 : 1;
  const ease = move * move * (3 - 2 * move);
  const x = x0 + h.dx * 54 * ease;
  const y = y0 + h.dy * 54 * ease;
  ctx.save();
  ctx.globalAlpha = k > 0.88 ? (1 - k) / 0.12 : 1;
  // Anneau du joystick sous le doigt.
  ctx.strokeStyle = P.craie;
  ctx.lineWidth = 2;
  ctx.globalAlpha *= 0.6;
  ctx.beginPath();
  ctx.arc(x0, y0, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  hand(ctx, x, y, k < 0.15 ? 1 - k / 0.15 : 0);
}

/**
 * Carte de la Commande spéciale (G7.7) : parchemin, produit, « 3/5 » et minuteur.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ got: number, need: number, timeLeft: number }} o
 * @param {(ctx: CanvasRenderingContext2D) => void} productIcon dessine le produit centré en (0, 0)
 * @param {number} total durée totale (s)
 * @param {number} t
 */
export function drawOrderCard(ctx, o, productIcon, total, t) {
  const x = 252;
  const y = 50;
  const w = 100;
  const hh = 44;
  const low = o.timeLeft < 10;
  ctx.save();
  if (low) ctx.translate(Math.sin(t * 30) * 1.2, 0);
  rr(ctx, x, y, w, hh, 8);
  fillInk(ctx, P.ticket, 2.4);
  ctx.save();
  ctx.translate(x + 20, y + 19);
  productIcon(ctx);
  ctx.restore();
  stickerText(ctx, `${o.got}/${o.need}`, x + 66, y + 19, 15, P.craieJaune);
  const k = Math.max(0, Math.min(1, o.timeLeft / total));
  rr(ctx, x + 8, y + 34, w - 16, 6, 3);
  fillInk(ctx, 'rgba(43,26,51,.12)', 1.4);
  if (k > 0) {
    rr(ctx, x + 9, y + 35, Math.max(4, (w - 18) * k), 4, 2);
    ctx.fillStyle = low ? P.danger : P.etiquetteVerte;
    ctx.fill();
  }
  // Petit parchemin dans le coin.
  disc(ctx, x + w - 4, y + 4, 7, P.kraft, 2);
  ctx.restore();
}

/**
 * Une entrée s'ouvrira cette nuit (G19 10:10) : anneau violet qui pulse et étiquette « NOUVEAU », dès la fermeture.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x centre de l'entrée (pixels du monde)
 * @param {number} y
 * @param {number} t
 * @param {string} label « NOUVEAU »
 */
export function drawEntranceWarning(ctx, x, y, t, label) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  ctx.save();
  ctx.globalAlpha = 0.45 + 0.45 * pulse;
  ctx.strokeStyle = P.danger;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 20 + pulse * 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  stickerText(ctx, label, x, y - 34 - pulse * 3, 13, P.craieRose);
}
