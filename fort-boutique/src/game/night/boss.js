// Fort Boutique — les boss de la Pleine Lune (G10.3, G8.9) : capacités pilotées par les données de data/monsters.js.
import { spawnMonster } from './monsters.js';
import { damageFurniture } from './towers.js';
import { distToFurniture } from '../state.js';

/**
 * Comportement par pas d'un boss (appelé par stepMonsters).
 * @param {any} g
 * @param {any} m boss
 * @param {number} dt
 */
export function bossStep(g, m, dt) {
  const def = m.def;
  const n = g.night;
  // Invocations régulières (Roi Raton, Dame Blanche, Reine Phalène).
  if (def.summon && !m.thief) {
    m.summonT -= dt;
    if (m.summonT <= 0) {
      m.summonT = def.summon.every;
      for (let i = 0; i < def.summon.count; i++) {
        const a = (i / def.summon.count) * Math.PI * 2;
        const c = spawnMonster(g, def.summon.type, m.entrance, { x: m.x + Math.cos(a) * 0.35, y: m.y + Math.sin(a) * 0.35, wave: m.wave });
        if (c) {
          c.entering = false;
          c.summoned = true;
        }
      }
      g.events.push('boss_summon', m.x, m.y, def.summon.count, 0, def.summon.type);
    }
  }
  // Grande Pâte : se scinde à 66 % et 33 % de ses PV et lâche 4 gloubis.
  if (def.splitAt) {
    while (m.splitDone < def.splitAt.length && m.hp <= m.maxHp * def.splitAt[m.splitDone]) {
      m.splitDone++;
      for (let i = 0; i < def.splitSpawn.count; i++) {
        const a = (i / def.splitSpawn.count) * Math.PI * 2;
        const c = spawnMonster(g, def.splitSpawn.type, m.entrance, { x: m.x + Math.cos(a) * 0.4, y: m.y + Math.sin(a) * 0.4, wave: m.wave });
        if (c) c.entering = false;
      }
      g.events.push('boss_split', m.x, m.y, m.splitDone);
    }
  }
  // Dame Blanche : disparaît 3 s toutes les 7 s quand elle n'est pas éclairée.
  if (def.vanish) {
    m.vanishT += dt;
    if (m.hidden) {
      if (m.vanishT >= def.vanish.dur) {
        m.hidden = false;
        m.vanishT = 0;
        g.events.push('boss_appear', m.x, m.y);
      }
    } else if (m.vanishT >= def.vanish.every) {
      m.vanishT = 0;
      if (!isLit(g, m)) {
        m.hidden = true;
        g.events.push('boss_vanish', m.x, m.y);
      }
    }
  }
  // Ferrailleur : frappe les meubles voisins (30 dégâts/s).
  if (def.smash) {
    for (const f of g.furn) {
      if (f.broken || f.def.invulnerable) continue;
      if (distToFurniture(f, m.x, m.y) <= def.smash.radius) damageFurniture(g, f, def.smash.dps * dt, 'smash');
    }
  }
  // Reine Phalène : éteint les lanternes à ≤ 2 cases pendant 4 s, toutes les 9 s.
  if (def.douse) {
    m.douseT = (m.douseT || 0) + dt;
    if (m.douseT >= def.douse.every) {
      m.douseT = 0;
      let any = false;
      for (const f of g.furn) {
        if (f.id !== 'lanterne' || f.broken) continue;
        if (Math.hypot(f.cx - m.x, f.cy - m.y) <= def.douse.radius + 0.5) {
          f.doused = def.douse.dur;
          any = true;
        }
      }
      if (any) g.events.push('boss_douse', m.x, m.y);
    }
  }
  void n;
}

/** Le boss est-il dans une lumière (lanterne, marchand) ? */
function isLit(g, m) {
  const lights = g.night.lights || [];
  for (const L of lights) if (Math.hypot(m.x - L.x, m.y - L.y) <= L.r) return true;
  return false;
}

/** Barre de PV du boss (HUD). */
export function bossOf(g) {
  if (!g.night) return null;
  // Boucle simple : appelé à chaque image par le HUD, sans fermeture (B5).
  const arr = g.night.monsters.active;
  for (let i = 0; i < arr.length; i++) if (arr[i].def.boss) return arr[i];
  return null;
}
