// Fort Boutique — éditeur d'aménagement, logique pure (G6.5) : copie de travail, déplacer, tourner, ranger,
// placer depuis la Réserve, valider ou annuler ; tracés des trajets ; Conseil de Mamie (optimiseur).
import { FURNITURE, footprint } from '../data/furniture.js';
import { validateLayout, gridSize, occupancy, districtEntrances, registerAccessCells, doorCell } from './shop.js';
import { bfs, pathFrom } from './pathfinding.js';
import { pathLengths } from './catalog.js';
import { cloneJson } from '../save/schema.js';

/**
 * Ouvre une session d'édition sur une boutique (copie de travail).
 * @param {any} shop boutique sauvegardée
 * @param {string} districtId
 */
export function openEditor(shop, districtId) {
  const layout = cloneJson(shop.layout);
  const storage = shop.storage.slice();
  const lengths = pathLengths(districtId, shop.expansion, layout);
  return {
    districtId,
    expansion: shop.expansion,
    layout,
    storage,
    origLayout: cloneJson(shop.layout),
    origStorage: shop.storage.slice(),
    origLengths: lengths,
    selected: -1,
    moves: 0,
  };
}

/** Le meuble (indice dans layout) qui occupe la case, ou −1. */
export function itemAt(ed, x, y) {
  for (let i = ed.layout.length - 1; i >= 0; i--) {
    const it = ed.layout[i];
    const [w, h] = footprint(FURNITURE[it.id], it.rot || 0);
    if (x >= it.x && x < it.x + w && y >= it.y && y < it.y + h) return i;
  }
  return -1;
}

/**
 * Teste une disposition hypothétique où l'élément `idx` serait remplacé par `item` (ou ajouté si idx = −1).
 * @returns {{ ok: boolean, reason?: string }}
 */
export function testPlacement(ed, idx, item) {
  const next = ed.layout.slice();
  if (idx >= 0) next[idx] = item;
  else next.push(item);
  return validateLayout(ed.districtId, ed.expansion, next);
}

/** Déplace un meuble ; refuse un placement invalide (il reste où il était). */
export function moveItem(ed, idx, x, y) {
  const it = ed.layout[idx];
  if (!it) return { ok: false, reason: 'none' };
  if (it.x === x && it.y === y) return { ok: true, same: true };
  const cand = { ...it, x, y };
  const r = testPlacement(ed, idx, cand);
  if (!r.ok) return r;
  ed.layout[idx] = cand;
  ed.moves++;
  return { ok: true };
}

/** Tourne de 90° (meubles 2 × 1 et orientables). */
export function rotateItem(ed, idx) {
  const it = ed.layout[idx];
  if (!it) return { ok: false, reason: 'none' };
  const def = FURNITURE[it.id];
  const turns = def.orientable || def.size[0] !== def.size[1];
  if (!turns) return { ok: false, reason: 'fixed' };
  for (let k = 1; k <= 4; k++) {
    const rot = ((it.rot || 0) + k) % 4;
    if (!def.orientable && rot % 2 === (it.rot || 0) % 2) continue;
    const cand = { ...it, rot };
    if (testPlacement(ed, idx, cand).ok) {
      ed.layout[idx] = cand;
      ed.moves++;
      return { ok: true, rot };
    }
  }
  return { ok: false, reason: 'blocked' };
}

/** Range un meuble dans la Réserve (jamais la caisse, gratuit, G9.1). */
export function storeItem(ed, idx) {
  const it = ed.layout[idx];
  if (!it || it.id === 'caisse') return { ok: false, reason: 'register' };
  const next = ed.layout.filter((_, i) => i !== idx);
  const r = validateLayout(ed.districtId, ed.expansion, next);
  if (!r.ok) return r;
  ed.layout = next;
  ed.storage.push(it.id);
  ed.selected = -1;
  ed.moves++;
  return { ok: true };
}

/** Pose un meuble de la Réserve. */
export function placeFromStorage(ed, storageIdx, x, y, rot = 0) {
  const id = ed.storage[storageIdx];
  if (!id) return { ok: false, reason: 'none' };
  const item = { id, x, y, rot };
  const r = testPlacement(ed, -1, item);
  if (!r.ok) return r;
  ed.layout.push(item);
  ed.storage.splice(storageIdx, 1);
  ed.moves++;
  return { ok: true, idx: ed.layout.length - 1 };
}

/** Valide : la boutique reprend la copie de travail. */
export function commitEditor(ed, shop) {
  if (!validateLayout(ed.districtId, ed.expansion, ed.layout).ok) return false;
  // On garde les stocks et produits des meubles déplacés (même objet logique).
  shop.layout = cloneJson(ed.layout);
  shop.storage = ed.storage.slice();
  return true;
}

/** Longueurs actuelles et flèches par rapport à l'ouverture de l'éditeur. */
export function editorLengths(ed) {
  const L = pathLengths(ed.districtId, ed.expansion, ed.layout);
  return {
    monsters: L.monsters,
    customers: L.customers,
    monstersDelta: L.monsters - ed.origLengths.monsters,
    customersDelta: L.customers - ed.origLengths.customers,
  };
}

/**
 * Tracés des trajets (listes de cases) pour l'affichage : Grignotins depuis chaque entrée au sol, clients depuis la porte.
 * @returns {{ monsters: number[][], customers: number[][], w: number, h: number }}
 */
export function pathPolylines(ed) {
  const [w, h] = gridSize(ed.expansion);
  const { occ } = occupancy(w, h, ed.layout);
  const free = (i) => occ[i] < 0;
  const monsters = [];
  const reg = ed.layout.find((it) => it.id === 'caisse');
  if (reg) {
    const toReg = bfs(w, h, registerAccessCells(w, h, reg, occ), free);
    for (const e of districtEntrances(ed.districtId, w, h)) {
      if (!e.ground) continue;
      const p = pathFrom(toReg, w, h, e.y * w + e.x);
      if (p.length) monsters.push(p);
    }
  }
  const customers = [];
  const door = doorCell(w, h);
  const toDoor = bfs(w, h, [door.y * w + door.x], free);
  for (const it of ed.layout) {
    const def = FURNITURE[it.id];
    if (!def || !def.access || it.id === 'caisse') continue;
    let best = -1;
    let bestD = 1e9;
    const [fw, fh] = footprint(def, it.rot || 0);
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        for (const [ox, oy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const x = it.x + dx + ox;
          const y = it.y + dy + oy;
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const d = toDoor[y * w + x];
          if (d >= 0 && d < bestD) {
            bestD = d;
            best = y * w + x;
          }
        }
      }
    }
    if (best >= 0) customers.push(pathFrom(toDoor, w, h, best).reverse());
  }
  return { monsters, customers, w, h };
}

/**
 * Conseil de Mamie (G6.5) : escalade qui maximise le trajet moyen des Grignotins en gardant
 * celui des clients ≤ +30 % de la disposition de départ. Renvoie la meilleure disposition trouvée
 * et le premier déplacement conseillé (pour la main fantôme de G19 6:50).
 * @param {string} districtId
 * @param {number} expansion
 * @param {any[]} layout
 * @param {{ maxMoves?: number }} [o]
 */
export function mamieAdvice(districtId, expansion, layout, o = {}) {
  const [w, h] = gridSize(expansion);
  const start = pathLengths(districtId, expansion, layout);
  const limit = start.customers * 1.3 + 1e-9;
  let cur = cloneJson(layout);
  let curL = start;
  const moves = [];
  const maxMoves = o.maxMoves ?? 6;
  for (let step = 0; step < maxMoves; step++) {
    let best = null;
    for (let i = 0; i < cur.length; i++) {
      const it = cur[i];
      if (it.id === 'caisse') continue;
      const def = FURNITURE[it.id];
      const rots = def.orientable ? [0, 1, 2, 3] : def.size[0] !== def.size[1] ? [0, 1] : [it.rot || 0];
      for (const rot of rots) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (x === it.x && y === it.y && rot === (it.rot || 0)) continue;
            const next = cur.slice();
            next[i] = { ...it, x, y, rot };
            if (!validateLayout(districtId, expansion, next).ok) continue;
            const L = pathLengths(districtId, expansion, next);
            if (L.customers > limit) continue;
            const gain = L.monsters - curL.monsters;
            if (gain > 1e-9 && (!best || gain > best.gain)) best = { gain, layout: next, L, move: { idx: i, from: { x: it.x, y: it.y }, to: { x, y }, rot } };
          }
        }
      }
    }
    if (!best) break;
    cur = best.layout;
    curL = best.L;
    moves.push(best.move);
  }
  return { layout: cur, lengths: curL, start, moves, gain: curL.monsters - start.monsters };
}

/**
 * Change le produit exposé d'une étagère (G7.6 : « modifiable dans l'éditeur »). L'étagère redémarre vide avec
 * son nouveau produit (les articles posés sont retirés : c'est du stock, aucune pièce n'est perdue).
 * @param {any} ed
 * @param {number} idx
 * @param {string | null} product null = l'étagère prendra le premier article posé
 * @returns {{ ok: boolean, reason?: string }}
 */
export function setShelfProduct(ed, idx, product) {
  const it = ed.layout[idx];
  if (!it || FURNITURE[it.id].day.kind !== 'shelf') return { ok: false, reason: 'notShelf' };
  if ((it.product || null) === product) return { ok: true, same: true };
  it.product = product;
  it.count = 0;
  ed.moves++;
  return { ok: true };
}

/** Produits proposés pour une étagère : « au choix » puis ceux du quartier. */
export function shelfProductChoices(districtProducts) {
  return [null, ...districtProducts];
}
