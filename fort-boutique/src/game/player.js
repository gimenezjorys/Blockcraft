// Fort Boutique — le marchand : déplacement au joystick, collisions avec glissement (G6.3).
import { PLAYER } from '../data/balance.js';

/**
 * @param {number} x centre (cases)
 * @param {number} y
 */
export function createPlayer(x, y) {
  return {
    x,
    y,
    r: PLAYER.radius,
    vx: 0,
    vy: 0,
    facing: 1,
    moving: false,
    walkT: 0,
    /** Pile d'articles (identifiants de produits), du bas vers le haut. */
    stack: [],
    pickT: 0,
    dropT: 0,
    stunT: 0,
  };
}

/** Vitesse du marchand selon le niveau de Baskets (G11.1). */
export function playerSpeed(shoesLevel) {
  return PLAYER.speed + PLAYER.speedPerShoes * (Math.max(1, shoesLevel) - 1);
}

/** Capacité de la pile selon le niveau du Panier (G7.6). */
export function stackCapacity(basketLevel) {
  return Math.min(PLAYER.stackMax, PLAYER.stackBase + PLAYER.stackPerLevel * (Math.max(1, basketLevel) - 1));
}

/**
 * Déplace un cercle dans la grille en glissant le long des cases pleines.
 * @param {{ x: number, y: number, r: number }} p
 * @param {number} dx déplacement voulu (cases)
 * @param {number} dy
 * @param {number} w largeur de la grille
 * @param {number} h hauteur
 * @param {(cx: number, cy: number) => boolean} solid case pleine ?
 */
export function moveCircle(p, dx, dy, w, h, solid) {
  // Sous-pas pour ne jamais traverser une case (vitesse max ≈ 4,2 cases/s, pas de 1/60 s).
  const len = Math.hypot(dx, dy);
  const n = Math.max(1, Math.ceil(len / 0.2));
  for (let s = 0; s < n; s++) {
    p.x += dx / n;
    p.y += dy / n;
    resolve(p, w, h, solid);
  }
}

/** Repousse le cercle hors des cases pleines voisines et dans les murs. */
export function resolve(p, w, h, solid) {
  const r = p.r;
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    const x0 = Math.floor(p.x - r - 1);
    const x1 = Math.floor(p.x + r + 1);
    const y0 = Math.floor(p.y - r - 1);
    const y1 = Math.floor(p.y + r + 1);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (cx >= 0 && cy >= 0 && cx < w && cy < h && !solid(cx, cy)) continue;
        if (cx >= 0 && cy >= 0 && cx < w && cy < h) {
          // Case pleine : point le plus proche du rectangle.
          const qx = Math.max(cx, Math.min(p.x, cx + 1));
          const qy = Math.max(cy, Math.min(p.y, cy + 1));
          let ddx = p.x - qx;
          let ddy = p.y - qy;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 >= r * r) continue;
          if (d2 > 1e-12) {
            const d = Math.sqrt(d2);
            p.x += (ddx / d) * (r - d);
            p.y += (ddy / d) * (r - d);
          } else {
            // Centre dans la case : sortie par le côté le plus proche.
            const left = p.x - cx;
            const right = cx + 1 - p.x;
            const top = p.y - cy;
            const bottom = cy + 1 - p.y;
            const m = Math.min(left, right, top, bottom);
            if (m === left) p.x = cx - r;
            else if (m === right) p.x = cx + 1 + r;
            else if (m === top) p.y = cy - r;
            else p.y = cy + 1 + r;
            ddx = 0;
            ddy = 0;
          }
          moved = true;
        }
      }
    }
    // Murs de la boutique.
    if (p.x < r) { p.x = r; moved = true; }
    if (p.y < r) { p.y = r; moved = true; }
    if (p.x > w - r) { p.x = w - r; moved = true; }
    if (p.y > h - r) { p.y = h - r; moved = true; }
    if (!moved) break;
  }
}

/**
 * Pas de déplacement du marchand.
 * @param {ReturnType<typeof createPlayer>} p
 * @param {number} ix entrée (norme ≤ 1)
 * @param {number} iy
 * @param {number} speed cases/s
 * @param {number} dt
 * @param {number} w @param {number} h
 * @param {(cx: number, cy: number) => boolean} solid
 */
export function stepPlayer(p, ix, iy, speed, dt, w, h, solid) {
  if (p.stunT > 0) {
    p.stunT -= dt;
    ix = 0;
    iy = 0;
  }
  p.vx = ix * speed;
  p.vy = iy * speed;
  const ox = p.x;
  const oy = p.y;
  if (ix || iy) moveCircle(p, p.vx * dt, p.vy * dt, w, h, solid);
  const actual = Math.hypot(p.x - ox, p.y - oy) / Math.max(dt, 1e-6);
  p.moving = actual > 0.15;
  if (p.moving) p.walkT += dt;
  if (Math.abs(ix) > 0.2) p.facing = ix > 0 ? 1 : -1;
}

/** Centre du marchand dans une case ? (emplacements d'achat) */
export function playerCell(p) {
  return { cx: Math.floor(p.x), cy: Math.floor(p.y) };
}
