// Fort Boutique — sol en lames (damier), murs menthe avec plinthe, fenêtres, portes (G20.4).
import { PALETTE as P } from '../../data/palette.js';
import { rr, fillInk, box, shade } from './draw.js';

export const WALL_TOP = 30;
export const WALL_SIDE = 12;
export const WALL_FRONT = 14;

/**
 * Sol + murs de la boutique, à dessiner dans un canvas hors écran (mis en cache).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ w: number, h: number, origin: { x: number, y: number }, entrances: any[], door: { x: number, y: number } }} grid
 * @param {{ night?: boolean, theme?: string }} [o]
 */
export function drawShopShell(ctx, grid, o = {}) {
  const C = 48;
  const { w, h } = grid;
  const ox = grid.origin.x;
  const oy = grid.origin.y;
  const W = w * C;
  const H = h * C;
  const theme = THEMES[o.theme] || THEMES.classic;
  // Sol : lames en damier.
  for (let cy = 0; cy < h; cy++) {
    for (let cx = 0; cx < w; cx++) {
      const x = ox + cx * C;
      const y = oy + cy * C;
      ctx.fillStyle = (cx + cy) % 2 ? theme.floorB : theme.floorA;
      ctx.fillRect(x, y, C, C);
      ctx.fillStyle = shade((cx + cy) % 2 ? theme.floorB : theme.floorA, -0.08);
      ctx.fillRect(x, y + C / 2 - 1, C, 2);
      ctx.fillRect(x + ((cy % 2) ? 14 : 32), y, 2, C / 2);
      ctx.fillRect(x + ((cy % 2) ? 34 : 10), y + C / 2, 2, C / 2);
    }
  }
  // Murs.
  ctx.fillStyle = theme.wall;
  ctx.fillRect(ox - WALL_SIDE, oy - WALL_TOP, W + WALL_SIDE * 2, WALL_TOP);
  ctx.fillRect(ox - WALL_SIDE, oy, WALL_SIDE, H + WALL_FRONT);
  ctx.fillRect(ox + W, oy, WALL_SIDE, H + WALL_FRONT);
  ctx.fillRect(ox - WALL_SIDE, oy + H, W + WALL_SIDE * 2, WALL_FRONT);
  // Plinthe en bois au pied du mur du haut, ombre des murs.
  ctx.fillStyle = theme.wallShade;
  ctx.fillRect(ox - WALL_SIDE, oy - 10, W + WALL_SIDE * 2, 4);
  ctx.fillStyle = P.boisFonce;
  ctx.fillRect(ox, oy - 6, W, 6);
  ctx.fillStyle = 'rgba(43,26,51,.12)';
  ctx.fillRect(ox, oy, W, 5);
  ctx.fillRect(ox, oy, 4, H);
  // Contour encre de l'ensemble.
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = P.encre;
  rr(ctx, ox - WALL_SIDE, oy - WALL_TOP, W + WALL_SIDE * 2, H + WALL_TOP + WALL_FRONT, 6);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, W, H);
  // Entrées.
  for (const e of grid.entrances) drawEntrance(ctx, e, ox, oy, C, w, h, o.night);
  // Porte d'entrée des clients (mur de devant) et paillasson.
  const dx = ox + grid.door.x * C;
  ctx.fillStyle = theme.floorA;
  ctx.fillRect(dx + 4, oy + H - 1, C - 8, WALL_FRONT + 1);
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dx + 4, oy + H);
  ctx.lineTo(dx + 4, oy + H + WALL_FRONT);
  ctx.moveTo(dx + C - 4, oy + H);
  ctx.lineTo(dx + C - 4, oy + H + WALL_FRONT);
  ctx.stroke();
  box(ctx, dx + 8, oy + H - 12, C - 16, 10, 3, P.pomme, 1.8);
  if (o.season) drawSeason(ctx, o.season, ox, oy, W, H);
}

/** Décor de saison (G13.6) : citrouilles, neige, fleurs, soleil, posés sur le mur du haut et dans les coins. */
function drawSeason(ctx, season, ox, oy, W, H) {
  const top = oy - 8;
  const corners = [[ox + 10, top], [ox + W - 10, top], [ox + 10, oy + H - 6], [ox + W - 10, oy + H - 6]];
  if (season === 'halloween') {
    for (const [x, y] of corners) {
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 6.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FF8A3D';
      ctx.fill();
      ctx.strokeStyle = P.encre;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#46D39A';
      ctx.fillRect(x - 1, y - 9, 2.5, 4);
      ctx.fillStyle = P.encre;
      ctx.fillRect(x - 4, y - 2, 2, 2);
      ctx.fillRect(x + 2, y - 2, 2, 2);
    }
  } else if (season === 'winter') {
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 24; i++) ctx.fillRect(ox + ((i * 37) % W), top - 10 + ((i * 13) % 9), 3, 3);
    ctx.strokeStyle = '#FF4F5E';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) ctx.lineTo(ox + x, top + 2 + Math.sin(x / 12) * 3);
    ctx.stroke();
  } else {
    const color = season === 'spring' ? '#FF8FB1' : '#FFD23F';
    for (const [x, y] of corners) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFDF6';
      ctx.fill();
    }
  }
}

function drawEntrance(ctx, e, ox, oy, C, w, h, night) {
  const sky = night ? '#2A2470' : P.ciel;
  switch (e.kind) {
    case 'backdoor': {
      const x = ox + e.x * C;
      box(ctx, x + 9, oy - WALL_TOP + 3, C - 18, WALL_TOP - 6, 4, P.bois, 2);
      ctx.fillStyle = P.or;
      ctx.beginPath();
      ctx.arc(x + C - 15, oy - 12, 2, 0, Math.PI * 2);
      ctx.fill();
      // Paillasson sous la porte de derrière.
      ctx.fillStyle = 'rgba(138,74,38,.25)';
      rr(ctx, x + 8, oy + 2, C - 16, 9, 3);
      ctx.fill();
      break;
    }
    case 'windowLeft':
    case 'windowRight': {
      const left = e.kind === 'windowLeft';
      const x = left ? ox - WALL_SIDE + 2 : ox + w * C + 2;
      const y = oy + e.y * C + 8;
      box(ctx, x, y, WALL_SIDE - 4, C - 16, 2, sky, 1.8);
      ctx.fillStyle = night ? 'rgba(255,243,176,.10)' : 'rgba(143,211,255,.18)';
      const fx = left ? ox : ox + w * C - C;
      ctx.fillRect(fx, oy + e.y * C, C, C);
      break;
    }
    case 'chimney': {
      const x = ox + e.x * C;
      box(ctx, x + 10, oy - WALL_TOP - 8, C - 20, 14, 3, '#BDC6CF', 2);
      break;
    }
    case 'trapdoor': {
      const x = ox + e.x * C;
      const y = oy + e.y * C;
      box(ctx, x + 7, y + 7, C - 14, C - 14, 4, P.boisFonce, 2);
      ctx.strokeStyle = P.encre;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + C / 2, y + 9);
      ctx.lineTo(x + C / 2, y + C - 9);
      ctx.stroke();
      break;
    }
    default:
  }
}

/** Thèmes de boutique (sol + murs, G17). */
export const THEMES = {
  classic: { floorA: P.parquetA, floorB: P.parquetB, wall: P.mur, wallShade: P.murOmbre },
  pastel: { floorA: '#FCE1E4', floorB: '#F6C9D0', wall: '#C9E4FF', wallShade: '#A7CBEF' },
  foret: { floorA: '#CFE3B4', floorB: '#B6D196', wall: '#5E8C61', wallShade: '#466B49' },
  bonbon: { floorA: '#FFE3F1', floorB: '#FFC4E1', wall: '#FFB3D1', wallShade: '#F28DB6' },
  neon: { floorA: '#3B2F66', floorB: '#2E2452', wall: '#2EC4B6', wallShade: '#1E8C82' },
  halloween: { floorA: '#F2A65A', floorB: '#D98940', wall: '#6A4C93', wallShade: '#4F3670' },
  hiver: { floorA: '#EAF4FF', floorB: '#D2E6FA', wall: '#9FD0F0', wallShade: '#7AB4DC' },
  theme_spring: { floorA: '#E9F7D8', floorB: '#D4EFBC', wall: '#FFC9DE', wallShade: '#F2A7C4' },
  theme_summer: { floorA: '#FFF1C2', floorB: '#FFE3A0', wall: '#7FD8FF', wallShade: '#5AB8E6' },
  cal_theme_autumn: { floorA: '#E8B98A', floorB: '#D9A06E', wall: '#B5562F', wallShade: '#8F3F20' },
  week_theme_night: { floorA: '#3A4A7A', floorB: '#2F3D66', wall: '#1A1446', wallShade: '#120E33' },
};

/** Fond derrière la boutique (bandeau du HUD) : ardoise. */
export function drawBackdrop(ctx) {
  ctx.fillStyle = P.ardoise;
  ctx.fillRect(0, 0, 360, 640);
  ctx.fillStyle = shade(P.ardoise, -0.12);
  for (let y = 0; y < 640; y += 22) ctx.fillRect(0, y, 360, 1);
}

/** Case d'emplacement d'achat : carré pointillé doré + anneau de progression (G6.7, G20.6). */
export function drawPad(ctx, x, y, C, progress, pulse) {
  ctx.save();
  ctx.translate(x + C / 2, y + C / 2);
  const s = 1 + Math.sin(pulse * 4) * 0.03;
  ctx.scale(s, s);
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = P.or;
  rr(ctx, -C / 2 + 5, -C / 2 + 5, C - 10, C - 10, 6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,210,63,.18)';
  ctx.fill();
  if (progress > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.lineWidth = 5;
    ctx.strokeStyle = P.orOmbre;
    ctx.stroke();
  }
  ctx.restore();
}
