// Fort Boutique — le marchand la nuit (G8.7) : aura d'encouragement, coup de balai, réparation, Cloche.
import { NIGHT } from '../../data/night.js';
import { computeFields, distToFurniture } from '../state.js';
import { dealDamage } from './towers.js';
import { applyStun } from './effects.js';

/** Paramètres de nuit du marchand selon ses améliorations (G11.1). */
export function merchantNightStats(up) {
  return {
    auraBonus: NIGHT.auraBonus + NIGHT.auraPerWhistle * (Math.max(1, up.whistle) - 1),
    auraRadius: NIGHT.auraRadius,
    broomDmg: NIGHT.broomDmg * (1 + NIGHT.broomDmgPerLevel * (Math.max(1, up.broom) - 1)),
    repairRate: NIGHT.repairRate * (1 + NIGHT.repairPerLevel * (Math.max(1, up.broom) - 1)),
    bellNeed: Math.max(1, NIGHT.bellKills - (Math.max(1, up.bell) - 1)),
    bellStun: NIGHT.bellStun + NIGHT.bellStunPerLevel * (Math.max(1, up.bell) - 1),
  };
}

/** @param {any} g @param {number} dt */
export function stepMerchantNight(g, dt) {
  const n = g.night;
  const p = g.player;
  // Coup de balai automatique sur le Grignotin le plus proche à ≤ 0,9 case.
  n.broomT -= dt;
  if (n.broomT <= 0 && p.stunT <= 0) {
    let best = null;
    let bestD = NIGHT.broomRange;
    const arr = n.monsters.active;
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i];
      if (!m.alive || m.hidden || (m.ghost && !m.visible) || m.shielded) continue;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d <= bestD) {
        bestD = d;
        best = m;
      }
    }
    if (best) {
      n.broomT = NIGHT.broomEvery;
      g.events.push('broom', best.x, best.y, best.id);
      dealDamage(g, best, n.broomDmg, 'physical', null);
    } else n.broomT = 0;
  }
  // Réparation d'un meuble voisin abîmé ou cassé.
  let target = null;
  let bestD = NIGHT.repairRange;
  for (const f of g.furn) {
    if (f.def.invulnerable || !(f.maxHp > 0) || (!f.broken && f.hp >= f.maxHp)) continue;
    const d = distToFurniture(f, p.x, p.y);
    if (d <= bestD) {
      bestD = d;
      target = f;
    }
  }
  if (target) {
    n.repairTick -= dt;
    if (n.repairTick <= 0) {
      n.repairTick = 0.4;
      g.events.push('repair', target.cx, target.cy, target.idx);
    }
    if (target.broken) {
      target.repairT += dt;
      if (target.repairT >= NIGHT.reviveAfterS) {
        target.broken = false;
        target.hp = target.maxHp * NIGHT.reviveHp;
        target.repairT = 0;
        computeFields(g);
        g.events.push('revived', target.cx, target.cy, target.idx);
      }
    } else {
      target.hp = Math.min(target.maxHp, target.hp + n.repairRate * dt);
    }
  }
  // Cloche (G8.7) : un appui quand elle est chargée.
  if (g.input.bell > 0) {
    g.input.bell = 0;
    ringBell(g);
  }
}

/**
 * Sonne la Cloche : étourdit tous les Grignotins 1,5 s et leur inflige 15 dégâts.
 * @returns {boolean} vrai si la Cloche était chargée
 */
export function ringBell(g) {
  const n = g.night;
  if (!n || n.bellCharge < n.bellNeed) {
    g.events.push('bell_empty');
    return false;
  }
  n.bellCharge = 0;
  n.bellUses++;
  g.events.push('bell', g.player.x, g.player.y);
  const arr = n.monsters.active;
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    if (!m.alive) continue;
    applyStun(m, n.bellStun);
    dealDamage(g, m, NIGHT.bellDmg, 'physical', null);
  }
  return true;
}
