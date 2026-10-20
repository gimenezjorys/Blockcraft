// Fort Boutique — Grignotins : ronds, oreilles ou antennes exagérées, une silhouette unique par type (G20.4).
// Dessinés pieds en (0, 0). Les yeux vert acide sont dessinés à part, après le voile de nuit.
import { PALETTE as P } from '../../data/palette.js';
import { fillInk, disc, shadow, rr, box } from './draw.js';

/** Taille (rayon du corps, px) et position des yeux de chaque type. */
export const MONSTER_LOOK = {
  raton: { r: 11, eyeY: -14, eyeDx: 4 },
  souris: { r: 8, eyeY: -10, eyeDx: 3 },
  gloubi: { r: 13, eyeY: -15, eyeDx: 4.5 },
  mini_gloubi: { r: 8, eyeY: -9, eyeDx: 3 },
  termite: { r: 10, eyeY: -12, eyeDx: 3.5 },
  chauvesouris: { r: 9, eyeY: -22, eyeDx: 3, fly: 14 },
  herisson: { r: 12, eyeY: -12, eyeDx: 4 },
  champiboum: { r: 10, eyeY: -9, eyeDx: 3.5 },
  fantome: { r: 12, eyeY: -22, eyeDx: 4, fly: 8 },
  lutin: { r: 10, eyeY: -12, eyeDx: 3.5 },
  gourmand: { r: 17, eyeY: -22, eyeDx: 6 },
  corbeau: { r: 10, eyeY: -24, eyeDx: 3, fly: 14 },
  golem: { r: 16, eyeY: -22, eyeDx: 6 },
  phalene: { r: 9, eyeY: -22, eyeDx: 3, fly: 14 },
  raton_dore: { r: 11, eyeY: -14, eyeDx: 4 },
  roi_raton: { r: 24, eyeY: -32, eyeDx: 9 },
  grande_pate: { r: 28, eyeY: -32, eyeDx: 10 },
  dame_blanche: { r: 24, eyeY: -44, eyeDx: 8, fly: 10 },
  ferrailleur: { r: 26, eyeY: -38, eyeDx: 10 },
  reine_phalene: { r: 22, eyeY: -46, eyeDx: 8, fly: 18 },
};

function ears(ctx, r, color, h = 0.7) {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * r * 0.6, -r * 1.75, r * 0.35, r * h * 0.6, s * 0.3, 0, Math.PI * 2);
    fillInk(ctx, color, 2);
  }
}

function raccoon(ctx, r, body, mask, frame) {
  // Queue rayée.
  ctx.save();
  ctx.rotate(0.4 + frame * 0.15);
  rr(ctx, r * 0.6, -r * 0.9, r * 1.2, r * 0.55, r * 0.27);
  fillInk(ctx, body, 2);
  ctx.fillStyle = mask;
  ctx.fillRect(r * 0.95, -r * 0.9, r * 0.22, r * 0.55);
  ctx.fillRect(r * 1.4, -r * 0.9, r * 0.2, r * 0.55);
  ctx.restore();
  ears(ctx, r, body);
  disc(ctx, 0, -r, r, body, 2.5);
  // Masque.
  rr(ctx, -r * 0.85, -r * 1.45, r * 1.7, r * 0.5, r * 0.25);
  ctx.fillStyle = mask;
  ctx.fill();
  disc(ctx, 0, -r * 0.75, r * 0.18, P.encre, 0);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} type
 * @param {number} frame 0 ou 1 (démarche sautillante)
 * @param {{ thief?: boolean, flash?: boolean, golden?: boolean, dir?: number, isNew?: boolean }} [o]
 */
export function drawMonster(ctx, type, frame, o = {}) {
  const L = MONSTER_LOOK[type] || MONSTER_LOOK.raton;
  const r = L.r;
  const hop = frame ? -2 : 0;
  shadow(ctx, 0, 0, r * 0.9, r * 0.32);
  ctx.save();
  if (o.dir < 0) ctx.scale(-1, 1);
  ctx.translate(0, hop - (L.fly || 0));
  switch (type) {
    case 'raton':
      raccoon(ctx, r, '#8E8E9A', '#3A3445', frame);
      break;
    case 'raton_dore':
      raccoon(ctx, r, P.or, P.orOmbre, frame);
      break;
    case 'roi_raton': {
      raccoon(ctx, r, '#7D7D8C', '#2E2838', frame);
      // Couronne.
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 1.8);
      ctx.lineTo(-r * 0.6, -r * 2.4);
      ctx.lineTo(-r * 0.3, -r * 2.05);
      ctx.lineTo(0, -r * 2.55);
      ctx.lineTo(r * 0.3, -r * 2.05);
      ctx.lineTo(r * 0.6, -r * 2.4);
      ctx.lineTo(r * 0.6, -r * 1.8);
      ctx.closePath();
      fillInk(ctx, P.or, 2.5);
      // Cape.
      rr(ctx, -r * 0.9, -r * 0.6, r * 1.8, r * 0.6, 6);
      fillInk(ctx, P.pomme, 2);
      break;
    }
    case 'souris': {
      ctx.strokeStyle = '#E9A6B5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r * 0.8, -r * 0.4);
      ctx.quadraticCurveTo(r * 2.4, -r * (0.6 + frame * 0.6), r * 2.6, -r * 1.6);
      ctx.stroke();
      for (const s of [-1, 1]) disc(ctx, s * r * 0.75, -r * 1.75, r * 0.55, '#C9C4D6', 2);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.95, r * 1.05, r * 0.9, 0, 0, Math.PI * 2);
      fillInk(ctx, '#C9C4D6', 2.2);
      disc(ctx, 0, -r * 0.7, r * 0.18, '#E9A6B5', 0);
      break;
    }
    case 'gloubi':
    case 'mini_gloubi':
    case 'grande_pate': {
      const col = type === 'grande_pate' ? '#F2D7A6' : '#7BD389';
      ctx.beginPath();
      ctx.moveTo(0, -r * 2);
      ctx.bezierCurveTo(r * 1.3, -r * 1.2, r * 1.3, 0, 0, 0);
      ctx.bezierCurveTo(-r * 1.3, 0, -r * 1.3, -r * 1.2, 0, -r * 2);
      fillInk(ctx, col, 2.5);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.4, -r * 1.3, r * 0.2, r * 0.35, 0.3, 0, Math.PI * 2);
      ctx.fill();
      if (type === 'grande_pate') {
        for (const [dx, dy] of [[-1, -0.2], [1, -0.3], [0.2, -0.05]]) disc(ctx, dx * r * 0.9, dy * r, r * 0.35, col, 2);
      }
      break;
    }
    case 'termite': {
      for (let i = 2; i >= 0; i--) disc(ctx, (i - 1) * r * 0.8, -r * 0.8, r * (0.55 + (i === 0 ? 0.15 : 0)), '#C9733F', 2);
      ctx.strokeStyle = P.encre;
      ctx.lineWidth = 1.6;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, -r * 1.2);
        ctx.quadraticCurveTo(-r * 1.4, -r * 2, -r * (1.2 + s * 0.3), -r * 2.2);
        ctx.stroke();
      }
      break;
    }
    case 'chauvesouris': {
      const flap = frame ? 0.5 : -0.2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(s * r * 2.2, -r * (1.6 + flap));
        ctx.lineTo(s * r * 1.6, -r * 0.7);
        ctx.lineTo(s * r * 1.1, -r * 1.0);
        ctx.closePath();
        fillInk(ctx, '#6A4C93', 2);
      }
      disc(ctx, 0, -r, r * 0.8, '#5A3E80', 2.2);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * r * 0.3, -r * 1.6);
        ctx.lineTo(s * r * 0.7, -r * 2.2);
        ctx.lineTo(s * r * 0.75, -r * 1.4);
        fillInk(ctx, '#5A3E80', 1.6);
      }
      break;
    }
    case 'herisson': {
      ctx.fillStyle = '#6B4A3A';
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.6, -r + Math.sin(a) * r * 0.6);
        ctx.lineTo(Math.cos(a) * r * 1.5, -r + Math.sin(a) * r * 1.5);
        ctx.lineTo(Math.cos(a + 0.25) * r * 0.7, -r + Math.sin(a + 0.25) * r * 0.7);
        fillInk(ctx, '#6B4A3A', 1.5);
      }
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.8, r * 1.1, r * 0.85, 0, 0, Math.PI * 2);
      fillInk(ctx, '#B8895C', 2.2);
      disc(ctx, r * 0.9, -r * 0.6, r * 0.18, P.encre, 0);
      break;
    }
    case 'champiboum': {
      box(ctx, -r * 0.5, -r * 1.1, r, r * 1.1, 4, '#FFFDF6', 2);
      ctx.beginPath();
      ctx.ellipse(0, -r * 1.2, r * 1.3, r * 0.85, 0, Math.PI, 0);
      ctx.closePath();
      fillInk(ctx, P.pomme, 2.2);
      for (const [dx, dy] of [[-0.6, -1.5], [0.3, -1.75], [0.8, -1.35]]) disc(ctx, dx * r, dy * r, r * 0.17, P.blanc, 0);
      break;
    }
    case 'fantome':
    case 'dame_blanche': {
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(-r, -r * 1.3);
      ctx.arc(0, -r * 1.3, r, Math.PI, 0);
      ctx.lineTo(r, 0);
      for (let i = 3; i >= 0; i--) ctx.quadraticCurveTo(-r + (i + 0.5) * (r / 2), -r * (0.25 + frame * 0.15), -r + i * (r / 2), 0);
      ctx.closePath();
      fillInk(ctx, P.fantome, 2.2);
      ctx.globalAlpha = 1;
      if (type === 'dame_blanche') {
        rr(ctx, -r * 1.2, -r * 2.35, r * 2.4, r * 0.45, 5);
        fillInk(ctx, '#E4F6FF', 2);
      }
      break;
    }
    case 'lutin': {
      disc(ctx, 0, -r, r, '#46D39A', 2.4);
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 1.5);
      ctx.lineTo(r * 0.2, -r * 3);
      ctx.lineTo(r * 0.9, -r * 1.5);
      ctx.closePath();
      fillInk(ctx, P.pomme, 2);
      disc(ctx, r * 0.2, -r * 3, r * 0.2, P.or, 1.4);
      break;
    }
    case 'gourmand': {
      disc(ctx, 0, -r, r, '#D9925A', 2.8);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.7, r * 0.6, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ears(ctx, r, '#D9925A', 0.5);
      break;
    }
    case 'corbeau': {
      const flap = frame ? 0.4 : -0.1;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(s * r * 1.5, -r * (1.8 + flap), s * r * 2.2, -r * (1.1 + flap));
        ctx.lineTo(s * r * 0.6, -r * 0.7);
        ctx.closePath();
        fillInk(ctx, '#2B2B3A', 2);
      }
      disc(ctx, 0, -r, r * 0.85, '#3A3A4D', 2.2);
      ctx.beginPath();
      ctx.moveTo(r * 0.7, -r * 1.1);
      ctx.lineTo(r * 1.5, -r * 0.95);
      ctx.lineTo(r * 0.7, -r * 0.8);
      fillInk(ctx, P.or, 1.4);
      break;
    }
    case 'golem':
    case 'ferrailleur': {
      box(ctx, -r, -r * 2, r * 2, r * 2, 6, '#8D99A6', 2.8);
      ctx.fillStyle = '#6B7785';
      ctx.fillRect(-r * 0.8, -r * 1.1, r * 1.6, r * 0.25);
      box(ctx, -r * 1.35, -r * 1.5, r * 0.4, r * 1.1, 3, '#6B7785', 2);
      box(ctx, r * 0.95, -r * 1.5, r * 0.4, r * 1.1, 3, '#6B7785', 2);
      if (type === 'ferrailleur') {
        for (const [dx, dy] of [[-0.6, -1.8], [0.5, -0.4], [0.6, -1.7]]) box(ctx, dx * r - 4, dy * r - 4, 8, 8, 1, '#B86B3C', 1.4);
      }
      break;
    }
    case 'phalene':
    case 'reine_phalene': {
      const flap = frame ? 0.85 : 1;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * r * 1.05, -r * 1.25, r * 1.0 * flap, r * 0.85, s * 0.3, 0, Math.PI * 2);
        fillInk(ctx, type === 'reine_phalene' ? '#C9A0FF' : '#E8D3B0', 2);
        disc(ctx, s * r * 1.1, -r * 1.3, r * 0.3, type === 'reine_phalene' ? P.or : '#B8895C', 0);
      }
      rr(ctx, -r * 0.35, -r * 1.9, r * 0.7, r * 1.4, r * 0.35);
      fillInk(ctx, '#8A6A4A', 2);
      break;
    }
    default:
      disc(ctx, 0, -r, r, '#8E8E9A', 2.4);
  }
  if (o.thief) {
    // Sac sur le dos (G20.6).
    ctx.save();
    ctx.translate(-r * 0.9, -r * 0.9);
    disc(ctx, 0, 0, r * 0.6, P.kraft, 2);
    ctx.fillStyle = P.or;
    ctx.font = `900 ${Math.round(r * 0.7)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¤', 0, 1);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Yeux vert acide qui brillent (dessinés après le voile, G20.4).
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} type
 * @param {number} x pixels
 * @param {number} y pieds
 * @param {number} dir
 * @param {number} frame
 * @param {number} scale
 */
export function drawMonsterEyes(ctx, type, x, y, dir, frame, scale = 1) {
  const L = MONSTER_LOOK[type] || MONSTER_LOOK.raton;
  const hop = frame ? -2 : 0;
  const ey = y + (L.eyeY + hop - (L.fly || 0)) * scale;
  const ex = L.eyeDx * scale;
  ctx.fillStyle = 'rgba(200,255,46,.35)';
  ctx.beginPath();
  ctx.arc(x - ex + dir * 1.2, ey, 3.6 * scale, 0, Math.PI * 2);
  ctx.arc(x + ex + dir * 1.2, ey, 3.6 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.yeuxGrignotins;
  ctx.beginPath();
  ctx.arc(x - ex + dir * 1.2, ey, 2 * scale, 0, Math.PI * 2);
  ctx.arc(x + ex + dir * 1.2, ey, 2 * scale, 0, Math.PI * 2);
  ctx.fill();
}
