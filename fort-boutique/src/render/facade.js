// Fort Boutique — la façade de la boutique vue de la rue (v1.1 : écran titre V7, le soir ; hub du Matin V8, le jour).
// Dessin pur sur canvas, coordonnées logiques (360 de large). Murs menthe, auvent rayé, vitrine chaude, porte avec
// carillon, deux lanternes, enseigne en bois crénelée avec le logo lettre par lettre et deux petits yeux.
import { PALETTE as P } from '../data/palette.js';
import { rr, fillInk, disc } from './sprites/draw.js';

export const FACADE = { x: 50, w: 260, top: 236, base: 470, signY: 132, awningY: 262, winX: 66, winY: 300, winW: 128, winH: 118, doorX: 214, doorY: 296, doorW: 74 };

const FONT = '900 {s}px ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif';
const font = (s) => FONT.replace('{s}', String(s));

/** Petite fonction de hasard stable (positions des étoiles, du grain…). */
export function hash01(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Lettrage du logo : chaque lettre posée à part (rotation −3° à +3°, petite variation de hauteur), contour encre 6 px,
 * remplissage orReflet, reflet blanc en haut de chaque lettre, ombre encre décalée de 4 px.
 */
export function drawLogoText(ctx, text, cx, cy, size, seed = 0) {
  ctx.save();
  ctx.font = font(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const letters = [...text];
  const widths = letters.map((ch) => (ch === ' ' ? size * 0.32 : ctx.measureText(ch).width * 0.96));
  const total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  letters.forEach((ch, i) => {
    const w = widths[i];
    if (ch !== ' ') {
      const r = (hash01(seed + i * 3.1) - 0.5) * 0.105;
      const dy = (hash01(seed + i * 7.7) - 0.5) * size * 0.12;
      ctx.save();
      ctx.translate(x + w / 2, cy + dy);
      ctx.rotate(r);
      // Ombre « tampon » encre, décalée de 4 px, jamais floue.
      ctx.fillStyle = P.encre;
      ctx.lineWidth = 6;
      ctx.strokeStyle = P.encre;
      ctx.strokeText(ch, 0, 4);
      ctx.fillText(ch, 0, 4);
      ctx.strokeText(ch, 0, 0);
      ctx.fillStyle = P.orReflet;
      ctx.fillText(ch, 0, 0);
      // Reflet blanc en haut de la lettre.
      ctx.save();
      ctx.beginPath();
      ctx.rect(-w, -size * 0.5, w * 2, size * 0.26);
      ctx.clip();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      ctx.restore();
    }
    x += w;
  });
  ctx.restore();
}

/** Œil de l'enseigne (paupière en bois : 0 fermé, 1 ouvert) qui regarde vers `look` (−1 gauche, 1 droite). */
function signEye(ctx, x, y, open, look) {
  ctx.beginPath();
  ctx.ellipse(x, y, 9, 10, 0, 0, Math.PI * 2);
  fillInk(ctx, '#FFFFFF', 2.5);
  disc(ctx, x + look * 3.5, y + 1.5, 4.2, P.encre, 0);
  disc(ctx, x + look * 3.5 + 1.6, y - 0.6, 1.4, '#FFFFFF', 0);
  if (open < 1) {
    const h = 20 * (1 - open);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, 10.5, 11.5, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = P.bois;
    ctx.fillRect(x - 12, y - 11.5, 24, h);
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(x, y, 9, 10, 0, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = P.encre;
    ctx.stroke();
  }
}

/**
 * Enseigne crénelée en bois, avec le logo et deux yeux.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, eyes: number, look: number, title: string[] }} o
 */
export function drawSign(ctx, o) {
  const { x, y } = o;
  const W = 300;
  const H = 104;
  ctx.save();
  ctx.translate(x - W / 2, y);
  // Ombre tampon.
  ctx.fillStyle = 'rgba(43, 26, 51, 0.25)';
  rr(ctx, 4, 7, W, H, 18);
  ctx.fill();
  // Créneaux puis corps.
  ctx.fillStyle = P.bois;
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 4;
  for (const mx of [26, 92, 176, 242]) {
    rr(ctx, mx, -18, 32, 30, 5);
    ctx.fill();
    ctx.stroke();
  }
  rr(ctx, 0, 0, W, H, 18);
  ctx.fill();
  ctx.stroke();
  // Veinage du bois.
  ctx.strokeStyle = P.boisFonce;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (const yy of [30, 74]) {
    ctx.beginPath();
    ctx.moveTo(14, yy);
    ctx.bezierCurveTo(W * 0.3, yy - 3, W * 0.6, yy + 3, W - 14, yy);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 30; i++) ctx.fillRect(10 + hash01(i) * (W - 20), 6 + hash01(i + 50) * (H - 12), 10 + hash01(i + 9) * 30, 1.5);
  ctx.globalAlpha = 1;
  // Yeux sur les deux créneaux du milieu.
  signEye(ctx, 108, -3, o.eyes, o.look);
  signEye(ctx, 192, -3, o.eyes, o.look);
  ctx.restore();
  const [l1, l2] = o.title;
  drawLogoText(ctx, l1, x, y + 31, 34, 1);
  drawLogoText(ctx, l2 || '', x, y + 72, 38, 9);
}

/** Auvent rayé menthe et blanc, bord festonné. */
function drawAwning(ctx, t, day) {
  const { x, w, awningY: y } = FACADE;
  const n = 10;
  const sw = (w + 16) / n;
  for (let i = 0; i < n; i++) {
    const sx = x - 8 + i * sw;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx + sw, y);
    ctx.lineTo(sx + sw, y + 26);
    ctx.quadraticCurveTo(sx + sw / 2, y + 38, sx, y + 26);
    ctx.closePath();
    fillInk(ctx, i % 2 ? '#FFFFFF' : day ? '#5FD3B0' : '#4FB89C', 2.5);
  }
  void t;
}

/**
 * La façade complète.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ t: number, day?: boolean, lanterns?: [number, number], door?: number, interior?: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void }} o
 */
export function drawFacade(ctx, o) {
  const F = FACADE;
  const day = !!o.day;
  const t = o.t;
  // Mur menthe, avec ombre tampon et grain.
  ctx.fillStyle = 'rgba(43, 26, 51, 0.25)';
  ctx.fillRect(F.x + 4, F.top + 6, F.w, F.base - F.top);
  ctx.beginPath();
  ctx.rect(F.x, F.top, F.w, F.base - F.top);
  fillInk(ctx, day ? P.mur : '#6FB7A6', 3);
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = P.encre;
  for (let i = 0; i < 70; i++) ctx.fillRect(F.x + hash01(i + 3) * F.w, F.top + hash01(i + 90) * (F.base - F.top), 2, 2);
  ctx.globalAlpha = 1;
  // Soubassement.
  ctx.beginPath();
  ctx.rect(F.x, F.base - 18, F.w, 18);
  fillInk(ctx, day ? P.murOmbre : '#4E9888', 3);
  drawAwning(ctx, t, day);
  // Vitrine chaude : on devine les étagères (ou l'intérieur réel du joueur, au Matin).
  ctx.beginPath();
  rr(ctx, F.winX - 6, F.winY - 6, F.winW + 12, F.winH + 12, 8);
  fillInk(ctx, P.bois, 3);
  ctx.save();
  rr(ctx, F.winX, F.winY, F.winW, F.winH, 4);
  ctx.clip();
  const glow = ctx.createLinearGradient(0, F.winY, 0, F.winY + F.winH);
  glow.addColorStop(0, day ? '#FFF1C9' : '#FFD27A');
  glow.addColorStop(1, day ? '#F7D79A' : '#F59E4B');
  ctx.fillStyle = glow;
  ctx.fillRect(F.winX, F.winY, F.winW, F.winH);
  if (o.interior) o.interior(ctx, F.winX, F.winY, F.winW, F.winH);
  else {
    for (const sy of [F.winY + 38, F.winY + 78]) {
      ctx.fillStyle = 'rgba(138, 74, 38, 0.55)';
      ctx.fillRect(F.winX + 8, sy, F.winW - 16, 6);
      for (let k = 0; k < 7; k++) disc(ctx, F.winX + 18 + k * 15, sy - 7, 5, ['#FF4F5E', '#FFF3B0', '#FF9F43'][k % 3], 0);
    }
  }
  // Reflet de la vitre.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(F.winX + 14, F.winY);
  ctx.lineTo(F.winX + 34, F.winY);
  ctx.lineTo(F.winX + 4, F.winY + 50);
  ctx.lineTo(F.winX, F.winY + 30);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  rr(ctx, F.winX, F.winY, F.winW, F.winH, 4);
  ctx.lineWidth = 3;
  ctx.strokeStyle = P.encre;
  ctx.stroke();
  // Porte (s'ouvre au tap de l'écran titre).
  const dh = F.base - F.doorY;
  const open = Math.max(0, Math.min(1, o.door || 0));
  ctx.beginPath();
  rr(ctx, F.doorX - 5, F.doorY - 5, F.doorW + 10, dh + 5, 10);
  fillInk(ctx, P.boisFonce, 3);
  ctx.fillStyle = '#FFD27A';
  rr(ctx, F.doorX, F.doorY, F.doorW, dh, 8);
  ctx.fill();
  ctx.save();
  ctx.translate(F.doorX, 0);
  ctx.scale(1 - open * 0.85, 1);
  ctx.beginPath();
  rr(ctx, 0, F.doorY, F.doorW, dh, 8);
  fillInk(ctx, P.bois, 3);
  ctx.beginPath();
  rr(ctx, 12, F.doorY + 14, F.doorW - 24, 44, 6);
  fillInk(ctx, day ? '#FFF1C9' : '#FFD27A', 2.5);
  disc(ctx, F.doorW - 13, F.doorY + dh / 2 + 6, 4.5, P.or, 2);
  ctx.restore();
  // Carillon au-dessus de la porte.
  const sw = Math.sin(t * 2.2) * 0.12;
  ctx.save();
  ctx.translate(F.doorX + F.doorW / 2, F.doorY - 6);
  ctx.rotate(sw);
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7, 9);
  ctx.quadraticCurveTo(-6, -2, 0, -2);
  ctx.quadraticCurveTo(6, -2, 7, 9);
  ctx.closePath();
  fillInk(ctx, P.or, 2);
  ctx.restore();
  // Deux lanternes qui vacillent (allumées une à une à l'entrée de l'écran titre).
  const lan = o.lanterns || [1, 1];
  [[F.x + 12, 0], [F.x + F.w - 12, 1]].forEach(([lx, k]) => {
    const on = lan[k];
    const fl = 0.85 + Math.sin(t * 9 + k * 2) * 0.08 + Math.sin(t * 23 + k) * 0.05;
    if (on > 0 && !day) {
      const r = 46 * fl;
      const gr = ctx.createRadialGradient(lx, 312, 2, lx, 312, r);
      gr.addColorStop(0, `rgba(255, 181, 71, ${0.55 * on})`);
      gr.addColorStop(1, 'rgba(255, 181, 71, 0)');
      ctx.fillStyle = gr;
      ctx.fillRect(lx - r, 312 - r, r * 2, r * 2);
    }
    ctx.strokeStyle = P.encre;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(lx, 290);
    ctx.lineTo(lx, 298);
    ctx.stroke();
    ctx.beginPath();
    rr(ctx, lx - 8, 298, 16, 24, 5);
    fillInk(ctx, on > 0 ? `rgba(255, ${Math.round(200 + 40 * fl)}, 120, 1)` : '#8C7A66', 2.5);
    ctx.fillStyle = P.encre;
    ctx.fillRect(lx - 10, 296, 20, 3);
    ctx.fillRect(lx - 10, 321, 20, 3);
  });
}

/** Cagette de pommes sur le trottoir. */
export function drawCrate(ctx, x, y) {
  ctx.fillStyle = 'rgba(43, 26, 51, 0.25)';
  ctx.fillRect(x + 3, y + 5, 44, 24);
  for (let k = 0; k < 5; k++) disc(ctx, x + 7 + k * 8, y - 1 - (k % 2) * 3, 5.5, P.pomme, 2);
  ctx.beginPath();
  ctx.rect(x, y, 44, 24);
  fillInk(ctx, P.bois, 2.5);
  ctx.strokeStyle = P.boisFonce;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 12);
  ctx.lineTo(x + 41, y + 12);
  ctx.stroke();
}

/** Moka endormi en boule (la queue bat doucement). */
export function drawSleepingCat(ctx, x, y, t, awake = false) {
  ctx.fillStyle = 'rgba(43, 26, 51, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 4, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const tail = Math.sin(t * 1.6) * 0.35;
  ctx.save();
  ctx.translate(x + 14, y - 3);
  ctx.rotate(tail);
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -2, 12, -12);
  ctx.stroke();
  ctx.strokeStyle = '#F08A3C';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(x, y - 6, 16, 10, 0, 0, Math.PI * 2);
  fillInk(ctx, '#F08A3C', 2.5);
  ctx.beginPath();
  ctx.moveTo(x - 17, y - 10);
  ctx.lineTo(x - 15, y - 21);
  ctx.lineTo(x - 9, y - 14);
  ctx.lineTo(x - 4, y - 21);
  ctx.lineTo(x - 2, y - 10);
  ctx.closePath();
  fillInk(ctx, '#F08A3C', 2.5);
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 1.6;
  if (awake) {
    disc(ctx, -12 + x, y - 11, 1.6, P.encre, 0);
    disc(ctx, -6 + x, y - 11, 1.6, P.encre, 0);
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 11);
    ctx.lineTo(x - 11, y - 10);
    ctx.moveTo(x - 8, y - 10);
    ctx.lineTo(x - 5, y - 11);
    ctx.stroke();
  }
}

/** Buisson ; ses yeux vert acide clignent de temps en temps, et un raton passe la tête une fois. */
export function drawBush(ctx, x, y, t, eyes, raccoon) {
  if (raccoon > 0) {
    const ry = y - 18 - Math.sin(Math.min(1, raccoon) * Math.PI) * 22;
    ctx.beginPath();
    ctx.ellipse(x + 24, ry, 14, 12, 0, 0, Math.PI * 2);
    fillInk(ctx, '#9A9AA8', 2.5);
    ctx.fillStyle = P.encre;
    ctx.fillRect(x + 12, ry - 4, 24, 6);
    disc(ctx, x + 19, ry - 1, 2, P.yeuxGrignotins, 0);
    disc(ctx, x + 29, ry - 1, 2, P.yeuxGrignotins, 0);
  }
  for (const [dx, dy, r] of [[0, 0, 26], [28, -10, 24], [52, 4, 22]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    fillInk(ctx, '#2F6B4F', 2.5);
  }
  if (eyes > 0) {
    ctx.globalAlpha = eyes;
    for (const ex of [x + 22, x + 34]) {
      ctx.beginPath();
      ctx.ellipse(ex, y - 6, 3.5, 2.5 * eyes, 0, 0, Math.PI * 2);
      ctx.fillStyle = P.yeuxGrignotins;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
