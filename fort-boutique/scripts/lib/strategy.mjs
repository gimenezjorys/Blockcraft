// Fort Boutique — stratégies du Matin pour les simulations (D2.2) : achats, améliorations, aménagement.
import { Rng, seedFrom } from '../../src/core/rng.js';
import { FURNITURE } from '../../src/data/furniture.js';
import { districtDef } from '../../src/data/districts.js';
import { catalogIds, canBuy, buyFurniture, findPlacement } from '../../src/game/catalog.js';
import { canUpgrade, upgradeFurniture } from '../../src/game/economy.js';
import { unlockedFurniture } from '../../src/game/progression.js';
import { merchantUpgradeInfo, buyMerchantUpgrade, recipeInfo, upgradeRecipe, expansionInfo, expandShop } from '../../src/game/upgrades.js';
import { padsFinished } from '../../src/game/day/pads.js';
import { mamieAdvice } from '../../src/game/editor.js';
import { validateLayout, gridSize } from '../../src/game/shop.js';
import { nightStats } from '../../src/game/stats.js';

/** Valeur défensive d'un meuble (dégâts par seconde approximatifs, zone et contrôle compris). */
function defenseValue(id, level = 1) {
  const def = FURNITURE[id];
  const n = def.night;
  const s = nightStats(def, level);
  switch (n.behavior) {
    case 'projectile': return s.dmg * s.rate * (n.slow ? 1.4 : 1) * (n.tag ? 1.3 : 1);
    case 'lob': return (s.dmg || n.poison * n.poisonDur || 0) * s.rate * (1 + (n.radius || 0)) * (n.slow ? 1.2 : 1);
    case 'multiShot': return s.dmg * s.rate * n.targets;
    case 'melee': return s.dmg * s.rate * 1.3;
    case 'cone': return s.dmg * n.ticks * 1.8 + (n.burn || 0);
    case 'pulse':
    case 'stunPulse': return (s.dmg / n.every) * 2.5;
    case 'pierceLine': return s.dmg * s.rate * 2;
    case 'beamRamp': return s.dps * 2.5;
    case 'light': return s.dmg * s.rate;
    case 'homingBounce': return s.dmg * s.rate * 2.4;
    case 'wall': return 2;
    default: return 3;
  }
}

/** Naïf : première case valide en partant du centre (profil faible, disposition « par défaut »). */
function naivePlacement(districtId, expansion, layout, id) {
  const [w, h] = gridSize(expansion);
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push({ x, y, d: Math.abs(x - w / 2) + Math.abs(y - h / 2) });
  cells.sort((a, b) => a.d - b.d);
  for (const c of cells) {
    const item = { id, x: c.x, y: c.y, rot: 0 };
    if (validateLayout(districtId, expansion, layout.concat([item])).ok) return item;
  }
  return null;
}

/**
 * Actions du Matin d'un bot.
 * @param {any} g partie (phase Matin)
 * @param {any} profile
 * @param {{ cycle: number, seed: number }} o
 * @returns {{ bought: string[], upgraded: string[], moved: number }}
 */
export function morningActions(g, profile, o) {
  const save = g.save;
  const shop = g.shop;
  const rng = new Rng(seedFrom(o.seed, 'matin', o.cycle, profile.id));
  const out = { bought: [], upgraded: [], moved: 0 };
  const reserve = profile.id === 'weak' ? 0 : profile.id === 'medium' ? 20 : 10;
  // 1. Améliorations de meubles avec les plans (tous les profils ; ordre selon le profil).
  for (let guard = 0; guard < 12; guard++) {
    const candidates = unlockedFurniture(save).filter((id) => id !== 'caisse' && canUpgrade(save, id).ok);
    if (!candidates.length) break;
    let id;
    if (profile.buy === 'cheapest') {
      if (!rng.chance(0.6)) break;
      id = rng.pick(candidates);
    } else if (profile.buy === 'priority') id = candidates.sort((a, b) => canUpgrade(save, a).cost.coins - canUpgrade(save, b).cost.coins)[0];
    else id = candidates.sort((a, b) => countOf(shop, b) * defenseValue(b, save.furniture[b].level) - countOf(shop, a) * defenseValue(a, save.furniture[a].level))[0];
    if (!upgradeFurniture(save, id)) break;
    out.upgraded.push(id);
  }
  // 2. Améliorations du marchand et recettes (moyen et fort).
  if (profile.buy !== 'cheapest') {
    const order = profile.buy === 'optimal' ? ['basket', 'shoes', 'whistle', 'broom', 'bell'] : ['basket', 'shoes', 'broom', 'bell', 'whistle'];
    for (const id of order) {
      const info = merchantUpgradeInfo(save, id);
      if (info.ok && save.player.coins - info.cost >= reserve * 3) {
        buyMerchantUpgrade(save, id);
        break;
      }
    }
    for (const prod of districtDef(g.shopId).products) {
      const info = recipeInfo(save, g.shopId, prod);
      if (info.ok && save.player.coins - info.cost >= reserve * 5 && shop.layout.some((it) => FURNITURE[it.id].day.product === prod)) {
        upgradeRecipe(save, g.shopId, prod);
        break;
      }
    }
    const ex = expansionInfo(save, g.shopId);
    if (ex.ok && save.player.coins - ex.cost >= reserve * 4) expandShop(save, g.shopId);
  }
  // 3. Achats au catalogue (après les emplacements du tutoriel).
  if (padsFinished(g)) {
    for (let guard = 0; guard < 4; guard++) {
      const buyable = catalogIds(g.shopId).filter((id) => canBuy(save, g.shopId, id).ok);
      if (!buyable.length) break;
      let id;
      if (profile.buy === 'cheapest') {
        buyable.sort((a, b) => canBuy(save, g.shopId, a).price - canBuy(save, g.shopId, b).price);
        id = buyable[rng.int(Math.min(2, buyable.length))];
      } else if (profile.buy === 'priority') {
        id = priorityPick(shop, buyable, profile);
      } else {
        id = buyable.sort((a, b) => defenseValue(b) / canBuy(save, g.shopId, b).price - defenseValue(a) / canBuy(save, g.shopId, a).price)[0];
        const sellNeed = needsSelling(shop);
        if (sellNeed && buyable.includes(sellNeed)) id = sellNeed;
      }
      if (!id) break;
      const price = canBuy(save, g.shopId, id).price;
      if (save.player.coins - price < reserve) break;
      const spot = profile.layout === 'default' ? naivePlacement(g.shopId, shop.expansion, shop.layout, id) : findPlacement(g.shopId, shop.expansion, shop.layout, id);
      if (!spot) break;
      buyFurniture(save, g.shopId, id);
      shop.storage.splice(shop.storage.lastIndexOf(id), 1);
      shop.layout.push({ id, x: spot.x, y: spot.y, rot: spot.rot || 0 });
      out.bought.push(id);
    }
  }
  // 4. Aménagement.
  if (profile.layout === 'optimizer' && save.player.level >= 3) {
    const a = mamieAdvice(g.shopId, shop.expansion, shop.layout, { maxMoves: 4 });
    if (a.moves.length) {
      shop.layout = a.layout;
      out.moved += a.moves.length;
    }
  }
  return out;
}

const countOf = (shop, id) => shop.layout.filter((it) => it.id === id).length;

/** Il manque une étagère ou un producteur pour vendre ce qui est produit ? */
function needsSelling(shop) {
  const shelves = countOf(shop, 'etagere');
  const producers = shop.layout.filter((it) => FURNITURE[it.id].day.kind === 'producer').length;
  if (shelves < producers + 1) return 'etagere';
  return null;
}

/** Liste de priorités « raisonnable » du profil moyen. */
function priorityPick(shop, buyable, profile) {
  const want = [
    ['etagere', 3], ['cagette', 2], ['frigo', 1], ['plante', 1], ['comptoir', 3], ['chaudron', 1], ['etagere', 4],
    ['frigo', 2], ['plante', 2], ['chaudron', 2], ['etagere', 6], ['plante', 3], ['comptoir', 5],
  ];
  for (const [id, n] of want) if (countOf(shop, id) + shop.storage.filter((s) => s === id).length < n && buyable.includes(id)) return id;
  void profile;
  return buyable.sort((a, b) => defenseValue(b) - defenseValue(a))[0];
}
