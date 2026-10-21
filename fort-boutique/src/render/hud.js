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

/**
 * Lune et pastilles de vagues (haut de l'écran la nuit, G20.8).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} wave index (0…)
 * @param {number} total
 * @param {number} cleared vagues terminées
 */
export function drawWavePips(ctx, wave, total, cleared) {
  // Lune.
  ctx.fillStyle = P.lune;
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(24, 23, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#F1DE8C';
  ctx.beginPath();
  ctx.arc(20, 20, 3, 0, Math.PI * 2);
  ctx.arc(28, 27, 2, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < total; i++) {
    const x = 48 + i * 18;
    const done = i < cleared;
    const cur = i === wave && !done;
    disc(ctx, x, 23, cur ? 7 : 6, done ? P.etiquetteVerte : cur ? P.craieJaune : 'rgba(242,246,238,.3)', 2);
    if (done) {
      ctx.strokeStyle = P.encre;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 3, 23);
      ctx.lineTo(x - 0.5, 26);
      ctx.lineTo(x + 3.5, 20);
      ctx.stroke();
    }
  }
}

/**
 * Jauge du Bocal : un bocal qui se vide (G20.8), clignote en rouge au moment d'un vol.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ratio 0 à 1 (et plus avec le bonus de récupération)
 * @param {number} value pièces dans le Bocal
 * @param {number} blink 0 à 1
 */
export function drawJarGauge(ctx, ratio, value, blink) {
  const x = 218;
  const y = 8;
  ctx.save();
  if (blink > 0) ctx.translate(Math.sin(blink * 40) * 2, 0);
  rr(ctx, x, y + 4, 26, 30, 7);
  fillInk(ctx, blink > 0 && Math.floor(blink * 12) % 2 ? 'rgba(255,61,110,.5)' : 'rgba(189,235,255,.55)', 2.2);
  const k = Math.max(0, Math.min(1, ratio));
  if (k > 0) {
    ctx.fillStyle = P.or;
    rr(ctx, x + 3, y + 31 - 24 * k, 20, 24 * k, 4);
    ctx.fill();
  }
  rr(ctx, x + 4, y, 18, 6, 2);
  fillInk(ctx, P.bois, 1.8);
  ctx.restore();
  stickerText(ctx, shortNumber(value), x + 13, y + 46, 12, P.orReflet);
}

/**
 * Bouton Cloche (64 px, se remplit en cercle, G4) ; mode gaucher : à gauche.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} charge @param {number} need
 * @param {number} t temps (pulsation quand prête)
 * @param {boolean} left
 */
export function drawBellButton(ctx, charge, need, t, left = false) {
  const b = HUD_BUTTONS.bell;
  const x = left ? 360 - b.x : b.x;
  const ready = charge >= need;
  const k = Math.min(1, charge / need);
  const s = ready ? 1 + Math.sin(t * 6) * 0.05 : 1;
  ctx.save();
  ctx.translate(x, b.y);
  ctx.scale(s, s);
  disc(ctx, 0, 0, b.r, ready ? P.etiquetteDoree : P.kraft, 3);
  if (!ready) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, b.r - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,210,63,.75)';
    ctx.fill();
  }
  // Cloche.
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.quadraticCurveTo(-12, -14, 0, -14);
  ctx.quadraticCurveTo(12, -14, 12, 8);
  ctx.closePath();
  fillInk(ctx, ready ? P.orReflet : '#E8D3B0', 2.4);
  disc(ctx, 0, 11, 3.5, P.encre, 0);
  ctx.restore();
}

/**
 * Bulle de télégraphe au-dessus d'une entrée : icônes des types qui vont sortir, « NOUVEAU » si jamais vu (G8.3).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y pixels
 * @param {string[]} types
 * @param {(ctx: CanvasRenderingContext2D, type: string) => void} icon
 * @param {boolean} isNew
 * @param {number} t
 * @param {string} newLabel
 */
export function drawTelegraph(ctx, x, y, types, icon, isNew, t, newLabel) {
  const s = 1 + Math.sin(t * 8) * 0.07;
  const w = 10 + types.length * 22;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  rr(ctx, -w / 2, -18, w, 30, 10);
  fillInk(ctx, P.ticket, 2.2);
  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.lineTo(0, 19);
  ctx.lineTo(5, 12);
  ctx.fillStyle = P.ticket;
  ctx.fill();
  types.forEach((ty, i) => {
    ctx.save();
    ctx.translate(-w / 2 + 16 + i * 22, 8);
    ctx.scale(0.55, 0.55);
    icon(ctx, ty);
    ctx.restore();
  });
  if (isNew) {
    rr(ctx, -26, -32, 52, 14, 5);
    fillInk(ctx, P.yeuxGrignotins, 1.8);
    ctx.fillStyle = P.encre;
    ctx.font = '900 9px ui-rounded, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(newLabel, 0, -25);
  }
  ctx.restore();
}

/** Bannière brève (« RUSH! », « 2/4 », niveau…), au centre de l'écran. */
export function drawBanner(ctx, text, t, life, color = P.craieJaune) {
  const k = t / life;
  const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.5 : 1.1 - Math.min(0.1, (k - 0.12));
  ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
  stickerText(ctx, text, 180, 250, 30 * pop, color);
  ctx.globalAlpha = 1;
}

/**
 * Barre de PV du boss en haut de l'écran (G10.3), sous les pastilles de vagues.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} k PV restants (0 à 1)
 * @param {number} hit secousse quand il est touché (0 à 1)
 */
export function drawBossBar(ctx, k, hit = 0) {
  const x = 70;
  const y = 50 + (hit > 0 ? Math.sin(hit * 40) * 1.5 : 0);
  const w = 220;
  rr(ctx, x, y, w, 14, 7);
  fillInk(ctx, 'rgba(26,20,70,.85)', 2.4);
  if (k > 0) {
    rr(ctx, x + 3, y + 3, Math.max(4, (w - 6) * Math.min(1, k)), 8, 4);
    ctx.fillStyle = P.danger;
    ctx.fill();
  }
  // Petite couronne à gauche.
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 12);
  ctx.lineTo(x - 18, y + 1);
  ctx.lineTo(x - 12, y + 6);
  ctx.lineTo(x - 8, y - 1);
  ctx.lineTo(x - 4, y + 6);
  ctx.lineTo(x + 2, y + 1);
  ctx.lineTo(x, y + 12);
  ctx.closePath();
  fillInk(ctx, P.or, 1.8);
}

/**
 * Carte de présentation du boss (G10.3) : silhouette + nom, et le Courage de Mamie s'il y en a (G8.9).
 * @param {CanvasRenderingContext2D} ctx
 * @param {(ctx: CanvasRenderingContext2D) => void} silhouette dessine le boss centré en (0, 0)
 * @param {string} name
 * @param {number} t secondes depuis l'entrée
 * @param {string | null} courage ex. « Courage de Mamie +15 % »
 */
export function drawBossCard(ctx, silhouette, name, t, courage) {
  const life = 2.2;
  const k = t / life;
  const a = k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, a);
  ctx.translate(180, 230 - (1 - Math.min(1, k / 0.1)) * 30);
  rr(ctx, -120, -70, 240, courage ? 150 : 128, 16);
  fillInk(ctx, 'rgba(26,20,70,.92)', 3);
  ctx.save();
  ctx.translate(0, 0);
  ctx.scale(1.6, 1.6);
  silhouette(ctx);
  ctx.restore();
  stickerText(ctx, name, 0, 36, 20, P.orReflet);
  if (courage) stickerText(ctx, courage, 0, 64, 13, P.yeuxGrignotins);
  ctx.restore();
}
