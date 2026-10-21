// Fort Boutique — joystick flottant (B6) : apparaît sous le doigt, zone morte 6 px, rayon 52 px.

export class Joystick {
  /**
   * @param {{ deadZone?: number, radius?: number, decelMs?: number }} [opts]
   */
  constructor({ deadZone = 6, radius = 52, decelMs = 60 } = {}) {
    this.deadZone = deadZone;
    this.radius = radius;
    this.decelMs = decelMs;
    this.active = false;
    this.pointerId = -1;
    this.ox = 0;
    this.oy = 0;
    this.cx = 0;
    this.cy = 0;
    /** Vecteur de sortie, norme ≤ 1. */
    this.vx = 0;
    this.vy = 0;
    this.releaseVx = 0;
    this.releaseVy = 0;
    this.decelLeft = 0;
  }

  /** Pose du doigt. */
  begin(id, x, y) {
    this.active = true;
    this.pointerId = id;
    this.ox = x;
    this.oy = y;
    this.cx = x;
    this.cy = y;
    this.decelLeft = 0;
    this.compute();
  }

  /** Glissement du doigt : au-delà du rayon, le centre suit le doigt. */
  move(x, y) {
    if (!this.active) return;
    this.cx = x;
    this.cy = y;
    const dx = x - this.ox;
    const dy = y - this.oy;
    const len = Math.hypot(dx, dy);
    if (len > this.radius) {
      const k = (len - this.radius) / len;
      this.ox += dx * k;
      this.oy += dy * k;
    }
    this.compute();
  }

  /** Lever du doigt : décélération de 60 ms. */
  end() {
    if (!this.active) return;
    this.active = false;
    this.pointerId = -1;
    this.releaseVx = this.vx;
    this.releaseVy = this.vy;
    this.decelLeft = this.decelMs;
  }

  /** Annule sans décélération (changement d'écran). */
  cancel() {
    this.active = false;
    this.pointerId = -1;
    this.vx = 0;
    this.vy = 0;
    this.decelLeft = 0;
  }

  compute() {
    const dx = this.cx - this.ox;
    const dy = this.cy - this.oy;
    const len = Math.hypot(dx, dy);
    if (len <= this.deadZone) {
      this.vx = 0;
      this.vy = 0;
      return;
    }
    const mag = Math.min(1, (len - this.deadZone) / (this.radius - this.deadZone));
    this.vx = (dx / len) * mag;
    this.vy = (dy / len) * mag;
  }

  /** @param {number} dt secondes */
  update(dt) {
    if (this.active || this.decelLeft <= 0) {
      if (!this.active) {
        this.vx = 0;
        this.vy = 0;
      }
      return;
    }
    this.decelLeft -= dt * 1000;
    const k = Math.max(0, this.decelLeft / this.decelMs);
    this.vx = this.releaseVx * k;
    this.vy = this.releaseVy * k;
  }
}
