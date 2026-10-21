// Fort Boutique — état de jeu d'exécution : construit depuis la sauvegarde, sans DOM (G24).
import { EventQueue } from '../core/events.js';
import { Rng, seedFrom } from '../core/rng.js';
import { FURNITURE, footprint } from '../data/furniture.js';
import { districtDef } from '../data/districts.js';
import { gridSize, reservedCells, doorCell, districtEntrances, gridOrigin, registerAccessCells } from './shop.js';
import { bfs, neighbors } from './pathfinding.js';
import { createPlayer } from './player.js';

/** Niveau global d'un meuble (G9.1), créé à la demande. */
export function furnState(save, id) {
  if (!save.furniture[id]) save.furniture[id] = { level: 1, plans: 0 };
  return save.furniture[id];
}

/**
 * Instance d'exécution d'un meuble posé.
 * @param {object} g
 * @param {{ id: string, x: number, y: number, rot?: number }} item élément de disposition (sauvegardé)
 * @param {number} idx
 */
function makeFurniture(g, item, idx) {
  const def = FURNITURE[item.id];
  const rot = item.rot || 0;
  const [w, h] = footprint(def, rot);
  return {
    idx,
    id: item.id,
    def,
    item,
    x: item.x,
    y: item.y,
    w,
    h,
    rot,
    cx: item.x + w / 2,
    cy: item.y + h / 2,
    level: furnState(g.save, item.id).level,
    // Jour
    stock: Number.isFinite(item.stock) ? item.stock : 0,
    prodT: 0,
    product: typeof item.product === 'string' ? item.product : null,
    count: Number.isFinite(item.count) ? item.count : 0,
    access: -1,
    // Nuit
    hp: 0,
    maxHp: 0,
    broken: false,
    cd: 0,
    t2: 0,
    target: null,
    eyes: 0,
    lookX: 0,
    lookY: 1,
    recoil: 0,
    repairT: 0,
    beamMult: 1,
    flash: 0,
    jump: 0,
  };
}

/**
 * Crée une partie à partir d'une sauvegarde déjà remise en état.
 * @param {{ save: any }} opts
 */
export function createGame({ save }) {
  const shopId = save.currentShop;
  const g = {
    save,
    shopId,
    shop: save.shops[shopId],
    district: districtDef(shopId),
    rng: new Rng(seedFrom(save.seed, 'session', save.stats.cycles, shopId)),
    events: new EventQueue(1024),
    t: 0,
    input: { x: 0, y: 0, bell: 0 },
    grid: null,
    furn: [],
    register: null,
    player: createPlayer(2.5, 4.5),
    phase: { name: 'free', t: 0 },
    day: null,
    night: null,
    layoutVersion: 0,
    fields: null,
    /** Fonction réutilisée (aucune fermeture créée par image). */
    solid: null,
  };
  g.solid = (cx, cy) => {
    const i = cy * g.grid.w + cx;
    const o = g.grid.occ[i];
    return o >= 0 && !g.furn[o].broken;
  };
  rebuildShop(g);
  placePlayerAtStart(g);
  return g;
}

/** Reconstruit la grille et les meubles d'exécution depuis la disposition sauvegardée. */
export function rebuildShop(g) {
  const shop = g.shop;
  const [w, h] = gridSize(shop.expansion);
  const occ = new Int16Array(w * h).fill(-1);
  g.furn = shop.layout.map((item, idx) => makeFurniture(g, item, idx));
  for (const f of g.furn) {
    for (let dy = 0; dy < f.h; dy++) {
      for (let dx = 0; dx < f.w; dx++) {
        const x = f.x + dx;
        const y = f.y + dy;
        if (x >= 0 && y >= 0 && x < w && y < h) occ[y * w + x] = f.idx;
      }
    }
  }
  g.grid = {
    w,
    h,
    n: w * h,
    occ,
    reserved: reservedCells(g.shopId, w, h),
    door: doorCell(w, h),
    entrances: districtEntrances(g.shopId, w, h),
    origin: gridOrigin(w),
  };
  g.register = g.furn.find((f) => f.id === 'caisse') || null;
  g.layoutVersion++;
  computeFields(g);
}

/** Recalcule les champs de flux (changement de disposition, meuble cassé ou réparé). */
export function computeFields(g) {
  const { w, h, occ } = g.grid;
  const passable = (i) => occ[i] < 0 || g.furn[occ[i]].broken;
  const doorIdx = g.grid.door.y * w + g.grid.door.x;
  const fromDoor = bfs(w, h, [doorIdx], passable, g.fields ? g.fields.fromDoor : undefined);
  const regTargets = g.register ? registerAccessCells(w, h, g.register, occOrBroken(g)) : [];
  const toRegister = bfs(w, h, regTargets, passable, g.fields ? g.fields.toRegister : undefined);
  const toEntrance = {};
  for (const e of g.grid.entrances) {
    if (e.overhead) continue;
    toEntrance[e.kind] = bfs(w, h, [e.y * w + e.x], passable);
  }
  g.fields = { fromDoor, toRegister, toEntrance, regTargets, toDoor: bfs(w, h, [doorIdx], passable) };
  // Case d'accès de chaque meuble : la case voisine libre la plus proche de la porte.
  for (const f of g.furn) {
    let best = -1;
    let bestD = 1e9;
    for (let dy = 0; dy < f.h; dy++) {
      for (let dx = 0; dx < f.w; dx++) {
        for (const j of neighbors(w, h, (f.y + dy) * w + (f.x + dx))) {
          const d = fromDoor[j];
          if (d >= 0 && d < bestD) {
            bestD = d;
            best = j;
          }
        }
      }
    }
    f.access = best;
  }
}

function occOrBroken(g) {
  const { occ } = g.grid;
  const out = new Int16Array(occ.length);
  for (let i = 0; i < occ.length; i++) out[i] = occ[i] >= 0 && !g.furn[occ[i]].broken ? occ[i] : -1;
  return out;
}

/** Place le marchand juste au-dessus de la porte, ou sur la case libre la plus proche. */
export function placePlayerAtStart(g) {
  const { door, w } = g.grid;
  const p = g.player;
  const start = (door.y - 1) * w + door.x;
  let best = start;
  if (g.grid.occ[start] >= 0) {
    let bestD = 1e9;
    for (let i = 0; i < g.grid.n; i++) {
      if (g.grid.occ[i] >= 0 || g.fields.fromDoor[i] < 0) continue;
      const d = Math.abs((i % w) - door.x) + Math.abs(((i / w) | 0) - (door.y - 1));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  }
  p.x = (best % w) + 0.5;
  p.y = ((best / w) | 0) + 0.5;
}

/** Repousse le marchand hors d'un meuble qui vient d'apparaître sous lui. */
export function ejectPlayer(g) {
  const p = g.player;
  const { w } = g.grid;
  const i = Math.floor(p.y) * w + Math.floor(p.x);
  if (g.grid.occ[i] < 0) return;
  let best = -1;
  let bestD = 1e9;
  for (let j = 0; j < g.grid.n; j++) {
    if (g.grid.occ[j] >= 0) continue;
    const d = Math.hypot((j % w) + 0.5 - p.x, ((j / w) | 0) + 0.5 - p.y);
    if (d < bestD) {
      bestD = d;
      best = j;
    }
  }
  if (best >= 0) {
    p.x = (best % w) + 0.5;
    p.y = ((best / w) | 0) + 0.5;
  }
}

/** Le meuble occupant une case (ou null). */
export function furnitureAt(g, cx, cy) {
  if (cx < 0 || cy < 0 || cx >= g.grid.w || cy >= g.grid.h) return null;
  const o = g.grid.occ[cy * g.grid.w + cx];
  return o >= 0 ? g.furn[o] : null;
}

/** Distance du point (x, y) au rectangle d'un meuble (en cases). */
export function distToFurniture(f, x, y) {
  const dx = Math.max(f.x - x, 0, x - (f.x + f.w));
  const dy = Math.max(f.y - y, 0, y - (f.y + f.h));
  return Math.sqrt(dx * dx + dy * dy);
}
