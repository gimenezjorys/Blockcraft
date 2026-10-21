// Fort Boutique — Moka (chat roux de Mamie) et le personnel (commis au tablier vert, caissier au gilet) ; « Zzz » la nuit.
import { PALETTE as P } from '../../data/palette.js';
import { fillInk, disc, shadow } from './draw.js';

/** Moka : origine aux pattes. */
export function drawCat(ctx, cat, t) {
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
  ctx.restore();
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
