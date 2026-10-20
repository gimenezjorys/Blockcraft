// Fort Boutique — économie : niveaux de meubles (plans + pièces), plafonds, prix croissants (G9.1, G12).
import { ECONOMY, RECIPES } from '../data/balance.js';
import { FURNITURE } from '../data/furniture.js';
import { PRODUCTS } from '../data/products.js';
import { furnState } from './state.js';

/** Plafond de niveau des meubles = min(10 ; 1 + arrondi supérieur(niveau ÷ 3)) (G9.1). */
export function furnitureLevelCap(merchantLevel) {
  return Math.min(ECONOMY.maxFurnitureLevel, 1 + Math.ceil(merchantLevel / 3));
}

/**
 * Coût pour passer du niveau L à L+1.
 * @param {string} id
 * @param {number} level L
 * @returns {{ plans: number, coins: number } | null} null au niveau 10
 */
export function upgradeCost(id, level) {
  if (level >= ECONOMY.maxFurnitureLevel) return null;
  const def = FURNITURE[id];
  const k = def && def.rare ? ECONOMY.rareCoinFactor : 1;
  return { plans: ECONOMY.upgradePlans[level - 1], coins: Math.round(ECONOMY.upgradeCoins[level - 1] * k) };
}

/**
 * Peut-on améliorer ce meuble ?
 * @param {any} save
 * @param {string} id
 * @returns {{ ok: boolean, reason?: 'max' | 'cap' | 'plans' | 'coins', cost: { plans: number, coins: number } | null, level: number, plans: number }}
 */
export function canUpgrade(save, id) {
  const st = furnState(save, id);
  const cost = upgradeCost(id, st.level);
  const base = { cost, level: st.level, plans: st.plans };
  if (!cost) return { ok: false, reason: 'max', ...base };
  if (st.level >= furnitureLevelCap(save.player.level)) return { ok: false, reason: 'cap', ...base };
  if (st.plans < cost.plans) return { ok: false, reason: 'plans', ...base };
  if (save.player.coins < cost.coins) return { ok: false, reason: 'coins', ...base };
  return { ok: true, ...base };
}

/**
 * Améliore un meuble (niveau global, G9.1).
 * @returns {boolean}
 */
export function upgradeFurniture(save, id) {
  const c = canUpgrade(save, id);
  if (!c.ok) return false;
  const st = furnState(save, id);
  st.plans -= c.cost.plans;
  save.player.coins -= c.cost.coins;
  st.level++;
  save.stats.upgradesDone = (save.stats.upgradesDone || 0) + 1;
  return true;
}

/** Exemplaires possédés dans une boutique (posés + rangés). */
export function ownedCount(shop, id) {
  return shop.layout.filter((it) => it.id === id).length + shop.storage.filter((s) => s === id).length;
}

/** Prix d'achat : prix du catalogue × 1,6^(exemplaires déjà possédés) (G9.1). */
export function buyPrice(shop, id) {
  const def = FURNITURE[id];
  return Math.round(def.price * Math.pow(ECONOMY.copyPriceFactor, ownedCount(shop, id)));
}

/** Coût d'une recette pour passer au niveau suivant (G7.5) ; null au maximum. */
export function recipeCost(product, level) {
  if (level >= RECIPES.maxLevel) return null;
  return PRODUCTS[product].price * RECIPES.costFactors[level - 1];
}

/** Ajoute des pièces (jamais négatives). */
export function addCoins(save, n) {
  save.player.coins = Math.max(0, save.player.coins + Math.round(n));
}
