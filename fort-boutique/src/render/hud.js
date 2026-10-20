// Fort Boutique — HUD sur le canvas : barre de soleil, compteur de pièces, pause, joystick (G20.8).
import { PALETTE as P } from '../data/palette.js';
import { rr, fillInk, box, disc } from './sprites/draw.js';
import { stickerText, shortNumber } from './numerals.js';

/** Zones tactiles du HUD (pixels logiques). Taille ≥ 44 × 44 (B12). */
export const HUD_BUTTONS = {
  pause: { x: 314, y: 2, w: 44, h: 44 },
  bell: { x: 288, y: 568, r: 32 },
};

/** Position du compteur de pièces (cible des pièces qui volent). */
export const COIN_COUNTER = { x: 262, y: 22 };

/**
 * Joystick flottant : anneau craie 2 px + pastille kraft (B6).
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../input/joystick.js').Joystick} joy
 */
export function drawJoystick(ctx, joy) {
  if (!joy.active) return;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = P.craie;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(joy.ox, joy.oy, joy.radius, 0, Math.PI * 2);
  ctx.stroke();
  const kx = joy.ox + joy.vx * joy.radius;
  const ky = joy.oy + joy.vy * joy.radius;
  ctx.globalAlpha = 1;
  disc(ctx, kx, ky, 20, P.kraft, 2.5);
  ctx.restore();
}

/** Bouton pause : étiquette ronde kraft. */
export function drawPauseButton(ctx) {
  const b = HUD_BUTTONS.pause;
  disc(ctx, b.x + b.w / 2, b.y + b.h / 2, 16, P.kraft, 2.5);
  ctx.fillStyle = P.encre;
  rr(ctx, b.x + b.w / 2 - 6, b.y + b.h / 2 - 7, 4, 14, 1.5);
  ctx.fill();
  rr(ctx, b.x + b.w / 2 + 2, b.y + b.h / 2 - 7, 4, 14, 1.5);
  ctx.fill();
}

/**
 * Compteur de pièces avec rebond ×1,15 (G20.6).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} value
 * @param {number} bump 0 à 1
 */
export function drawCoinCounter(ctx, value, bump) {
  const s = 1 + 0.15 * Math.sin(Math.min(1, bump) * Math.PI);
  ctx.save();
  ctx.translate(COIN_COUNTER.x, COIN_COUNTER.y);
  ctx.scale(s, s);
  disc(ctx, 0, 0, 9, P.or, 2.2);
  disc(ctx, -2.5, -2.5, 2.5, P.orReflet, 0);
  stickerText(ctx, shortNumber(value), 14, 0, 17, P.orReflet, 'left');
  ctx.restore();
}

/**
 * Barre de soleil (G19 1:25) : le soleil glisse vers l'horizon, la lumière devient orangée.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} progress 0 (matin) à 1 (horizon)
 */
export function drawSunBar(ctx, progress) {
  const x = 12;
  const y = 16;
  const w = 196;
  const k = Math.max(0, Math.min(1, progress));
  rr(ctx, x, y, w, 12, 6);
  fillInk(ctx, 'rgba(242,246,238,.25)', 2);
  if (k > 0) {
    rr(ctx, x + 2, y + 2, Math.max(8, (w - 4) * k), 8, 4);
    ctx.fillStyle = k > 0.8 ? '#FFB36B' : P.craieJaune;
    ctx.fill();
  }
  // Horizon.
  ctx.fillStyle = P.craieRose;
  rr(ctx, x + w - 6, y - 4, 4, 20, 2);
  ctx.fill();
  const sx = x + 6 + (w - 12) * k;
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * 11, y + 6 + Math.sin(a) * 11);
    ctx.lineTo(sx + Math.cos(a) * 14, y + 6 + Math.sin(a) * 14);
    ctx.stroke();
  }
  disc(ctx, sx, y + 6, 9, k > 0.8 ? '#FF9F43' : P.or, 2.2);
}

/**
 * Montant restant d'un emplacement d'achat + grosse pièce qui rebondit (G19 0:25).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, price: number, paid: number, shown: number }} pad
 * @param {number} ox origine de la grille
 * @param {number} oy
 */
export function drawPadLabel(ctx, pad, ox, oy, t) {
  const cx = ox + (pad.x + 0.5) * 48;
  const cy = oy + (pad.y + 0.5) * 48;
  stickerText(ctx, String(Math.max(0, pad.price - pad.paid)), cx, cy, 15, P.orReflet);
  if (pad.shown < 6) {
    const bounce = Math.abs(Math.sin(t * 5)) * 8;
    disc(ctx, cx, cy - 30 - bounce, 8, P.or, 2);
    disc(ctx, cx - 2, cy - 32 - bounce, 2, P.orReflet, 0);
  }
}

/** Petit tas de pièces sur la caisse. */
export function drawCoinPile(ctx, x, y, amount) {
  const n = Math.min(6, Math.ceil(amount / 6));
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.ellipse(x + (i % 2) * 5 - 2, y - i * 3, 6, 3, 0, 0, Math.PI * 2);
    fillInk(ctx, P.or, 1.4);
  }
}

/** Enseigne de la porte : soleil (ouvert) ou lune (fermé), sans texte (G19). */
export function drawDoorSign(ctx, x, y, open) {
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 12);
  ctx.lineTo(x, y - 18);
  ctx.lineTo(x + 8, y - 12);
  ctx.stroke();
  box(ctx, x - 13, y - 12, 26, 16, 4, open ? P.etiquetteVerte : P.etiquetteCorail, 1.8);
  if (open) disc(ctx, x, y - 4, 4.5, P.or, 1.4);
  else {
    ctx.fillStyle = P.lune;
    ctx.beginPath();
    ctx.arc(x, y - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.etiquetteCorail;
    ctx.beginPath();
    ctx.arc(x + 2.5, y - 6, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Cœur qui monte (client servi vite, G20.6). */
export function heart(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-8, -2, -4, -9, 0, -4);
  ctx.bezierCurveTo(4, -9, 8, -2, 0, 4);
  fillInk(ctx, P.craieRose, 1.5);
  ctx.restore();
}

/** Teste les boutons du HUD (renvoie l'identifiant ou null). */
export function hudHit(x, y, { bell = false } = {}) {
  const p = HUD_BUTTONS.pause;
  if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return 'pause';
  if (bell) {
    const b = HUD_BUTTONS.bell;
    if (Math.hypot(x - b.x, y - b.y) <= b.r + 8) return 'bell';
  }
  return null;
}
