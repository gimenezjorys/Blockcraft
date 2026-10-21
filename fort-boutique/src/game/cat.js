// Fort Boutique — Moka, le chat de Mamie (G11.2, niveau 5) : suit le marchand (0,4 s de retard, 0,6 case derrière),
// rapporte le jour le tas de pièces de la caisse à ≤ 3 cases (toutes les 8 s), bondit la nuit sur le Grignotin le plus
// proche à ≤ 2 cases (9 dégâts, 1 fois par seconde, volants compris). Il ne peut pas être blessé.
import { CAT } from '../data/merchant.js';
import { distToFurniture } from './state.js';
import { collectPile } from './day/register.js';
import { dealDamage } from './night/towers.js';

/** Moka est-il là ? (niveau 5 atteint une fois) */
export function catActive(save) {
  return !!(save.player.cat && (save.player.cat.unlocked || save.player.level >= CAT.unlockLevel));
}

/** Dégâts d'un bond : 9 × 1,18^(niveau − 1). */
export function catDamage(level) {
  return CAT.dmg * CAT.dmgPerLevel ** (Math.max(1, level) - 1);
}

/** Portée : 2 cases, +0,1 aux niveaux 4, 7 et 10. */
export function catRange(level) {
  return CAT.range + CAT.rangeAdd * CAT.rangeLevels.filter((l) => level >= l).length;
}

/** Croquettes pour le niveau suivant (null au niveau 10). */
export function catLevelCost(save) {
  const lvl = save.player.cat.level;
  return lvl >= CAT.maxLevel ? null : CAT.kibbleCosts[lvl - 1];
}

/** Monte Moka d'un niveau avec des croquettes. */
export function levelUpCat(save) {
  const cost = catLevelCost(save);
  if (!catActive(save) || cost === null || save.player.kibble < cost) return false;
  save.player.kibble -= cost;
  save.player.cat.level++;
  return true;
}

/**
 * Moka entre en scène (début du jour ou de la nuit). La première fois, il saute sur la caisse (« cat_arrive »).
 * @param {any} g
 */
export function initCat(g) {
  if (!catActive(g.save)) {
    g.cat = null;
    return;
  }
  const c = g.save.player.cat;
  const reg = g.register;
  const first = !c.unlocked;
  c.unlocked = true;
  const x = reg ? reg.cx : g.player.x;
  const y = reg ? reg.cy : g.player.y;
  g.cat = { x, y, hist: [], fetchT: CAT.fetchEveryS, atkT: 0, pounce: null, arriveT: first ? 2 : 0 };
  if (first) g.events.push('cat_arrive', x, y);
}

/** Position du marchand il y a `delay` secondes (historique court). */
function delayed(cat, t, delay) {
  const h = cat.hist;
  for (let i = h.length - 1; i >= 0; i--) if (t - h[i].t >= delay) return h[i];
  return h[0];
}

/** @param {any} g @param {number} dt */
export function stepCat(g, dt) {
  const cat = g.cat;
  if (!cat) return;
  const p = g.player;
  cat.hist.push({ t: g.t, x: p.x, y: p.y });
  while (cat.hist.length > 2 && g.t - cat.hist[1].t > CAT.followDelayS + 0.2) cat.hist.shift();
  if (cat.arriveT > 0) {
    // Arrivée : il s'étire sur la caisse avant de suivre.
    cat.arriveT -= dt;
    return;
  }
  const name = g.phase.name;
  if (name === 'night' && g.night) stepCatNight(g, cat, dt);
  else if ((name === 'day' || name === 'closing') && g.day) stepCatDay(g, cat, dt);
  if (cat.pounce) {
    cat.pounce.t -= dt;
    const k = Math.min(1, dt * 14);
    cat.x += (cat.pounce.x - cat.x) * k;
    cat.y += (cat.pounce.y - cat.y) * k;
    if (cat.pounce.t <= 0) cat.pounce = null;
    return;
  }
  // Suivre : la position du marchand 0,4 s plus tôt, sans s'approcher à moins de 0,6 case.
  const target = delayed(cat, g.t, CAT.followDelayS) || { x: p.x, y: p.y };
  let tx = target.x;
  let ty = target.y;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy);
  if (d < CAT.followOffset) {
    const ux = d > 1e-6 ? dx / d : (cat.x - p.x) / (Math.hypot(cat.x - p.x, cat.y - p.y) || 1);
    const uy = d > 1e-6 ? dy / d : (cat.y - p.y) / (Math.hypot(cat.x - p.x, cat.y - p.y) || 1);
    tx = p.x + ux * CAT.followOffset;
    ty = p.y + uy * CAT.followOffset;
  }
  const k = Math.min(1, dt * 8);
  cat.x += (tx - cat.x) * k;
  cat.y += (ty - cat.y) * k;
}

/** Jour : toutes les 8 s, le tas de pièces de la caisse (à ≤ 3 cases de Moka) revient au marchand. */
function stepCatDay(g, cat, dt) {
  cat.fetchT -= dt;
  if (cat.fetchT > 0) return;
  cat.fetchT = CAT.fetchEveryS;
  const reg = g.register;
  if (!reg || g.day.pile <= 0 || distToFurniture(reg, cat.x, cat.y) > CAT.fetchRadius) return;
  cat.pounce = { x: reg.cx, y: reg.cy, t: 0.35 };
  g.events.push('cat_fetch', reg.cx, reg.cy, g.day.pile);
  collectPile(g, true);
}

/** Nuit : un bond par seconde sur le Grignotin le plus proche (volants compris). */
function stepCatNight(g, cat, dt) {
  cat.atkT -= dt;
  if (cat.atkT > 0) return;
  const level = g.save.player.cat.level;
  const range = catRange(level);
  let best = null;
  let bestD = range;
  for (const m of g.night.monsters.active) {
    if (!m.alive || m.hidden || (m.ghost && !m.visible)) continue;
    const d = Math.hypot(m.x - cat.x, m.y - cat.y);
    if (d <= bestD) {
      bestD = d;
      best = m;
    }
  }
  if (!best) {
    cat.atkT = 0;
    return;
  }
  cat.atkT = 1 / CAT.rate;
  cat.pounce = { x: best.x, y: best.y, t: 0.3 };
  g.events.push('cat_pounce', best.x, best.y, best.id);
  dealDamage(g, best, catDamage(level), 'physical', null);
}
