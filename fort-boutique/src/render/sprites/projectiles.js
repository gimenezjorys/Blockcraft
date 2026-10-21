// Fort Boutique — projectiles : conserve, pièce, pomme, givre, confiture, chantilly, spores, pastille, potion,
// bonbon, page. Les tirs en cloche montent puis retombent (ombre au sol).
import { PALETTE as P } from '../../data/palette.js';
import { disc, shadow } from './draw.js';

const C = 48;

const LOOK = {
  can: ['#BDC6CF', 4],
  coin: [P.or, 3.5],
  apple: [P.pomme, 5],
  frost: [P.craieBleue, 3.5],
  jam: ['#9B5DE5', 5],
  cream: ['#FF8FB1', 4],
  spore: ['#C8FF2E', 5],
  pill: ['#7FD8FF', 3],
  potion: ['#9B5DE5', 6],
  candy: ['#FF8FB1', 3],
  page: ['#FFFDF6', 4],
};

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {any} p projectile
 * @param {number} ox @param {number} oy origine de la grille
 * @param {boolean} [glow] passe lumineuse (après le voile)
 */
export function drawProjectile(ctx, p, ox, oy, glow = false) {
  const [col, r] = LOOK[p.sprite] || LOOK.can;
  const x = ox + p.x * C;
  const y = oy + p.y * C;
  if (glow) {
    ctx.globalAlpha = 0.35;
    disc(ctx, x, y, r * 2, col, 0);
    ctx.globalAlpha = 1;
    disc(ctx, x, y, r * 0.8, P.orReflet, 0);
    return;
  }
  if (p.kind === 'lob') {
    const lift = (p.h || 0) * C;
    shadow(ctx, x, y, r, r * 0.4);
    disc(ctx, x, y - lift, r, col, 1.8);
    return;
  }
  if (p.sprite === 'page') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.t * 10);
    ctx.fillStyle = col;
    ctx.strokeStyle = P.encre;
    ctx.lineWidth = 1.5;
    ctx.fillRect(-4, -5, 8, 10);
    ctx.strokeRect(-4, -5, 8, 10);
    ctx.restore();
    return;
  }
  disc(ctx, x, y, r, col, 1.6);
}
