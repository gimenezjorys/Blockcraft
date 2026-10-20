// Fort Boutique — projectiles en réserve (plafond 200, B5) : tirs à tête chercheuse, tirs en cloche, rebonds.
import { Pool } from '../../core/pool.js';
import { dealDamage, applyOnHit, canTarget } from './towers.js';

export const MAX_PROJECTILES = 200;

function make() {
  return {
    kind: '', x: 0, y: 0, x0: 0, y0: 0, tx: 0, ty: 0, target: null, targetId: 0, speed: 8, t: 0, flight: 0,
    a: null, src: null, bounces: 0, falloff: 0, hit: [], sprite: '', air: true, alive: false,
  };
}

/** @returns {Pool<any>} */
export function createProjectilePool() {
  return new Pool(make, MAX_PROJECTILES, 48);
}

/**
 * Tir à tête chercheuse (une cible).
 * @param {any} g @param {any} f meuble @param {any} m cible
 * @param {any} a attaque (dmg, element, effets…)
 * @param {{ bounces: number, falloff: number } | null} [bounce]
 */
export function fireBullet(g, f, m, a, bounce) {
  const p = g.night.projectiles.acquire();
  if (!p) return null;
  p.alive = true;
  p.kind = bounce ? 'bounce' : 'bullet';
  p.x = f.cx;
  p.y = f.cy - 0.3;
  p.x0 = p.x;
  p.y0 = p.y;
  p.target = m;
  p.targetId = m.id;
  p.tx = m.x;
  p.ty = m.y;
  p.speed = a.speed || 8;
  p.t = 0;
  p.a = a;
  p.src = f;
  p.bounces = bounce ? bounce.bounces : 0;
  p.falloff = bounce ? bounce.falloff : 0;
  p.hit.length = 0;
  p.sprite = a.sprite;
  p.air = f.def.air;
  g.events.push('shot', f.cx, f.cy, f.idx, 0, a.sprite);
  return p;
}

/**
 * Tir en cloche vers la position actuelle de la cible (zone au sol).
 */
export function fireLob(g, f, m, a) {
  const p = g.night.projectiles.acquire();
  if (!p) return null;
  p.alive = true;
  p.kind = 'lob';
  p.x = f.cx;
  p.y = f.cy - 0.3;
  p.x0 = p.x;
  p.y0 = p.y;
  // Légère anticipation : là où sera la cible à mi-vol.
  const d = Math.hypot(m.x - p.x, m.y - p.y);
  const flight = Math.max(0.25, d / (a.speed || 6));
  p.tx = m.x + (m.dirX || 0) * m.def.speed * flight * 0.5;
  p.ty = m.y + (m.dirY || 0) * m.def.speed * flight * 0.5;
  p.flight = flight;
  p.t = 0;
  p.a = a;
  p.src = f;
  p.target = null;
  p.sprite = a.sprite;
  g.events.push('lob', f.cx, f.cy, f.idx, 0, a.sprite);
  return p;
}

/** Zone d'impact d'un tir en cloche. */
function splash(g, p) {
  const a = p.a;
  const arr = g.night.monsters.active;
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    if (!m.alive || m.flying || m.ghost || m.hidden || m.towerShield) continue;
    if (Math.hypot(m.x - p.tx, m.y - p.ty) > a.radius) continue;
    if (a.dmg > 0) dealDamage(g, m, a.dmg, a.element, p.src);
    applyOnHit(g, m, a);
  }
  g.events.push('splat', p.tx, p.ty, Math.round(a.radius * 100), 0, p.sprite);
}

/** Cible suivante d'un rebond (la plus proche, pas encore touchée). */
function nextBounceTarget(g, p, from) {
  let best = null;
  let bestD = 2.5;
  const arr = g.night.monsters.active;
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    if (m === from || p.hit.includes(m.id) || !canTarget(p.src, m)) continue;
    const d = Math.hypot(m.x - from.x, m.y - from.y);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

/** @param {any} g @param {number} dt */
export function stepProjectiles(g, dt) {
  const pool = g.night.projectiles;
  const arr = pool.active;
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i];
    p.t += dt;
    if (p.kind === 'lob') {
      const k = Math.min(1, p.t / p.flight);
      p.x = p.x0 + (p.tx - p.x0) * k;
      p.y = p.y0 + (p.ty - p.y0) * k;
      p.h = Math.sin(k * Math.PI) * (0.6 + p.flight * 0.6);
      if (k >= 1) {
        splash(g, p);
        p.alive = false;
        pool.releaseAt(i);
      }
      continue;
    }
    const tgt = p.target && p.target.alive && p.target.id === p.targetId ? p.target : null;
    if (tgt) {
      p.tx = tgt.x;
      p.ty = tgt.y;
    }
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= Math.max(step, 0.22)) {
      if (tgt) {
        const dmg = p.a.dmg * Math.pow(1 - p.falloff, p.hit.length);
        dealDamage(g, tgt, dmg, p.a.element, p.src);
        applyOnHit(g, tgt, p.a);
        p.hit.push(tgt.id);
        if (p.kind === 'bounce' && p.hit.length <= p.bounces) {
          const nx = nextBounceTarget(g, p, tgt);
          if (nx) {
            p.target = nx;
            p.targetId = nx.id;
            continue;
          }
        }
      }
      p.alive = false;
      pool.releaseAt(i);
      continue;
    }
    p.x += (dx / d) * step;
    p.y += (dy / d) * step;
    if (p.t > 3) {
      p.alive = false;
      pool.releaseAt(i);
    }
  }
}
