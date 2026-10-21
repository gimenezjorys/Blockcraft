// Fort Boutique — le marchand (chibi, tablier rayé) et les clients (corps en goutte, chapeaux) (G20.4).
import { PALETTE as P } from '../../data/palette.js';
import { rr, fillInk, box, disc, shadow } from './draw.js';
import { drawProduct } from './products.js';

/**
 * Marchand, pieds en (0, 0). Tête = 45 % de la hauteur.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ walkT: number, moving: boolean, facing: number, stack: string[], lean?: number }} p
 * @param {boolean} [night]
 * @param {string} [outfit]
 */
export function drawMerchant(ctx, p, night = false, outfit = 'apron_stripes') {
  const bob = p.moving ? Math.abs(Math.sin(p.walkT * 11)) * 2 : 0;
  const step = p.moving ? Math.sin(p.walkT * 11) : 0;
  shadow(ctx, 0, 0, 11, 4);
  ctx.save();
  ctx.translate(0, -bob);
  // Jambes (4 poses suggérées par l'alternance).
  ctx.fillStyle = P.encre;
  rr(ctx, -7 + step * 2, -9, 5, 9, 2);
  ctx.fill();
  rr(ctx, 2 - step * 2, -9, 5, 9, 2);
  ctx.fill();
  // Corps + tablier rayé.
  box(ctx, -10, -26, 20, 19, 7, outfitColor(outfit), 2.5);
  ctx.save();
  rr(ctx, -7, -22, 14, 14, 4);
  ctx.clip();
  ctx.fillStyle = P.ticket;
  ctx.fillRect(-7, -22, 14, 14);
  ctx.fillStyle = P.pomme;
  for (let i = -7; i < 7; i += 4) ctx.fillRect(i, -22, 2, 14);
  ctx.restore();
  rr(ctx, -7, -22, 14, 14, 4);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = P.encre;
  ctx.stroke();
  // Lanterne à la ceinture, la nuit.
  if (night) {
    box(ctx, 8 * p.facing - 3, -15, 7, 9, 2, P.lueur, 1.6);
  }
  // Tête.
  disc(ctx, 0, -36, 12, '#FFD7B5', 2.5);
  // Cheveux / chapeau.
  ctx.beginPath();
  ctx.arc(0, -39, 12, Math.PI, 0);
  ctx.closePath();
  fillInk(ctx, hairColor(outfit), 2);
  // Yeux.
  disc(ctx, -4 + p.facing * 1.5, -35, 1.8, P.encre, 0);
  disc(ctx, 4 + p.facing * 1.5, -35, 1.8, P.encre, 0);
  ctx.fillStyle = '#FF8FB1';
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(-7, -31, 2.2, 0, Math.PI * 2);
  ctx.arc(7, -31, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  // Pile d'articles sur la tête : oscille comme un ressort (G20.6).
  const lean = p.lean || 0;
  for (let i = 0; i < p.stack.length; i++) {
    ctx.save();
    ctx.translate(lean * i * 1.2, -52 - bob - i * 9);
    drawProduct(ctx, p.stack[i], 0.82);
    ctx.restore();
  }
}

function outfitColor(id) {
  switch (id) {
    case 'overalls': return '#4D96FF';
    case 'wizard_cape': return '#6A4C93';
    case 'cardboard_armor': return '#C9A16B';
    case 'moon_suit': return '#1A1446';
    case 'evt_apron_apple': return '#FF4F5E';
    case 'evt_apron_mamie': return '#FF8FB1';
    case 'cal_apron_stars': return '#5B7CFA';
    case 'cal_outfit_baker': return '#FFFDF6';
    case 'week_apron_moon': return '#3A2E6E';
    case 'week_outfit_knight': return '#BDC6CF';
    default: return P.ciel;
  }
}

function hairColor(id) {
  switch (id) {
    case 'straw_hat': return '#F2C26B';
    case 'chef_hat': return '#FFFFFF';
    case 'wool_beanie': return '#FF4F5E';
    case 'pumpkin_hat': return '#FF9F43';
    case 'flower_crown': return '#FF8FB1';
    case 'sun_hat': return '#FFD23F';
    case 'evt_crown_raton': return '#FFD23F';
    default: return '#8A4A26';
  }
}

const BODY_COLORS = ['#FF8FB1', '#7FD8FF', '#FFE066', '#46D39A', '#C9A0FF', '#FF9F43'];
const HAT_COLORS = ['#2B1A33', '#FF4F5E', '#4D96FF', '#2EC4B6', '#F2F6EE', '#8A4A26'];

/**
 * Client, pieds en (0, 0) : corps en goutte, petites jambes, chapeau (6 × 6 × 3 combinaisons).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ look: number, type: string, walkT: number, moving: boolean, mood?: number }} c
 */
export function drawCustomer(ctx, c) {
  const body = BODY_COLORS[c.look % 6];
  const hatK = Math.floor(c.look / 6) % 6;
  const face = Math.floor(c.look / 36) % 3;
  const bob = c.moving ? Math.abs(Math.sin(c.walkT * 10)) * 1.5 : 0;
  shadow(ctx, 0, 0, 9, 3.5);
  ctx.save();
  ctx.translate(0, -bob);
  ctx.fillStyle = P.encre;
  ctx.fillRect(-5, -6, 3, 6);
  ctx.fillRect(2, -6, 3, 6);
  // Corps en goutte.
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(10, -22, 11, -6, 0, -5);
  ctx.bezierCurveTo(-11, -6, -10, -22, 0, -30);
  fillInk(ctx, body, 2.2);
  // Visage.
  disc(ctx, -3, -19, 1.5, P.encre, 0);
  disc(ctx, 3, -19, 1.5, P.encre, 0);
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (face === 0) ctx.arc(0, -15, 2.5, 0.2, Math.PI - 0.2);
  else if (face === 1) { ctx.moveTo(-2, -14); ctx.lineTo(2, -14); }
  else ctx.arc(0, -13, 2, Math.PI + 0.3, -0.3);
  ctx.stroke();
  // Chapeau selon le type.
  if (c.type === 'vip') {
    ctx.beginPath();
    ctx.moveTo(-7, -27);
    ctx.lineTo(-7, -35);
    ctx.lineTo(-3.5, -31);
    ctx.lineTo(0, -37);
    ctx.lineTo(3.5, -31);
    ctx.lineTo(7, -35);
    ctx.lineTo(7, -27);
    ctx.closePath();
    fillInk(ctx, P.or, 1.8);
  } else if (c.type === 'hurried') {
    box(ctx, -7, -33, 14, 6, 3, P.pomme, 1.8);
    box(ctx, 2, -29, 9, 3, 1.5, P.pomme, 1.4);
  } else {
    box(ctx, -6, -35, 12, 6, 3, HAT_COLORS[hatK], 1.8);
  }
  if (c.type === 'greedy') box(ctx, 6, -18, 9, 10, 3, P.kraft, 1.8);
  if (c.type === 'order') box(ctx, -15, -20, 8, 11, 2, P.ticket, 1.6);
  ctx.restore();
}
