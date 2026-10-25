// Fort Boutique — améliorations hors meubles : marchand (G11.1), recettes (G7.5), agrandissements (G6.6, G12.6).
import { MERCHANT_UPGRADES, EXPANSIONS } from '../data/merchant.js';
import { RECIPES, mQ } from '../data/balance.js';
import { districtDef } from '../data/districts.js';
import { recipeCost } from './economy.js';
import { isUnlocked } from './progression.js';
import { validateLayout } from './shop.js';
import { applyPlan, shopPlanId, syncSlots } from './plans.js';

/**
 * Prochaine amélioration du marchand.
 * @param {any} save
 * @param {'shoes' | 'basket' | 'broom' | 'whistle' | 'bell'} id
 * @returns {{ ok: boolean, reason?: 'locked' | 'max' | 'coins', level: number, max: number, cost: number | null }}
 */
export function merchantUpgradeInfo(save, id) {
  const def = MERCHANT_UPGRADES[id];
  const level = Math.max(1, save.player.upgrades[id] || 1);
  const cost = level < def.max ? def.costs[level - 1] : null;
  const base = { level, max: def.max, cost };
  if (!isUnlocked(save, 'merchantUpgrades')) return { ok: false, reason: 'locked', ...base };
  if (cost === null) return { ok: false, reason: 'max', ...base };
  if (save.player.coins < cost) return { ok: false, reason: 'coins', ...base };
  return { ok: true, ...base };
}

/** @returns {boolean} */
export function buyMerchantUpgrade(save, id) {
  const info = merchantUpgradeInfo(save, id);
  if (!info.ok) return false;
  save.player.coins -= info.cost;
  save.player.upgrades[id] = info.level + 1;
  return true;
}

/**
 * Recette d'un produit de la boutique (G7.5) : +15 % de prix par niveau, niveau 5 au maximum.
 * @returns {{ ok: boolean, reason?: 'locked' | 'max' | 'coins' | 'product', level: number, cost: number | null }}
 */
export function recipeInfo(save, shopId, product) {
  const shop = save.shops[shopId];
  const level = Math.max(1, Math.min(RECIPES.maxLevel, (shop && shop.recipes[product]) || 1));
  const cost = recipeCost(product, level);
  const base = { level, cost };
  if (!districtDef(shopId).products.includes(product)) return { ok: false, reason: 'product', ...base };
  if (save.player.level < RECIPES.unlockLevel) return { ok: false, reason: 'locked', ...base };
  if (cost === null) return { ok: false, reason: 'max', ...base };
  if (save.player.coins < cost) return { ok: false, reason: 'coins', ...base };
  return { ok: true, ...base };
}

/** @returns {boolean} */
export function upgradeRecipe(save, shopId, product) {
  const info = recipeInfo(save, shopId, product);
  if (!info.ok) return false;
  save.player.coins -= info.cost;
  save.shops[shopId].recipes[product] = info.level + 1;
  return true;
}

/**
 * Prochain agrandissement de la boutique (E1 300, E2 1 500, E3 6 000, × m_Q).
 * @returns {{ ok: boolean, reason?: 'max' | 'level' | 'coins', to: number, cost: number | null, level: number }}
 */
export function expansionInfo(save, shopId) {
  const shop = save.shops[shopId];
  const next = EXPANSIONS.find((e) => e.to === shop.expansion + 1);
  if (!next) return { ok: false, reason: 'max', to: shop.expansion, cost: null, level: 0 };
  const cost = Math.round(next.base * mQ(shopId));
  const base = { to: next.to, cost, level: next.level };
  if (save.player.level < next.level) return { ok: false, reason: 'level', ...base };
  if (save.player.coins < cost) return { ok: false, reason: 'coins', ...base };
  return { ok: true, ...base };
}

/**
 * Agrandit : une ligne en haut (et une colonne à droite pour E1 et E2) ; les meubles gardent leur colonne
 * et descendent d'une ligne (G6.6). Une disposition valide reste valide.
 * @returns {boolean}
 */
export function expandShop(save, shopId) {
  const info = expansionInfo(save, shopId);
  if (!info.ok) return false;
  const shop = save.shops[shopId];
  // v1.1 (V3) : la boutique agrandie reprend le même plan à la nouvelle taille ; chaque meuble garde son rang dans
  // l'ordre de remplissage, et ceux de la Réserve trouvent leur place s'il y en a.
  const next = { ...shop, layout: shop.layout.map((it) => ({ ...it })), storage: (shop.storage || []).slice() };
  if (!applyPlan(shopId, next, shopPlanId(shop), { expansion: info.to })) {
    const moved = shop.layout.map((it) => ({ ...it, y: it.y + 1 }));
    if (!validateLayout(shopId, info.to, moved).ok) return false;
    next.layout = moved;
    next.storage = (shop.storage || []).slice();
    next.expansion = info.to;
  }
  save.player.coins -= info.cost;
  shop.layout = next.layout;
  shop.storage = next.storage;
  shop.expansion = info.to;
  syncSlots(shopId, shop);
  return true;
}
