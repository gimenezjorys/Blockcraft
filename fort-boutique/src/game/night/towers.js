// Fort Boutique — meubles de nuit (G9.5) : un comportement paramétré par les données, aucun code par meuble.
import { nightStats } from '../stats.js';
import { computeFields, distToFurniture } from '../state.js';
import { NIGHT } from '../../data/night.js';
import { applySlow, applyStun, applyBurn, applyTag, applyPoison, armorReduce, damageMultiplier, knockbackAmount } from './effects.js';
import { hurtRaw } from './monsters.js';
import { fireBullet, fireLob } from './projectiles.js';

/** Prépare les formes de nuit (PV, cadence, minuteries). @param {any} g */
export function initTowers(g) {
  for (const f of g.furn) {
    const s = nightStats(f.def, f.level);
    f.n = s;
    f.maxHp = s.hp;
    f.hp = s.hp;
    f.broken = false;
    f.cd = g.rng.next() * 0.6;
    f.t2 = f.def.night.every || f.def.night.swallowEvery || f.def.night.stunEvery || 0;
    f.beamTarget = null;
    f.beamMult = 1;
    f.repairT = 0;
    f.doused = 0;
    f.flash = 0;
    f.recoil = 0;
    f.target = null;
    f.firing = 0;
    f.attack = shot(f);
  }
}

/** Un Grignotin peut-il être visé par ce meuble ? */
export function canTarget(f, m) {
  if (!m.alive || m.hidden || m.shielded || m.towerShield) return false;
  if (m.ghost && !m.visible) return false;
  if ((m.flying || m.ghost) && !f.def.air) return false;
  return true;
}

/** Distance utile (portée mesurée depuis le centre d'une case du meuble). */
export const reach = (f, m) => distToFurniture(f, m.x, m.y) + 0.5;

/**
 * Cible : le plus avancé (défaut) ou le plus proche (plante, marteau-pilon).
 * @param {any} g @param {any} f @param {number} range
 * @param {any[]} [exclude]
 */
export function pickTarget(g, f, range, exclude) {
  const nearest = f.def.target === 'nearest';
  let best = null;
  let bestScore = -1e9;
  const arr = g.night.monsters.active;
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    if (!canTarget(f, m) || (exclude && exclude.includes(m))) continue;
    const d = reach(f, m);
    if (d > range) continue;
    const score = nearest ? -d : m.progress;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/** Bonus de cadence : aura du marchand (+35 % + Sifflet) et machine à café (+30 %, non cumulable). */
function rateMultiplier(g, f) {
  const n = g.night;
  let k = 1;
  if (distToFurniture(f, g.player.x, g.player.y) <= n.auraRadius) k += n.auraBonus;
  for (const c of g.furn) {
    if (c === f || c.broken || c.def.night.behavior !== 'auraBuff') continue;
    if (Math.hypot(c.cx - f.cx, c.cy - f.cy) <= c.def.night.radius + 0.5) {
      k += c.def.night.rateBonus;
      break;
    }
  }
  return k;
}

/**
 * Dégâts d'un meuble ou du marchand sur un Grignotin (multiplicateurs puis armure).
 * @returns {number} dégâts infligés
 */
export function dealDamage(g, m, base, element, source) {
  if (!m.alive || base <= 0) return 0;
  const n = g.night;
  const bonus = { bestiary: n.bestiaryBonus[m.type] || 0, assist: source && source.def ? n.assist : 0 };
  const dmg = armorReduce(base * (n.dmgMult || 1) * damageMultiplier(m, element, bonus), m.armor, element);
  const done = hurtRaw(g, m, dmg, element, source);
  if (done > 0) {
    g.events.push(m.armor > 0 && !['fire', 'burn', 'poison', 'light'].includes(element) ? 'hit_armor' : 'hit', m.x, m.y, Math.round(done), done > m.maxHp * NIGHT.bigHitRatio ? 1 : 0);
    if (!n.firstHit.includes(m.type)) n.firstHit.push(m.type);
  }
  return done;
}

/** Applique les effets secondaires portés par une attaque. */
export function applyOnHit(g, m, a) {
  if (!m.alive) return;
  if (a.slow) applySlow(m, a.slow, a.slowDur, a.element);
  if (a.burn) applyBurn(m, a.burn, a.burnDur);
  if (a.poison) applyPoison(m, a.poison, a.poisonDur);
  if (a.tag) applyTag(m, a.tag, a.tagDur);
  if (a.stun) applyStun(m, a.stun);
}

/** Abîme un meuble ; à 0 PV il est cassé (fumée, franchissable, G8.6). */
export function damageFurniture(g, f, amount, cause) {
  if (f.broken || f.def.invulnerable || !(f.maxHp > 0)) return;
  f.hp -= amount;
  f.flash = 0.08;
  if (f.hp <= 0) {
    f.hp = 0;
    f.broken = true;
    f.repairT = 0;
    f.beamTarget = null;
    g.night.brokenCount++;
    computeFields(g);
    g.events.push('broken', f.cx, f.cy, f.idx, 0, cause);
  }
}

/** Effets mis à l'échelle par le niveau (ralentissements, durées, poison : +5 %/niveau, max ×1,45). */
function scaled(f, v) {
  return v ? v * f.n.effect : 0;
}

function shot(f) {
  const nd = f.def.night;
  return {
    dmg: f.n.dmg,
    element: nd.element || 'physical',
    slow: scaled(f, nd.slow),
    slowDur: nd.slowDur ? nd.slowDur * f.n.effect : 0,
    poison: scaled(f, nd.poison),
    poisonDur: nd.poisonDur || 0,
    tag: nd.tag || 0,
    tagDur: nd.tagDur ? nd.tagDur * f.n.effect : 0,
    radius: nd.radius || 0,
    sprite: nd.projectile || 'can',
    speed: nd.speed || 8,
  };
}

/** Pas de simulation des meubles. @param {any} g @param {number} dt */
export function stepTowers(g, dt) {
  for (const f of g.furn) {
    if (f.flash > 0) f.flash -= dt;
    if (f.recoil > 0) f.recoil = Math.max(0, f.recoil - dt * 12);
    if (f.firing > 0) f.firing -= dt;
    if (f.doused > 0) f.doused -= dt;
    if (f.broken) continue;
    const nd = f.def.night;
    const rate = f.n.rate * rateMultiplier(g, f);
    switch (nd.behavior) {
      case 'projectile':
      case 'multiShot':
      case 'homingBounce': {
        f.cd -= dt * (rate / Math.max(1e-6, f.n.rate));
        if (f.cd > 0) break;
        const t = pickTarget(g, f, f.n.range);
        if (!t) {
          f.cd = 0;
          break;
        }
        const a = f.attack;
        if (nd.behavior === 'multiShot') {
          const chosen = [t];
          for (let k = 1; k < nd.targets; k++) {
            const o = pickTarget(g, f, f.n.range, chosen);
            if (o) chosen.push(o);
          }
          for (const m of chosen) fireBullet(g, f, m, a);
        } else {
          fireBullet(g, f, t, a, nd.behavior === 'homingBounce' ? { bounces: nd.bounces, falloff: nd.falloff } : null);
        }
        aim(f, t);
        f.cd += 1 / f.n.rate;
        break;
      }
      case 'lob': {
        f.cd -= dt * (rate / Math.max(1e-6, f.n.rate));
        if (f.cd > 0) break;
        const t = pickTarget(g, f, f.n.range);
        if (!t) {
          f.cd = 0;
          break;
        }
        fireLob(g, f, t, f.attack);
        aim(f, t);
        f.cd += 1 / f.n.rate;
        break;
      }
      case 'melee': {
        f.t2 -= dt;
        const t = pickTarget(g, f, f.n.range);
        if (t && f.t2 <= 0 && !t.def.boss && t.hp <= t.maxHp * nd.swallowBelow) {
          f.t2 = nd.swallowEvery;
          aim(f, t);
          g.events.push('chomp', t.x, t.y, f.idx, 1);
          dealDamage(g, t, t.hp + 1e6, 'swallow', f);
          break;
        }
        f.cd -= dt * (rate / Math.max(1e-6, f.n.rate));
        if (f.cd > 0) break;
        if (!t) {
          f.cd = 0;
          break;
        }
        aim(f, t);
        dealDamage(g, t, f.n.dmg, 'physical', f);
        g.events.push('chomp', t.x, t.y, f.idx, 0);
        f.cd += 1 / f.n.rate;
        break;
      }
      case 'light': {
        f.cd -= dt * (rate / Math.max(1e-6, f.n.rate));
        if (f.cd > 0 || f.doused > 0) break;
        const t = pickTarget(g, f, f.n.range);
        if (!t) {
          f.cd = 0;
          break;
        }
        aim(f, t);
        dealDamage(g, t, f.n.dmg, 'light', f);
        g.events.push('zap', t.x, t.y, f.idx, 0, `${f.cx},${f.cy}`);
        f.cd += 1 / f.n.rate;
        break;
      }
      case 'beamRamp': {
        const keep = f.beamTarget && canTarget(f, f.beamTarget) && reach(f, f.beamTarget) <= f.n.range ? f.beamTarget : null;
        const t = keep || pickTarget(g, f, f.n.range);
        if (t !== f.beamTarget) f.beamMult = 1;
        f.beamTarget = t;
        if (!t) break;
        aim(f, t);
        f.firing = 0.1;
        f.beamMult = Math.min(nd.rampMax, f.beamMult + nd.rampPerS * dt);
        dealDamage(g, t, f.n.dps * f.beamMult * dt * rateMultiplier(g, f), 'light', f);
        break;
      }
      case 'cone':
        stepCone(g, f, dt, rate);
        break;
      case 'pulse':
      case 'stunPulse': {
        f.t2 -= dt * (rateMultiplier(g, f));
        if (f.t2 > 0) break;
        let any = false;
        const arr = g.night.monsters.active;
        for (let i = arr.length - 1; i >= 0; i--) {
          const m = arr[i];
          if (!m.alive || (m.ghost && !m.visible) || m.flying || m.ghost) continue;
          if (reach(f, m) > f.n.range) continue;
          any = true;
          dealDamage(g, m, f.n.dmg, 'physical', f);
          if (nd.knockback) knockback(g, m, f, nd.knockback);
          if (nd.stun) applyStun(m, nd.stun * f.n.effect);
        }
        if (any) {
          f.t2 = nd.every;
          f.firing = 0.25;
          g.events.push(nd.behavior === 'pulse' ? 'swirl' : 'stomp', f.cx, f.cy, f.idx);
        } else f.t2 = 0;
        break;
      }
      case 'pierceLine':
        stepPierce(g, f, dt, rate);
        break;
      case 'push':
        stepPush(g, f, dt);
        break;
      default:
    }
  }
  stepAuras(g, dt);
}

/** Les yeux suivent la cible (G20.4). */
function aim(f, m) {
  const dx = m.x - f.cx;
  const dy = m.y - f.cy;
  const l = Math.hypot(dx, dy) || 1;
  f.lookX = dx / l;
  f.lookY = dy / l;
  f.target = m;
  f.recoil = 1;
}

/** Direction de tir des meubles orientables (rot : 0 bas, 1 gauche, 2 haut, 3 droite). */
export function facing(rot) {
  return [[0, 1], [-1, 0], [0, -1], [1, 0]][((rot % 4) + 4) % 4];
}

function frontPoint(f) {
  const [dx, dy] = facing(f.rot);
  return { x: f.cx + (dx * f.w) / 2, y: f.cy + (dy * f.h) / 2, dx, dy };
}

/** Lance-flammes : cône de 90°, ticks continus + brûlure (G9.4). */
function stepCone(g, f, dt, rate) {
  const nd = f.def.night;
  const fp = frontPoint(f);
  const half = (nd.angle * Math.PI) / 360;
  const len = f.n.range;
  let inCone = 0;
  const arr = g.night.monsters.active;
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    if (!canTarget(f, m)) continue;
    const vx = m.x - fp.x;
    const vy = m.y - fp.y;
    const d = Math.hypot(vx, vy);
    if (d > len || d < 1e-6) continue;
    if (Math.acos((vx * fp.dx + vy * fp.dy) / d) <= half) inCone++;
  }
  if (!inCone) {
    f.cd = 0;
    return;
  }
  f.firing = 0.15;
  // Le four n'a pas de cadence propre (5 ticks/s) : seules l'aura et la machine à café l'accélèrent (M16 : correction,
  // l'ancienne formule divisait par une cadence nulle et le four ne tirait qu'une fois).
  f.cd -= dt * rateMultiplier(g, f);
  if (f.cd > 0) return;
  f.cd += 1 / nd.ticks;
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    if (!canTarget(f, m)) continue;
    const vx = m.x - fp.x;
    const vy = m.y - fp.y;
    const d = Math.hypot(vx, vy);
    if (d > len || d < 1e-6 || Math.acos((vx * fp.dx + vy * fp.dy) / d) > half) continue;
    dealDamage(g, m, f.n.dmg, 'fire', f);
    applyBurn(m, nd.burn * f.n.effect, nd.burnDur);
  }
  g.events.push('flame', fp.x, fp.y, f.idx);
}

/** Cloueuse : tir perçant en ligne sur 4 cases (G9.4). */
function stepPierce(g, f, dt, rate) {
  const nd = f.def.night;
  f.cd -= dt * (rate / Math.max(1e-6, f.n.rate));
  if (f.cd > 0) return;
  const fp = frontPoint(f);
  const hits = [];
  const arr = g.night.monsters.active;
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    if (!canTarget(f, m)) continue;
    const vx = m.x - fp.x;
    const vy = m.y - fp.y;
    const along = vx * fp.dx + vy * fp.dy;
    const across = Math.abs(vx * fp.dy - vy * fp.dx);
    if (along >= -0.2 && along <= f.n.range && across <= 0.5) hits.push(m);
  }
  if (!hits.length) {
    f.cd = 0;
    return;
  }
  f.cd += 1 / f.n.rate;
  f.firing = 0.12;
  for (const m of hits) dealDamage(g, m, f.n.dmg, 'physical', f);
  g.events.push('nail', fp.x, fp.y, f.idx, 0, `${fp.dx},${fp.dy}`);
}

/** Bourrasque : repousse d'une case les Grignotins d'un couloir de 3 cases, + 4 dégâts ; boss immunisés. */
function stepPush(g, f, dt) {
  const nd = f.def.night;
  f.t2 -= dt * rateMultiplier(g, f);
  if (f.t2 > 0) return;
  const fp = frontPoint(f);
  let any = false;
  const arr = g.night.monsters.active;
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    if (!canTarget(f, m)) continue;
    const vx = m.x - fp.x;
    const vy = m.y - fp.y;
    const along = vx * fp.dx + vy * fp.dy;
    if (along < -0.2 || along > nd.length || Math.abs(vx * fp.dy - vy * fp.dx) > 0.5) continue;
    any = true;
    dealDamage(g, m, f.n.dmg, 'physical', f);
    if (!m.def.boss) pushAlong(g, m, fp.dx, fp.dy, nd.push);
  }
  if (any) {
    f.t2 = nd.every;
    f.firing = 0.3;
    g.events.push('gust', fp.x, fp.y, f.idx, 0, `${fp.dx},${fp.dy}`);
  } else f.t2 = 0;
}

/** Recul le long de la direction (sans entrer dans un meuble intact). */
export function pushAlong(g, m, dx, dy, cells) {
  const { w, h } = g.grid;
  const steps = Math.ceil(cells / 0.25);
  for (let s = 0; s < steps; s++) {
    const nx = m.x + (dx * cells) / steps;
    const ny = m.y + (dy * cells) / steps;
    if (!(m.flying || m.ghost)) {
      if (nx < 0.05 || ny < 0.05 || nx > w - 0.05 || ny > h - 0.05) break;
      if (g.solid(Math.floor(nx), Math.floor(ny))) break;
    }
    m.x = nx;
    m.y = ny;
  }
  m.next = -1;
}

/** Recul du Tourbillon : loin du meuble. */
function knockback(g, m, f, cells) {
  const k = knockbackAmount(m, cells);
  if (k <= 0) return;
  const dx = m.x - f.cx;
  const dy = m.y - f.cy;
  const l = Math.hypot(dx, dy) || 1;
  pushAlong(g, m, dx / l, dy / l, k);
}

/** Auras de ralentissement (aimant sur le métal, horloge) et étourdissement périodique de l'horloge. */
function stepAuras(g, dt) {
  const arr = g.night.monsters.active;
  for (let i = 0; i < arr.length; i++) arr[i].auraSlow = 0;
  for (const f of g.furn) {
    const nd = f.def.night;
    if (f.broken || nd.behavior !== 'auraSlow') continue;
    const slow = nd.slow * f.n.effect;
    let stunNow = false;
    if (nd.stunEvery) {
      f.t2 -= dt;
      if (f.t2 <= 0) {
        f.t2 = nd.stunEvery;
        stunNow = true;
      }
    }
    let any = false;
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i];
      if (!m.alive || (nd.onlyMetal && !m.def.metal)) continue;
      if (Math.hypot(m.x - f.cx, m.y - f.cy) > nd.radius + 0.5) continue;
      any = true;
      const a = m.def.boss ? slow * 0.5 : slow;
      if (a > m.auraSlow) m.auraSlow = a;
      if (stunNow) applyStun(m, nd.stun);
    }
    if (stunNow && any) g.events.push('tick', f.cx, f.cy, f.idx);
  }
}
