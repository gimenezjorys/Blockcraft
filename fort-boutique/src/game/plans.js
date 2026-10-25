// Fort Boutique — emplacements prévus (v1.1, V3) : lecture des plans (data/shop-plans.js) et rangement des meubles.
// Logique pure et générique : aucun code propre à un plan. Le moteur lit toujours `shop.layout` ; les emplacements
// ne font que décider où chaque meuble se pose. `shop.slots` (emplacement -> meuble) est recalculé depuis la disposition.
import { SHOP_PLANS, PLAN_IDS, DEFAULT_PLAN, SLOT_CODE } from '../data/shop-plans.js';
import { FURNITURE, footprint } from '../data/furniture.js';
import { districtDef } from '../data/districts.js';
import { gridSize, occupancy, validateLayout, itemCells } from './shop.js';

/** Type d'emplacement d'un meuble : producteur (il fabrique), présentoir (étagère), caisse, sinon défense. */
export function slotTypeOf(id) {
  if (id === 'caisse') return 'caisse';
  const f = FURNITURE[id];
  const k = f && f.day ? f.day.kind : '';
  if (k === 'producer') return 'producteur';
  if (k === 'shelf') return 'presentoir';
  return 'defense';
}

/** Largeur d'un meuble posé à plat (rotation 0). */
const widthOf = (id) => (FURNITURE[id] ? footprint(FURNITURE[id], 0)[0] : 1);

/** Plan choisi d'une boutique (l'Allée par défaut). */
export function shopPlanId(shop) {
  return shop && PLAN_IDS.includes(shop.plan) ? shop.plan : DEFAULT_PLAN;
}

const cache = new Map();

/**
 * Emplacements d'un plan pour une boutique et une taille.
 * @param {string} shopId
 * @param {number} expansion
 * @param {string} planId
 * @returns {{ w: number, h: number, slots: Array<{ id: string, type: string, n: number, x: number, y: number }>,
 *   byType: Record<string, Array<any>>, staff: { cashier: [number, number], clerk: [number, number] } }}
 */
export function planSlots(shopId, expansion, planId) {
  const e = Math.max(0, Math.min(3, expansion | 0));
  const plan = SHOP_PLANS[planId] || SHOP_PLANS[DEFAULT_PLAN];
  const trap = 'trapdoor' in (districtDef(shopId).entrances || {});
  const key = `${planId}:${e}:${trap ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key);
  const [w, h] = gridSize(e);
  const size = plan.sizes[e];
  const rows = (trap && size.trap) || size.map;
  const slots = [];
  rows.forEach((row, y) => {
    row.trim().split(/\s+/).forEach((tok, x) => {
      const type = SLOT_CODE[tok[0]];
      if (!type || x >= w || y >= h) return;
      slots.push({ id: tok, type, n: Number(tok.slice(1)) || 1, x, y });
    });
  });
  const byType = { producteur: [], presentoir: [], defense: [], caisse: [] };
  for (const s of slots) byType[s.type].push(s);
  for (const k of Object.keys(byType)) byType[k].sort((a, b) => a.n - b.n);
  const out = { w, h, slots, byType, staff: size.staff };
  cache.set(key, out);
  return out;
}

/** Emplacement voisin de droite du même type (pour un meuble de 2 cases). */
function rightOf(list, s) {
  return list.find((o) => o.y === s.y && o.x === s.x + 1) || null;
}

/**
 * Premier emplacement libre (ordre de remplissage) où le meuble tient, ou null.
 * @param {Array<any>} list emplacements du type, triés
 * @param {(x: number, y: number) => boolean} isFree
 * @param {string} id
 * @param {{ x: number, y: number } | null} [near] position préférée (le plus proche d'abord)
 */
function pickSlot(list, isFree, id, near = null) {
  const wide = widthOf(id) > 1;
  const fits = (s) => {
    if (!isFree(s.x, s.y)) return false;
    if (!wide) return true;
    const r = rightOf(list, s);
    return !!r && isFree(r.x, r.y);
  };
  let best = null;
  let bd = 1e9;
  for (const s of list) {
    if (!fits(s)) continue;
    if (!near) return s;
    const d = Math.abs(s.x - near.x) + Math.abs(s.y - near.y);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}

/**
 * Range des meubles dans les emplacements d'un plan (même type, ordre de remplissage). Les meubles de 2 cases passent
 * d'abord (il leur faut deux emplacements voisins). Ce qui ne tient pas revient dans `overflow` (pour la Réserve).
 * @param {string} shopId
 * @param {number} expansion
 * @param {string} planId
 * @param {Array<{ id: string, x?: number, y?: number }>} items
 * @param {{ nearest?: boolean }} [opts] nearest : chaque meuble va dans l'emplacement libre le plus proche de sa place
 * @returns {{ layout: Array<{ id: string, x: number, y: number, rot: number }>, overflow: string[] }}
 */
export function arrangeInPlan(shopId, expansion, planId, items, opts = {}) {
  const P = planSlots(shopId, expansion, planId);
  const taken = new Set();
  const isFree = (x, y) => !taken.has(y * P.w + x);
  const layout = [];
  const overflow = [];
  const order = items.map((it, i) => ({ it, i })).sort((a, b) => (widthOf(b.it.id) > 1) - (widthOf(a.it.id) > 1) || a.i - b.i);
  for (const { it } of order) {
    const list = P.byType[slotTypeOf(it.id)];
    const near = opts.nearest && Number.isFinite(it.x) && Number.isFinite(it.y) ? { x: it.x, y: it.y } : null;
    const s = pickSlot(list, isFree, it.id, near);
    if (!s) {
      overflow.push(it.id);
      continue;
    }
    const item = { id: it.id, x: s.x, y: s.y, rot: 0 };
    for (const [x, y] of itemCells(item)) taken.add(y * P.w + x);
    layout.push(item);
  }
  // La caisse d'abord dans la liste (comme les dispositions de départ).
  layout.sort((a, b) => (b.id === 'caisse') - (a.id === 'caisse'));
  return { layout, overflow };
}

/**
 * Où poser un meuble neuf dans la boutique telle qu'elle est : le premier emplacement libre de son type.
 * @param {string} shopId
 * @param {any} shop
 * @param {string} id
 * @returns {{ x: number, y: number, rot: number } | null}
 */
export function nextSlotSpot(shopId, shop, id) {
  const P = planSlots(shopId, shop.expansion, shopPlanId(shop));
  const { occ } = occupancy(P.w, P.h, shop.layout);
  const isFree = (x, y) => x >= 0 && y >= 0 && x < P.w && y < P.h && occ[y * P.w + x] < 0;
  const s = pickSlot(P.byType[slotTypeOf(id)], isFree, id);
  if (!s) return null;
  const spot = { x: s.x, y: s.y, rot: 0 };
  return validateLayout(shopId, shop.expansion, shop.layout.concat([{ id, ...spot }])).ok ? spot : null;
}

/**
 * Emplacement -> meuble, recalculé depuis la disposition (champ `slots` de la sauvegarde, V3).
 * @param {string} shopId
 * @param {any} shop
 */
export function syncSlots(shopId, shop) {
  const P = planSlots(shopId, shop.expansion, shopPlanId(shop));
  const { occ } = occupancy(P.w, P.h, shop.layout);
  const slots = {};
  for (const s of P.slots) {
    const k = occ[s.y * P.w + s.x];
    if (k >= 0) slots[s.id] = shop.layout[k].id;
  }
  shop.slots = slots;
  return slots;
}

/**
 * Range toute la boutique dans un plan (choix d'un plan, agrandissement, migration) : meubles posés d'abord, puis ceux
 * de la Réserve s'il reste de la place ; ce qui ne tient pas va dans la Réserve. Rien n'est perdu ; si le rangement
 * donnait une disposition invalide, la boutique reste telle qu'elle était.
 * @param {string} shopId
 * @param {any} shop
 * @param {string} planId
 * @param {{ nearest?: boolean, expansion?: number, fromStorage?: boolean }} [opts]
 * @returns {boolean}
 */
export function applyPlan(shopId, shop, planId, opts = {}) {
  const expansion = opts.expansion ?? shop.expansion;
  const storage = Array.isArray(shop.storage) ? shop.storage : [];
  const fromStorage = opts.fromStorage !== false;
  const placed = opts.nearest ? shop.layout : layoutInSlotOrder(shopId, shop);
  const items = placed.map((it) => ({ id: it.id, x: it.x, y: it.y })).concat(fromStorage ? storage.map((id) => ({ id })) : []);
  if (!items.some((it) => it.id === 'caisse')) items.unshift({ id: 'caisse' });
  const { layout, overflow } = arrangeInPlan(shopId, expansion, planId, items, opts);
  if (!validateLayout(shopId, expansion, layout).ok) return false;
  shop.layout = layout;
  shop.storage = (fromStorage ? [] : storage.slice()).concat(overflow.filter((id) => id !== 'caisse'));
  shop.plan = planId;
  shop.expansion = expansion;
  syncSlots(shopId, shop);
  return true;
}

/** Ordre des meubles posés par emplacement (pour garder le même ordre d'un plan ou d'une taille à l'autre). */
export function layoutInSlotOrder(shopId, shop) {
  const P = planSlots(shopId, shop.expansion, shopPlanId(shop));
  const rank = new Map(P.slots.map((s) => [`${s.x},${s.y}`, s.n]));
  return shop.layout.slice().sort((a, b) => (rank.get(`${a.x},${a.y}`) ?? 99) - (rank.get(`${b.x},${b.y}`) ?? 99));
}

/**
 * Aperçu d'un plan pour l'écran Plans (V4), sans toucher à la boutique : disposition et Réserve qu'elle aurait.
 * @param {string} shopId
 * @param {any} shop
 * @param {string} planId
 * @returns {{ layout: any[], storage: string[] }}
 */
export function planPreview(shopId, shop, planId) {
  const copy = { ...shop, layout: shop.layout.map((it) => ({ ...it })), storage: (shop.storage || []).slice() };
  if (!applyPlan(shopId, copy, planId)) return { layout: shop.layout.map((it) => ({ ...it })), storage: (shop.storage || []).slice() };
  return { layout: copy.layout, storage: copy.storage };
}

/**
 * Échanger deux meubles (V4.2) : le meuble `index` va sur l'emplacement `slotId` (même type). Si un meuble de même
 * largeur l'occupe, ils échangent leurs places. Rend la nouvelle disposition, ou null si ce n'est pas possible.
 * @param {string} shopId
 * @param {number} expansion
 * @param {string} planId
 * @param {any[]} layout
 * @param {number} index
 * @param {string} slotId
 */
export function moveToSlot(shopId, expansion, planId, layout, index, slotId) {
  const P = planSlots(shopId, expansion, planId);
  const it = layout[index];
  const s = P.slots.find((x) => x.id === slotId);
  if (!it || !s || it.id === 'caisse' || s.type !== slotTypeOf(it.id)) return null;
  const next = layout.map((x) => ({ ...x }));
  const { occ } = occupancy(P.w, P.h, layout);
  const j = occ[s.y * P.w + s.x];
  if (j === index) return null;
  if (j >= 0) {
    const other = next[j];
    if (other.id === 'caisse' || widthOf(other.id) !== widthOf(it.id) || other.x !== s.x || other.y !== s.y) return null;
    [other.x, other.y, next[index].x, next[index].y] = [it.x, it.y, s.x, s.y];
  } else {
    if (widthOf(it.id) > 1) {
      const r = rightOf(P.byType[s.type], s);
      const k = r ? occ[r.y * P.w + r.x] : -2;
      if (!r || (k >= 0 && k !== index)) return null;
    }
    next[index].x = s.x;
    next[index].y = s.y;
  }
  return validateLayout(shopId, expansion, next).ok ? next : null;
}

/**
 * Notes en étoiles (1 à 3) de plusieurs plans d'après leurs trajets : le meilleur 3, le moins bon 1 (égalité : même note).
 * @param {number[]} values
 * @param {boolean} higherBetter
 */
export function rankStars(values, higherBetter) {
  const sorted = [...new Set(values.map((v) => Math.round(v * 10) / 10))].sort((a, b) => (higherBetter ? b - a : a - b));
  return values.map((v) => {
    const r = sorted.indexOf(Math.round(v * 10) / 10);
    return sorted.length === 1 ? 2 : Math.max(1, 3 - Math.round((r * 2) / (sorted.length - 1)));
  });
}
