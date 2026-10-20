// Fort Boutique — textes flottants (plafond 40, B5) : montants, dégâts, petits mots (« RUSH! »).
import { Pool } from '../core/pool.js';
import { PALETTE as P } from '../data/palette.js';
import { stickerText } from './numerals.js';

function make() {
  return { text: '', x: 0, y: 0, t: 0, life: 0.6, color: '', size: 14, rise: 30 };
}

export class Floaters {
  constructor() {
    this.pool = new Pool(make, 40, 16);
  }
  /**
   * @param {string} text
   * @param {number} x pixels
   * @param {number} y
   * @param {{ color?: string, size?: number, life?: number, rise?: number }} [o]
   */
  add(text, x, y, o = {}) {
    const f = this.pool.acquire();
    if (!f) return;
    f.text = text;
    f.x = x;
    f.y = y;
    f.t = 0;
    f.life = o.life || 0.6;
    f.color = o.color || P.or;
    f.size = o.size || 14;
    f.rise = o.rise === undefined ? 30 : o.rise;
  }
  update(dt) {
    const arr = this.pool.active;
    for (let i = arr.length - 1; i >= 0; i--) {
      arr[i].t += dt;
      if (arr[i].t >= arr[i].life) this.pool.releaseAt(i);
    }
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const arr = this.pool.active;
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      const k = f.t / f.life;
      const pop = k < 0.15 ? 0.7 + (k / 0.15) * 0.45 : 1.15 - Math.min(0.15, (k - 0.15) * 0.6);
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      stickerText(ctx, f.text, f.x, f.y - f.rise * k, f.size * pop, f.color);
      ctx.globalAlpha = 1;
    }
  }
  clear() {
    this.pool.releaseAll();
  }
}
