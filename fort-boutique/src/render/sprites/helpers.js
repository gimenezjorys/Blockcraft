// Fort Boutique — Moka (chat roux de Mamie) et le personnel (commis au tablier vert, caissier au gilet) ; « Zzz » la nuit.
import { PALETTE as P } from '../../data/palette.js';
import { fillInk, disc, shadow } from './draw.js';

/** Moka : origine aux pattes. */
export function drawCat(ctx, cat, t, hat = null) {
  const hop = cat.pounce ? -Math.sin(Math.min(1, cat.pounce.t / 0.3) * Math.PI) * 6 : 0;
  shadow(ctx, 0, 0, 8, 3);
  ctx.save();
  ctx.translate(0, hop);
  // Queue qui ondule.
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(6, -6);
  ctx.quadraticCurveTo(13, -10 + Math.sin(t * 4) * 3, 11, -18);
  ctx.stroke();
  ctx.strokeStyle = '#F08A3C';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Corps et tête.
  ctx.beginPath();
  ctx.ellipse(0, -6, 8, 6, 0, 0, Math.PI * 2);
  fillInk(ctx, '#F08A3C', 2);
  ctx.beginPath();
  ctx.moveTo(-7, -14);
  ctx.lineTo(-6, -22);
  ctx.lineTo(-2, -17);
  ctx.lineTo(2, -17);
  ctx.lineTo(6, -22);
  ctx.lineTo(7, -14);
  ctx.arc(0, -13, 7, 0, Math.PI);
  fillInk(ctx, '#F08A3C', 2);
  disc(ctx, -2.5, -14, 1.2, P.encre, 0);
  disc(ctx, 2.5, -14, 1.2, P.encre, 0);
  disc(ctx, 0, -11.5, 0.9, '#FF8FB1', 0);
  if (hat) drawCatHat(ctx, hat);
  ctx.restore();
}

/** Accessoire de Moka (G17) : une forme simple et une couleur par objet. */
const CAT_HATS = {
  cat_bow: ['bow', '#FF4F5E'], cat_beanie: ['cap', '#5B7CFA'], cat_glasses: ['glasses', P.encre], cat_scarf: ['scarf', '#FF4F5E'],
  cat_crown: ['crown', '#FFD23F'], cat_pumpkin: ['cap', '#FF8A3D'], cat_cape: ['scarf', '#6A4C93'], cat_knight: ['cap', '#BDC6CF'],
  cat_halo: ['halo', '#FFE066'], evt_cat_gloubi: ['cap', '#46D39A'], cal_cat_scarf: ['scarf', '#46D39A'], week_cat_bell: ['bell', '#FFD23F'],
};
function drawCatHat(ctx, id) {
  const [shape, color] = CAT_HATS[id] || ['cap', '#FFFFFF'];
  ctx.fillStyle = color;
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (shape === 'cap') ctx.arc(0, -19, 5, Math.PI, 0);
  else if (shape === 'crown') { ctx.moveTo(-5, -18); ctx.lineTo(-5, -24); ctx.lineTo(-2, -21); ctx.lineTo(0, -25); ctx.lineTo(2, -21); ctx.lineTo(5, -24); ctx.lineTo(5, -18); ctx.closePath(); }
  else if (shape === 'halo') { ctx.ellipse(0, -26, 6, 2, 0, 0, Math.PI * 2); ctx.stroke(); return; }
  else if (shape === 'glasses') { ctx.arc(-2.5, -14, 2.2, 0, Math.PI * 2); ctx.moveTo(4.7, -14); ctx.arc(2.5, -14, 2.2, 0, Math.PI * 2); ctx.stroke(); return; }
  else if (shape === 'scarf') ctx.rect(-6, -10, 12, 3);
  else if (shape === 'bell') ctx.arc(0, -7, 2, 0, Math.PI * 2);
  else { ctx.moveTo(-5, -20); ctx.lineTo(0, -17); ctx.lineTo(5, -20); ctx.lineTo(5, -15); ctx.lineTo(0, -17); ctx.lineTo(-5, -15); ctx.closePath(); }
  ctx.fill();
  ctx.stroke();
}

/** Commis ou caissier ; endormi : assis, « Zzz ». */
export function drawStaff(ctx, s, t) {
  const bob = s.moving ? Math.abs(Math.sin(t * 10)) * 1.5 : 0;
  shadow(ctx, 0, 0, 9, 3.5);
  ctx.save();
  ctx.translate(0, s.sleep ? 6 : -bob);
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.bezierCurveTo(10, -21, 10, -6, 0, -5);
  ctx.bezierCurveTo(-10, -6, -10, -21, 0, -28);
  fillInk(ctx, '#FFE3C4', 2.2);
  // Tablier vert (commis) ou gilet bleu (caissier).
  ctx.beginPath();
  ctx.moveTo(-6, -15);
  ctx.lineTo(6, -15);
  ctx.lineTo(7, -6);
  ctx.lineTo(-7, -6);
  ctx.closePath();
  fillInk(ctx, s.kind === 'cashier' ? '#5B7CFA' : '#46D39A', 1.6);
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 1.4;
  if (s.sleep) {
    ctx.beginPath();
    ctx.moveTo(-4, -20);
    ctx.lineTo(-1, -20);
    ctx.moveTo(1, -20);
    ctx.lineTo(4, -20);
    ctx.stroke();
    ctx.fillStyle = P.craie || '#F2F6EE';
    ctx.font = '800 9px sans-serif';
    const z = Math.floor(t * 1.5) % 3;
    ctx.fillText('Z', 8, -26 - z * 3);
    ctx.fillText('z', 13, -32 - z * 3);
  } else {
    disc(ctx, -3, -20, 1.4, P.encre, 0);
    disc(ctx, 3, -20, 1.4, P.encre, 0);
    if (s.hold > 0) {
      ctx.fillStyle = P.encre;
      ctx.font = '800 9px sans-serif';
      ctx.fillText(String(s.hold), -3, -31);
    }
  }
  ctx.restore();
}
