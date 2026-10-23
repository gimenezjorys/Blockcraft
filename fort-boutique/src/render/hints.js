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
  // Ce qu'on gagne : un petit coffre en bois dans le coin (G19 7:40 « → coffre »).
  rr(ctx, x + w - 13, y - 4, 18, 13, 3);
  fillInk(ctx, P.bois, 1.8);
  rr(ctx, x + w - 13, y - 4, 18, 5, 2);
  fillInk(ctx, P.boisFonce, 1.4);
  disc(ctx, x + w - 4, y + 3, 2, P.or, 1);
  ctx.restore();
}

/**
 * Bulle du client de la Commande spéciale (P2, Léa) : le produit demandé et « 2/5 », avec un halo qui pulse.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x position du client (pixels du monde)
 * @param {number} y
 * @param {(ctx: CanvasRenderingContext2D) => void} productIcon dessine le produit centré en (0, 0)
 * @param {number} got
 * @param {number} need
 * @param {number} t
 */
export function drawOrderBubble(ctx, x, y, productIcon, got, need, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.4 * pulse;
  ctx.strokeStyle = P.craieJaune;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 16 + pulse * 4, 8 + pulse * 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.translate(x, y - 40);
  rr(ctx, -22, -13, 44, 24, 8);
  fillInk(ctx, P.ticket, 2);
  ctx.beginPath();
  ctx.moveTo(-3, 11);
  ctx.lineTo(0, 16);
  ctx.lineTo(3, 11);
  ctx.fillStyle = P.ticket;
  ctx.fill();
  ctx.save();
  ctx.translate(-11, -1);
  productIcon(ctx);
  ctx.restore();
  stickerText(ctx, `${got}/${need}`, 9, 0, 12, P.craieJaune);
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

/**
 * Flèche d'objectif (v1.1, V2.1) : grosse flèche dorée (28 × 34 px, contour encre 3 px, reflet blanc) qui flotte à
 * 36 px au-dessus de la cible et rebondit (6 px, 0,8 s) ; anneau doré au sol qui pulse (opacité 0,6 -> 0, 1,2 s).
 * Aucun tracé de chemin.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x centre de la cible (pixels)
 * @param {number} y base de la cible (pixels)
 * @param {number} t temps (s)
 * @param {boolean} [thief] voleur : flèche rouge
 */
export function drawGuideArrow(ctx, x, y, t, thief = false) {
  const ring = (t % 1.2) / 1.2;
  ctx.save();
  ctx.globalAlpha = 0.6 * (1 - ring);
  ctx.strokeStyle = thief ? P.danger : P.or;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 12 + ring * 10, 5 + ring * 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const by = y - 36 - Math.abs(Math.sin((t / 0.8) * Math.PI)) * 6;
  ctx.translate(x, by);
  // Flèche pointée vers le bas : tige 12 × 16, pointe 28 × 18.
  ctx.beginPath();
  ctx.moveTo(-6, -17);
  ctx.lineTo(6, -17);
  ctx.lineTo(6, -1);
  ctx.lineTo(14, -1);
  ctx.lineTo(0, 17);
  ctx.lineTo(-14, -1);
  ctx.lineTo(-6, -1);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = P.encre;
  ctx.fillStyle = thief ? P.danger : P.or;
  ctx.fill();
  ctx.stroke();
  // Reflet blanc.
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.moveTo(-3.5, -14);
  ctx.lineTo(-1, -14);
  ctx.lineTo(-1, -3);
  ctx.lineTo(-3.5, -3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * v1.1 (V2.4) : panneau de porte qui se retourne à l'ouverture (côté rouge « Fermé », puis côté vert « Ouvert »).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} k avancée de 0 à 1
 * @param {number} alpha
 * @param {string} closed
 * @param {string} open
 */
export function drawOpenSign(ctx, x, y, k, alpha, closed, open) {
  if (alpha <= 0) return;
  // Retournement entre 35 % et 75 % de l'ouverture.
  const f = Math.max(0, Math.min(1, (k - 0.35) / 0.4));
  const sx = Math.abs(Math.cos(f * Math.PI));
  const front = f < 0.5;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Ficelle.
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 12);
  ctx.lineTo(x, y - 22);
  ctx.lineTo(x + 14, y - 12);
  ctx.stroke();
  ctx.translate(x, y);
  ctx.scale(Math.max(0.06, sx), 1);
  rr(ctx, -26, -12, 52, 22, 5);
  fillInk(ctx, front ? '#FF6B6B' : '#46D39A', 3);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 12px "Baloo 2", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(front ? closed : open, 0, 0);
  ctx.restore();
}
