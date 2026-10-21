// Fort Boutique — étagères (G7.6) : un seul produit à la fois, capacité 4 + (niveau − 1).
import { dayStats } from '../stats.js';

/** @param {any} g */
export function initShelves(g) {
  for (const f of g.furn) {
    if (f.def.day.kind !== 'shelf') continue;
    f.capacity = dayStats(f.def, f.level).capacity;
    f.count = Math.min(f.count, f.capacity);
  }
}

/** Étagères de la boutique. @param {any} g */
export function shelves(g) {
  return g.furn.filter((f) => f.def.day.kind === 'shelf');
}

/**
 * Produits exposés : ceux d'au moins une étagère (G7.3).
 * @param {any} g
 * @returns {string[]}
 */
export function exposedProducts(g) {
  const out = [];
  for (const f of g.furn) {
    if (f.def.day.kind === 'shelf' && f.product && !out.includes(f.product)) out.push(f.product);
  }
  return out;
}

/**
 * Pose un article sur une étagère. Le premier article posé fixe le produit.
 * @returns {boolean}
 */
export function putOnShelf(f, product) {
  if (f.count >= f.capacity) return false;
  if (f.product && f.product !== product) return false;
  f.product = product;
  f.count++;
  f.item.product = product;
  f.item.count = f.count;
  return true;
}

/** Retire un article (un client le prend). */
export function takeFromShelf(f) {
  if (f.count <= 0) return false;
  f.count--;
  f.item.count = f.count;
  return true;
}
