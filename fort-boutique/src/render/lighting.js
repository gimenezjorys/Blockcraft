// Fort Boutique — éclairage nocturne à demi-résolution (G20.5) : voile de nuit, découpes des lumières,
// rais de lune depuis les fenêtres. Un seul dégradé radial, pré-rendu une fois (aucune allocation par image).
import { PALETTE as P } from '../data/palette.js';

const C = 48;

export class Lighting {
  /** @param {(w: number, h: number) => HTMLCanvasElement} makeCanvas */
  constructor(makeCanvas) {
    this.makeCanvas = makeCanvas;
    this.layer = null;
    this.ps = 0;
    this.blob = null;
    /** Mode économie : éclairage simplifié. */
    this.simple = false;
  }

  ensure(ps) {
    const half = Math.max(0.5, ps / 2);
    if (this.layer && Math.abs(this.ps - half) < 0.01) return;
    this.ps = half;
    this.layer = this.makeCanvas(Math.ceil(360 * half), Math.ceil(640 * half));
    if (!this.blob) {
      this.blob = this.makeCanvas(64, 64);
      const b = this.blob.getContext('2d');
      const grad = b.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.55, 'rgba(0,0,0,.85)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      b.fillStyle = grad;
      b.fillRect(0, 0, 64, 64);
    }
  }

  /**
   * Compose le voile sur la scène.
   * @param {CanvasRenderingContext2D} ctx scène (coordonnées logiques)
   * @param {any} g
   * @param {{ alpha: number, ps: number, lights: Array<{ x: number, y: number, r: number, kind: string }>, tint?: string, flashes?: Array<{ x: number, y: number, r: number }> }} o
   */
  draw(ctx, g, o) {
    if (o.alpha <= 0.01) return;
    this.ensure(o.ps);
    const c = this.layer.getContext('2d');
    const k = this.ps;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, this.layer.width, this.layer.height);
    c.setTransform(k, 0, 0, k, 0, 0);
    c.globalAlpha = o.alpha;
    c.fillStyle = o.tint || P.voileNuit;
    c.fillRect(0, 0, 360, 640);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'destination-out';
    const ox = g.grid.origin.x;
    const oy = g.grid.origin.y;
    for (const L of o.lights) {
      const r = L.r * C * (this.simple ? 0.9 : 1.15);
      c.globalAlpha = L.kind === 'merchant' ? 0.85 : 0.95;
      c.drawImage(this.blob, ox + L.x * C - r, oy + L.y * C - r, r * 2, r * 2);
    }
    if (o.flashes) {
      c.globalAlpha = 0.6;
      for (const f of o.flashes) {
        const r = f.r * C;
        c.drawImage(this.blob, ox + f.x * C - r, oy + f.y * C - r, r * 2, r * 2);
      }
    }
    if (!this.simple) {
      // Rais de lune : trapèzes depuis les fenêtres.
      c.globalAlpha = 0.35;
      c.fillStyle = '#000';
      for (const e of g.grid.entrances) {
        if (e.kind !== 'windowLeft' && e.kind !== 'windowRight') continue;
        const left = e.kind === 'windowLeft';
        const wx = left ? ox : ox + g.grid.w * C;
        const wy = oy + e.y * C;
        const dir = left ? 1 : -1;
        c.beginPath();
        c.moveTo(wx, wy + 8);
        c.lineTo(wx, wy + C - 8);
        c.lineTo(wx + dir * C * 2.2, wy + C * 1.9);
        c.lineTo(wx + dir * C * 2.6, wy + C * 0.9);
        c.closePath();
        c.fill();
      }
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.layer, 0, 0, 360, 640);
  }
}
