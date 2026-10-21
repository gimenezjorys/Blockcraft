// Fort Boutique — la boutique : grille, cases réservées, occupation, règles de placement (G6).
import { GRID } from '../data/balance.js';
import { FURNITURE, footprint } from '../data/furniture.js';
import { districtDef, entranceCell } from '../data/districts.js';
import { bfs, neighbors } from './pathfinding.js';

/** @param {number} expansion 0 à 3 @returns {[number, number]} */
export function gridSize(expansion) {
  const e = Math.max(0, Math.min(GRID.sizes.length - 1, expansion | 0));
  return GRID.sizes[e];
}

/** Case de la porte d'entrée des clients (G6.2) : sa colonne ne change jamais. */
export const doorCell = (w, h) => ({ x: 2, y: h - 1 });

/**
 * Entrées de Grignotins d'un quartier, avec leur nuit d'ouverture.
 * @param {string} districtId
 * @param {number} w
 * @param {number} h
 * @returns {Array<{ kind: string, x: number, y: number, ground: boolean, air: boolean, inside?: boolean, overhead?: boolean, fromNight: number }>}
 */
export function districtEntrances(districtId, w, h) {
  const d = districtDef(districtId);
  return Object.entries(d.entrances).map(([kind, fromNight]) => ({ kind, fromNight, ...entranceCell(kind, w, h) }));
}

/**
 * Cases réservées (toujours libres, traversables) : porte, entrées au sol (G6.2).
 * @returns {Map<number, string>} indice -> type
 */
export function reservedCells(districtId, w, h) {
  const m = new Map();
  const door = doorCell(w, h);
  m.set(door.y * w + door.x, 'door');
  for (const e of districtEntrances(districtId, w, h)) {
    if (e.overhead) continue; // la cheminée ne réserve aucune case
    m.set(e.y * w + e.x, e.kind);
  }
  return m;
}

/**
 * Cases occupées par un élément de disposition.
 * @param {{ id: string, x: number, y: number, rot?: number }} item
 * @returns {Array<[number, number]>}
 */
export function itemCells(item) {
  const def = FURNITURE[item.id];
  const [fw, fh] = def ? footprint(def, item.rot || 0) : [1, 1];
  const out = [];
  for (let dy = 0; dy < fh; dy++) for (let dx = 0; dx < fw; dx++) out.push([item.x + dx, item.y + dy]);
  return out;
}

/**
 * Carte d'occupation : indice de l'élément (dans `layout`) ou −1.
 * @param {number} w @param {number} h
 * @param {Array<{ id: string, x: number, y: number, rot?: number }>} layout
 * @returns {{ occ: Int16Array, overlap: number, outOfBounds: number }}
 */
export function occupancy(w, h, layout) {
  const occ = new Int16Array(w * h).fill(-1);
  let overlap = -1;
  let outOfBounds = -1;
  layout.forEach((item, idx) => {
    for (const [x, y] of itemCells(item)) {
      if (x < 0 || y < 0 || x >= w || y >= h) {
        if (outOfBounds < 0) outOfBounds = idx;
        continue;
      }
      const i = y * w + x;
      if (occ[i] >= 0 && overlap < 0) overlap = idx;
      occ[i] = idx;
    }
  });
  return { occ, overlap, outOfBounds };
}

/**
 * Vérifie une disposition (G6.4).
 * @param {string} districtId
 * @param {number} expansion
 * @param {Array<{ id: string, x: number, y: number, rot?: number }>} layout
 * @returns {{ ok: true } | { ok: false, reason: 'bounds' | 'overlap' | 'reserved' | 'register' | 'access' | 'path', item: number }}
 */
export function validateLayout(districtId, expansion, layout) {
  const [w, h] = gridSize(expansion);
  const { occ, overlap, outOfBounds } = occupancy(w, h, layout);
  if (outOfBounds >= 0) return { ok: false, reason: 'bounds', item: outOfBounds };
  if (overlap >= 0) return { ok: false, reason: 'overlap', item: overlap };
  const reserved = reservedCells(districtId, w, h);
  for (const [i] of reserved) if (occ[i] >= 0) return { ok: false, reason: 'reserved', item: occ[i] };
  const regIdx = layout.findIndex((it) => it.id === 'caisse');
  if (regIdx < 0) return { ok: false, reason: 'register', item: -1 };
  const reg = layout[regIdx];
  if (reg.y < h - 2) return { ok: false, reason: 'register', item: regIdx };
  const free = (i) => occ[i] < 0;
  // 1. Chaque meuble « à accès » a une case voisine libre atteignable depuis la porte.
  const door = doorCell(w, h);
  const fromDoor = bfs(w, h, [door.y * w + door.x], free);
  for (let idx = 0; idx < layout.length; idx++) {
    const def = FURNITURE[layout[idx].id];
    if (!def || !def.access) continue;
    if (!hasReachableNeighbor(w, h, layout[idx], fromDoor)) return { ok: false, reason: 'access', item: idx };
  }
  // 2. Depuis chaque entrée au sol (active ou future), un chemin mène à une case voisine de la caisse.
  const targets = registerAccessCells(w, h, reg, occ);
  if (!targets.length) return { ok: false, reason: 'path', item: regIdx };
  const toReg = bfs(w, h, targets, free);
  for (const e of districtEntrances(districtId, w, h)) {
    if (!e.ground) continue;
    if (toReg[e.y * w + e.x] < 0) return { ok: false, reason: 'path', item: -1 };
  }
  return { ok: true };
}

/** Une case voisine libre de l'élément est-elle atteinte par le champ ? */
export function hasReachableNeighbor(w, h, item, field) {
  for (const [x, y] of itemCells(item)) {
    for (const j of neighbors(w, h, y * w + x)) if (field[j] >= 0) return true;
  }
  return false;
}

/** Cases libres voisines de la caisse (cibles des Grignotins et file des clients). */
export function registerAccessCells(w, h, reg, occ) {
  const out = [];
  for (const j of neighbors(w, h, reg.y * w + reg.x)) if (occ[j] < 0) out.push(j);
  return out;
}

/** Origine en pixels logiques de la grille (centrée, mur du haut à 80 px, G6.1). */
export function gridOrigin(w) {
  return { x: (360 - w * GRID.cellPx) / 2, y: GRID.topPx };
}

/**
 * Agrandit une disposition : une ligne en haut (les meubles descendent d'une ligne) (G6.6).
 * @param {Array<{ y: number }>} layout
 */
export function shiftLayoutForExpansion(layout) {
  for (const it of layout) it.y += 1;
  return layout;
}
