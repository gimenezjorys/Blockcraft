// Fort Boutique — particules en réserve (plafond 400, B5) : pièces qui volent, poussière, étoiles, étincelles, fumée.
import { Pool } from '../core/pool.js';
import { PALETTE as P } from '../data/palette.js';
import { quadBezier } from '../core/math.js';

const MAX = 400;

function make() {
  return { kind: '', x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, size: 3, color: '', x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, rot: 0, onArrive: 0 };
}

export class Particles {
  constructor() {
    this.pool = new Pool(make, MAX, 64);
    this.seed = 7;
    /** Multiplicateur du nombre de particules (mode économie : 0,5). */
    this.density = 1;
    /** Pièces arrivées au compteur depuis la dernière lecture. */
    this.arrived = 0;
  }
  rand() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  /** @returns {ReturnType<typeof make> | null} */
  spawn(kind, x, y) {
    const p = this.pool.acquire();
    if (!p) return null;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.t = 0;
    p.life = 1;
    p.size = 3;
    p.color = P.or;
    p.rot = 0;
    p.onArrive = 0;
    return p;
  }
  /** Pièce qui vole en arc (Bézier, 0,35 s) vers un point (G20.6). */
  coinFlight(x0, y0, x1, y1, delay = 0, value = 1) {
    const p = this.spawn('coin', x0, y0);
    if (!p) return;
    p.x0 = x0;
    p.y0 = y0;
    p.x1 = x1;
    p.y1 = y1;
    p.cx = (x0 + x1) / 2 + (this.rand() - 0.5) * 60;
    p.cy = Math.min(y0, y1) - 40 - this.rand() * 40;
    p.life = 0.35;
    p.t = -delay;
    p.onArrive = value;
  }
  /** Gerbe de n particules. */
  burst(kind, x, y, n, color, speed = 80, life = 0.5, size = 3) {
    const count = Math.max(1, Math.round(n * this.density));
    for (let i = 0; i < count; i++) {
      const p = this.spawn(kind, x, y);
      if (!p) return;
      const a = this.rand() * Math.PI * 2;
      const s = speed * (0.5 + this.rand() * 0.7);
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - speed * 0.3;
      p.life = life * (0.7 + this.rand() * 0.6);
      p.color = color;
      p.size = size * (0.7 + this.rand() * 0.6);
      p.rot = this.rand() * 6;
    }
  }
  /** @param {number} dt */
  update(dt) {
    const arr = this.pool.active;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.t += dt;
      if (p.t < 0) continue;
      if (p.kind === 'coin') {
        const k = Math.min(1, p.t / p.life);
        p.x = quadBezier(p.x0, p.cx, p.x1, k);
        p.y = quadBezier(p.y0, p.cy, p.y1, k);
        if (k >= 1) {
          this.arrived += p.onArrive;
          this.pool.releaseAt(i);
        }
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'dust' || p.kind === 'smoke') {
        p.vx *= 0.92;
        p.vy = p.vy * 0.92 - 6 * dt;
      } else {
        p.vy += 220 * dt;
      }
      p.rot += dt * 6;
      if (p.t >= p.life) this.pool.releaseAt(i);
    }
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const arr = this.pool.active;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      if (p.t < 0) continue;
      const k = 1 - Math.min(1, p.t / p.life);
      if (p.kind === 'coin') {
        ctx.fillStyle = P.or;
        ctx.strokeStyle = P.encre;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        continue;
      }
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = p.color;
      if (p.kind === 'star') {
        star(ctx, p.x, p.y, p.size * 1.6, p.rot);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.kind === 'smoke' || p.kind === 'dust' ? p.size * (1.5 - k * 0.5) : p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  get count() {
    return this.pool.size;
  }
  clear() {
    this.pool.releaseAll();
  }
}

/** Étoile à 5 branches. */
export function star(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
