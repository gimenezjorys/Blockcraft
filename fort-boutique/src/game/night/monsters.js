// Fort Boutique — Grignotins (G10) : apparition, déplacement (champ de flux ou vol ondulé), spécialités, mort.
import { Pool } from '../../core/pool.js';
import { monsterDef, isAirborne } from '../../data/monsters.js';
import { DISTRICT_FACTORS, districtNumber } from '../../data/balance.js';
import { SCALING } from '../../data/waves.js';
import { NIGHT as NIGHT_RULES } from '../../data/night.js';
import { DIRS } from '../pathfinding.js';
import { distToFurniture } from '../state.js';
import { tickEffects, effectiveSlow, clearEffects } from './effects.js';
import { stealFromJar, escape } from './theft.js';
import { damageFurniture } from './towers.js';

export const MAX_MONSTERS = 120;

function make() {
  return { id: 0, alive: false, type: '', def: null, gnawed: [], hitBy: [] };
}

/** @returns {Pool<any>} */
export function createMonsterPool() {
  return new Pool(make, MAX_MONSTERS, 32);
}

/** Point d'apparition (côté mur) d'une entrée, en cases. */
export function spawnPoint(e, w, h) {
  switch (e.kind) {
    case 'backdoor': return { x: e.x + 0.5, y: -0.45 };
    case 'windowLeft': return { x: -0.45, y: e.y + 0.5 };
    case 'windowRight': return { x: w + 0.45, y: e.y + 0.5 };
    case 'chimney': return { x: e.x + 0.5, y: -0.9 };
    case 'trapdoor': return { x: e.x + 0.5, y: e.y + 0.5 };
    default: return { x: e.x + 0.5, y: e.y + 0.5 };
  }
}

/** PV d'un Grignotin (G10.2) ; boss : base × 1,35^(s − 1). */
export function scaledHp(def, districtId, k, s, extraMult = 1) {
  if (def.boss) return def.hp * Math.pow(SCALING.hpPerWeek, s - 1) * extraMult;
  const M = DISTRICT_FACTORS.hp[districtId] || 1;
  return def.hp * M * (1 + SCALING.hpPerNight * (k - 1)) * Math.pow(SCALING.hpPerWeek, s - 1) * extraMult;
}

/** Butin (G10.2) : base × (1 + 0,6 (Q − 1)) × (1 + 0,1 (s − 1)). */
export function scaledLoot(def, districtId, s) {
  const Q = districtNumber(districtId);
  return Math.max(1, Math.round(def.loot * (1 + SCALING.lootPerDistrict * (Q - 1)) * (1 + SCALING.lootPerWeek * (s - 1))));
}

/**
 * Fait apparaître un Grignotin à une entrée (ou à une position donnée).
 * @param {any} g
 * @param {string} type
 * @param {string} entranceKind
 * @param {{ x?: number, y?: number, scriptedThief?: boolean, wave?: number }} [o]
 */
export function spawnMonster(g, type, entranceKind, o = {}) {
  const n = g.night;
  const m = n.monsters.acquire();
  if (!m) return null;
  const def = monsterDef(type);
  const e = g.grid.entrances.find((x) => x.kind === entranceKind) || g.grid.entrances[0];
  const sp = spawnPoint(e, g.grid.w, g.grid.h);
  m.id = ++n.nextId;
  m.alive = true;
  m.type = type;
  m.def = def;
  m.x = o.x ?? sp.x;
  m.y = o.y ?? sp.y;
  m.spawnX = sp.x;
  m.spawnY = sp.y;
  m.entrance = e.kind;
  m.exitKind = e.kind === 'trapdoor' ? null : e.kind;
  m.entering = o.x === undefined && e.kind !== 'trapdoor';
  m.maxHp = scaledHp(def, g.shopId, n.k, n.s, n.hpMult || 1);
  m.hp = m.maxHp;
  m.armor = def.armor || 0;
  m.flying = isAirborne(def);
  m.ghost = !!def.ghost;
  m.thief = false;
  m.carry = 0;
  m.lampsSeen = null;
  m.cell = -1;
  m.next = -1;
  m.progress = 0;
  m.hitT = 0;
  m.knock = 0;
  m.wave = o.wave ?? n.waveIndex;
  m.scriptedThief = !!o.scriptedThief;
  // Voleur scénarisé de la nuit 1 : les meubles ne le visent jamais, seul le balai du marchand le rattrape.
  m.shielded = false;
  m.towerShield = !!o.scriptedThief;
  // Jamais plus de PV que le Grignotin normal (une souris vedette reste une souris).
  if (m.scriptedThief) m.hp = m.maxHp = Math.min(m.maxHp, NIGHT_RULES.scriptedThiefHp);
  m.reacted = false;
  m.speedBoost = 1;
  m.speedBoostActive = false;
  m.slowedByScript = false;
  m.stoleAt = 0;
  m.walkT = 0;
  m.phase = g.rng.next() * 6.28;
  m.gnawed.length = 0;
  m.gnawT = 0;
  m.gnawTarget = -1;
  m.teleT = def.teleport ? def.teleport.every : 0;
  m.teleWarn = 0;
  m.cellsWalked = 0;
  m.summonT = def.summon ? def.summon.every : 0;
  m.visible = !m.ghost;
  m.lampTarget = -1;
  m.dir = 1;
  m.dirX = 0;
  m.dirY = 1;
  m.splitDone = 0;
  m.vanishT = 0;
  m.hidden = false;
  clearEffects(m);
  n.spawned++;
  if (!g.save.collections.seenMonsters.includes(type) && !def.child) g.save.collections.seenMonsters.push(type);
  g.events.push(def.boss ? 'boss_enter' : 'monster_spawn', m.x, m.y, m.id, 0, type);
  return m;
}

/** Vitesse effective (cases/s). */
function speedOf(g, m) {
  if (m.stunT > 0 || m.gnawT > 0) return 0;
  let v = m.def.speed;
  if (m.thief) v = m.def.fleeSpeed ? m.def.fleeSpeed : v * (m.scriptedThief ? NIGHT_RULES.scriptedThiefFlee : SCALING.thiefSpeed);
  if (m.slowedByScript) v *= 0.5;
  if (m.speedBoostActive) v *= m.speedBoost || 1;
  v *= 1 - effectiveSlow(m);
  v *= g.night.speedMult || 1;
  if (!m.def.boss) v *= g.night.monsterSpeed || 1;
  return v;
}

/** Champ suivi : vers la caisse, ou vers la sortie pour un voleur. */
function fieldFor(g, m) {
  if (!m.thief) return g.fields.toRegister;
  if (!m.exitKind) m.exitKind = nearestExit(g, m);
  return g.fields.toEntrance[m.exitKind] || g.fields.toRegister;
}

/** Sortie au sol la plus proche (voleur venu par la trappe). */
function nearestExit(g, m) {
  const { w } = g.grid;
  const ci = Math.floor(m.y) * w + Math.floor(m.x);
  let best = null;
  let bestD = 1e9;
  const open = g.night.openExits;
  for (const e of g.grid.entrances) {
    if (!e.ground || e.kind === 'trapdoor') continue;
    if (open && !open.includes(e.kind)) continue;
    const f = g.fields.toEntrance[e.kind];
    const d = f && f[ci] >= 0 ? f[ci] : 1e6;
    if (d < bestD) {
      bestD = d;
      best = e.kind;
    }
  }
  return best || 'backdoor';
}

function cellCenter(w, i) {
  return [(i % w) + 0.5, ((i / w) | 0) + 0.5];
}

/** Choisit la case suivante en descendant le champ (départages fixes). */
function chooseNext(g, field, ci) {
  const { w, h } = g.grid;
  const x = ci % w;
  const y = (ci / w) | 0;
  const d = field[ci];
  let best = -1;
  let bestD = d < 0 ? 1e9 : d;
  for (let k = 0; k < 4; k++) {
    const nx = x + DIRS[k][0];
    const ny = y + DIRS[k][1];
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    const j = ny * w + nx;
    if (field[j] >= 0 && field[j] < bestD) {
      bestD = field[j];
      best = j;
    }
  }
  return best;
}

/** Déplacement au sol. */
function walkGround(g, m, dt) {
  const { w, h } = g.grid;
  const v = speedOf(g, m);
  if (m.entering) {
    const e = g.grid.entrances.find((x) => x.kind === m.entrance);
    const tx = e.x + 0.5;
    const ty = e.y + 0.5;
    const dx = tx - m.x;
    const dy = ty - m.y;
    const dd = Math.hypot(dx, dy);
    if (dd <= v * dt || dd < 0.01) {
      m.x = tx;
      m.y = ty;
      m.entering = false;
    } else {
      m.x += (dx / dd) * v * dt;
      m.y += (dy / dd) * v * dt;
      m.dirX = dx / dd;
      m.dirY = dy / dd;
    }
    return;
  }
  const field = fieldFor(g, m);
  const cx = Math.max(0, Math.min(w - 1, Math.floor(m.x)));
  const cy = Math.max(0, Math.min(h - 1, Math.floor(m.y)));
  const ci = cy * w + cx;
  if (m.cell !== ci) {
    m.cell = ci;
    m.cellsWalked++;
    onEnterCell(g, m, ci);
  }
  const dHere = field[ci];
  if (dHere === 0) {
    if (!m.thief) {
      // Case voisine de la caisse atteinte : au centre de la case, puis vol.
      const [tx, ty] = cellCenter(w, ci);
      const dx = tx - m.x;
      const dy = ty - m.y;
      const dd = Math.hypot(dx, dy);
      if (dd > 0.05) {
        const s = Math.min(dd, v * dt);
        m.x += (dx / dd) * s;
        m.y += (dy / dd) * s;
        return;
      }
      stealFromJar(g, m);
      return;
    }
    // Voleur à sa sortie : il passe le mur.
    const e = g.grid.entrances.find((x) => x.kind === m.exitKind);
    if (!e || e.kind === 'trapdoor') {
      escape(g, m);
      return;
    }
    const sp = spawnPoint(e, w, h);
    const ex = sp.x - m.x;
    const ey = sp.y - m.y;
    const ed = Math.hypot(ex, ey);
    if (ed <= Math.max(0.08, v * dt)) escape(g, m);
    else {
      m.x += (ex / ed) * v * dt;
      m.y += (ey / ed) * v * dt;
    }
    return;
  }
  if (m.next < 0 || field[m.next] < 0 || field[m.next] >= (dHere < 0 ? 1e9 : dHere) + 1) {
    m.next = chooseNext(g, field, ci);
  }
  if (m.next < 0) return;
  const [tx, ty] = cellCenter(w, m.next);
  const dx = tx - m.x;
  const dy = ty - m.y;
  const dd = Math.hypot(dx, dy);
  const step = v * dt;
  if (dd <= step) {
    m.x = tx;
    m.y = ty;
    m.next = -1;
  } else if (dd > 0) {
    m.x += (dx / dd) * step;
    m.y += (dy / dd) * step;
    m.dirX = dx / dd;
    m.dirY = dy / dd;
  }
  if (Math.abs(dx) > 0.05) m.dir = dx > 0 ? 1 : -1;
  m.progress = (m.thief ? 1000 + (200 - Math.max(0, dHere)) : 200 - Math.max(0, dHere)) - dd;
}

/** Vol droit avec une légère ondulation (volants et fantômes, G6.3). */
function walkAir(g, m, dt) {
  const v = speedOf(g, m);
  let tx;
  let ty;
  // Phalènes : attirées par les lanternes ; Reine Phalène (M20) : les visite une à une avant la caisse.
  const lamp = m.def.lampDps ? targetLamp(g, m) : m.def.lampHunt && !m.thief ? targetLamp(g, m, m.lampsSeen) : null;
  if (m.thief) {
    tx = m.spawnX;
    ty = m.spawnY;
  } else if (lamp) {
    tx = lamp.cx;
    ty = lamp.cy;
  } else if (g.register) {
    tx = g.register.cx;
    ty = g.register.cy;
  } else return;
  const dx = tx - m.x;
  const dy = ty - m.y;
  const dd = Math.hypot(dx, dy);
  if (!m.thief && lamp && dd < 0.7) {
    if (m.def.lampHunt) {
      if (!m.lampsSeen) m.lampsSeen = new Set();
      m.lampsSeen.add(lamp);
      lamp.doused = m.def.lampHunt.dur;
      g.events.push('boss_douse', lamp.cx, lamp.cy);
      return;
    }
    damageFurniture(g, lamp, m.def.lampDps * dt, 'lamp');
    return;
  }
  if (!m.thief && !lamp && dd < 0.75) {
    stealFromJar(g, m);
    return;
  }
  if (m.thief && dd < 0.1) {
    escape(g, m);
    return;
  }
  if (dd > 0) {
    const ux = dx / dd;
    const uy = dy / dd;
    const wob = Math.sin(g.t * 4 + m.phase) * 0.6;
    m.x += (ux + -uy * wob * 0.35) * v * dt;
    m.y += (uy + ux * wob * 0.35) * v * dt;
    m.dirX = ux;
    m.dirY = uy;
    if (Math.abs(ux) > 0.1) m.dir = ux > 0 ? 1 : -1;
  }
  m.progress = m.thief ? 1000 + 200 - dd * 3 : 200 - dd * 3;
}

/** Lanterne intacte la plus proche (phalènes, G10.1). */
function targetLamp(g, m, skip = null) {
  let best = null;
  let bestD = 1e9;
  for (const f of g.furn) {
    if (f.id !== 'lanterne' || f.broken || f.doused > 0 || (skip && skip.has(f))) continue;
    const d = Math.hypot(f.cx - m.x, f.cy - m.y);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

/** Entrée dans une case : termites qui rongent, champiboums qui explosent. */
function onEnterCell(g, m, ci) {
  const { w, h, occ } = g.grid;
  if (m.def.gnaw && !m.thief) {
    const x = ci % w;
    const y = (ci / w) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + DIRS[k][0];
      const ny = y + DIRS[k][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const o = occ[ny * w + nx];
      if (o < 0) continue;
      const f = g.furn[o];
      if (f.broken || f.def.invulnerable || m.gnawed.includes(o)) continue;
      m.gnawed.push(o);
      m.gnawTarget = o;
      m.gnawT = m.def.gnaw.stop;
      g.events.push('gnaw', f.cx, f.cy, f.idx);
      break;
    }
  }
  if (m.def.explode && m.cellsWalked > 1) {
    const x = ci % w;
    const y = (ci / w) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + DIRS[k][0];
      const ny = y + DIRS[k][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const o = occ[ny * w + nx];
      if (o >= 0 && !g.furn[o].broken && !g.furn[o].def.invulnerable) {
        explode(g, m);
        return;
      }
    }
  }
}

/** Champiboum : 40 dégâts aux meubles à ≤ 1 case, étourdit le marchand 0,8 s s'il est à ≤ 1 case. */
export function explode(g, m) {
  const ex = m.def.explode;
  for (const f of g.furn) {
    if (f.broken || f.def.invulnerable) continue;
    if (distToFurniture(f, m.x, m.y) <= ex.radius) damageFurniture(g, f, ex.dmg, 'explode');
  }
  if (Math.hypot(g.player.x - m.x, g.player.y - m.y) <= ex.radius) g.player.stunT = Math.max(g.player.stunT, ex.stunMerchant);
  g.events.push('explode', m.x, m.y, m.id);
  removeMonster(g, m, false);
}

/** Pas de mise à jour de tous les Grignotins. */
export function stepMonsters(g, dt) {
  const n = g.night;
  const arr = n.monsters.active;
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    if (!m.alive) continue;
    if (m.hitT > 0) m.hitT -= dt;
    const dot = tickEffects(m, dt);
    if (dot > 0) hurtRaw(g, m, dot, 'burn', null);
    if (!m.alive) continue;
    if (m.gnawT > 0) {
      m.gnawT -= dt;
      const f = g.furn[m.gnawTarget];
      if (f && !f.broken) damageFurniture(g, f, m.def.gnaw.dps * dt, 'gnaw');
    }
    if (m.def.teleport && !m.thief && m.stunT <= 0) stepTeleport(g, m, dt);
    if (m.def.boss && n.bossStep) n.bossStep(g, m, dt);
    if (!m.alive) continue;
    if (m.flying || m.ghost) walkAir(g, m, dt);
    else walkGround(g, m, dt);
    m.walkT += dt;
  }
}

/** Lutin : toutes les 4 s, saute 2 cases plus loin sur son chemin (signalé 0,5 s avant). */
function stepTeleport(g, m, dt) {
  const tp = m.def.teleport;
  m.teleT -= dt;
  if (m.teleT <= tp.warn && m.teleWarn === 0) {
    m.teleWarn = 1;
    g.events.push('tele_warn', m.x, m.y, m.id);
  }
  if (m.teleT > 0) return;
  m.teleT = tp.every;
  m.teleWarn = 0;
  const { w } = g.grid;
  const field = g.fields.toRegister;
  let ci = Math.floor(m.y) * w + Math.floor(m.x);
  for (let s = 0; s < tp.cells; s++) {
    if (field[ci] <= 0) break;
    const nx = chooseNext(g, field, ci);
    if (nx < 0) break;
    ci = nx;
  }
  const ox = m.x;
  const oy = m.y;
  m.x = (ci % w) + 0.5;
  m.y = ((ci / w) | 0) + 0.5;
  m.next = -1;
  g.events.push('teleport', ox, oy, m.id, 0, `${m.x},${m.y}`);
}

/**
 * Inflige des dégâts déjà calculés (armure appliquée). Gère la mort.
 * @returns {number} dégâts réellement retirés
 */
export function hurtRaw(g, m, amount, element, source) {
  if (!m.alive || amount <= 0) return 0;
  const before = m.hp;
  m.hp -= amount;
  m.hitT = 0.06;
  if (m.hp <= 0) kill(g, m, source);
  return Math.min(before, amount);
}

/** Mort d'un Grignotin : « pouf », butin, sac rendu au Bocal (+10 %), division du gloubi. */
export function kill(g, m, source) {
  const n = g.night;
  if (!m.alive) return;
  m.hp = 0;
  const loot = scaledLoot(m.def, g.shopId, n.s) * (n.lootMult || 1) * ((n.lootType && n.lootType[m.type]) || 1);
  n.loot += Math.round(loot);
  n.kills++;
  n.killsByType[m.type] = (n.killsByType[m.type] || 0) + 1;
  // Bestiaire et statistiques : crédités par claimNight (une seule fois), jamais pendant la nuit,
  // sinon une nuit rejouée après rechargement compterait deux fois ses victimes (G5.2, G14.4).
  if (m.thief && m.carry > 0) recoverBag(g, m);
  if (m.golden) n.goldenKilled = true;
  if (m.def.golden) n.goldenKilled = true;
  n.bellCharge = Math.min(n.bellNeed, n.bellCharge + 1);
  g.events.push('kill', m.x, m.y, Math.round(loot), m.def.boss ? 1 : 0, m.type);
  if (m.def.split) {
    for (let i = 0; i < m.def.split.count; i++) {
      const c = spawnMonster(g, m.def.split.into, m.entrance, { x: m.x + (i ? 0.2 : -0.2), y: m.y });
      if (c) {
        c.entering = false;
        c.wave = m.wave;
      }
    }
  }
  if (m.def.boss) n.bossKilled = true;
  if (m.def.boss && n.onBossDeath) n.onBossDeath(g, m, source);
  removeMonster(g, m, true);
}

/** Le sac du voleur retombe : les pièces retournent au Bocal avec +10 % (G8.4). */
export function recoverBag(g, m) {
  const n = g.night;
  const back = Math.round(m.carry * SCALING.recoverBonus);
  n.jar += back;
  n.caught++;
  n.caughtWave[m.wave] = (n.caughtWave[m.wave] || 0) + 1;
  g.events.push('thief_caught', m.x, m.y, back);
  m.carry = 0;
}

/** Retire le Grignotin de la réserve. */
export function removeMonster(g, m, killed) {
  m.alive = false;
  const arr = g.night.monsters.active;
  const i = arr.indexOf(m);
  if (i >= 0) g.night.monsters.releaseAt(i);
  void killed;
}

/** Grignotins vivants. */
export function aliveCount(g) {
  return g.night ? g.night.monsters.active.length : 0;
}
