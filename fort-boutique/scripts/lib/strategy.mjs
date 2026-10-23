// Fort Boutique — stratégies du Matin pour les simulations (D2.2) : achats, améliorations, aménagement.
import { Rng, seedFrom } from '../../src/core/rng.js';
import { FURNITURE } from '../../src/data/furniture.js';
import { MONSTERS, BOSSES } from '../../src/data/monsters.js';
import { districtDef } from '../../src/data/districts.js';
import { catalogIds, canBuy, buyFurniture, findPlacement } from '../../src/game/catalog.js';
import { canUpgrade, upgradeFurniture } from '../../src/game/economy.js';
import { unlockedFurniture } from '../../src/game/progression.js';
import { merchantUpgradeInfo, buyMerchantUpgrade, recipeInfo, upgradeRecipe, expansionInfo, expandShop } from '../../src/game/upgrades.js';
import { padsFinished, nextPadDef } from '../../src/game/day/pads.js';
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
  // Tant que les emplacements d'achat du tutoriel ne sont pas payés, tout le monde garde de quoi payer le prochain
  // (ils se paient pendant la journée, et ils ouvrent le Catalogue).
  const pad = !padsFinished(g) ? nextPadDef(g) : null;
  const padReserve = pad ? Math.max(0, pad.price - (shop.pads.paid[pad.id] || 0)) : 0;
  const base = profile.id === 'weak' ? 0 : profile.id === 'medium' ? 20 : 10;
  const reserve = base + padReserve;
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
    if (save.player.coins - canUpgrade(save, id).cost.coins < padReserve) break;
    if (!upgradeFurniture(save, id)) break;
    out.upgraded.push(id);
  }
  // 2 bis. Le Faible achète aussi « au hasard » ce qui est au Matin : l'agrandissement ou une amélioration du marchand,
  // une fois de temps en temps (M16 : sans cela il gardait 19 000 pièces dans une boutique pleine).
  if (profile.buy === 'cheapest' && rng.chance(0.5)) {
    const ex = expansionInfo(save, g.shopId);
    const ups = ['basket', 'shoes', 'broom', 'bell', 'whistle'].filter((id) => merchantUpgradeInfo(save, id).ok);
    if (ex.ok && rng.chance(0.5)) expandShop(save, g.shopId);
    else if (ups.length) buyMerchantUpgrade(save, rng.pick(ups));
  }
  // 1 bis. Boutique pleine : un joueur raisonnable l'agrandit d'abord (M20 : sinon, dans la boutique neuve d'un
  // quartier, le Moyen gardait 3 000 pièces sans pouvoir rien poser pendant toute la première semaine).
  if (profile.buy !== 'cheapest') {
    const ex = expansionInfo(save, g.shopId);
    if (ex.ok && save.player.coins >= ex.cost && !findPlacement(g.shopId, shop.expansion, shop.layout, 'etagere')) expandShop(save, g.shopId);
  }
  // 2. Améliorations du marchand et recettes (moyen et fort).
  if (profile.buy !== 'cheapest') {
    const order = profile.buy === 'optimal' ? ['basket', 'shoes', 'whistle', 'broom', 'bell'] : ['basket', 'shoes', 'broom', 'bell', 'whistle'];
    // Un joueur qui a de quoi payer achète plusieurs améliorations le même matin (3 au plus pour le marchand, 2 recettes).
    for (let n = 0, guard = 0; n < 3 && guard < 3; guard++) {
      let any = false;
      for (const id of order) {
        const info = merchantUpgradeInfo(save, id);
        if (n < 3 && info.ok && save.player.coins - info.cost >= base * 3 + padReserve) {
          buyMerchantUpgrade(save, id);
          n++;
          any = true;
        }
      }
      if (!any) break;
    }
    let recipes = 0;
    for (const prod of districtDef(g.shopId).products) {
      const info = recipeInfo(save, g.shopId, prod);
      if (recipes < 2 && info.ok && save.player.coins - info.cost >= base * 5 + padReserve && shop.layout.some((it) => FURNITURE[it.id].day.product === prod)) {
        upgradeRecipe(save, g.shopId, prod);
        recipes++;
      }
    }
    const ex = expansionInfo(save, g.shopId);
    if (ex.ok && save.player.coins - ex.cost >= base * 4 + padReserve) expandShop(save, g.shopId);
  }
  // 3. Achats au catalogue (après les emplacements du tutoriel).
  if (padsFinished(g)) {
    const unplaceable = new Set();
    for (let guard = 0; guard < 6; guard++) {
      const buyable = catalogIds(g.shopId).filter((id) => !unplaceable.has(id) && canBuy(save, g.shopId, id).ok);
      if (!buyable.length) break;
      let id;
      if (profile.buy === 'cheapest') {
        buyable.sort((a, b) => canBuy(save, g.shopId, a).price - canBuy(save, g.shopId, b).price);
        id = buyable[rng.int(Math.min(2, buyable.length))];
      } else if (profile.buy === 'priority') {
        id = priorityPick(shop, buyable, profile, g.shopId);
      } else {
        const air = hasFlyers(g.shopId);
        const dark = districtDef(g.shopId).dark;
        // Obscurité, ou boss qui chasse les lanternes (Reine Phalène, M20) : de la lumière d'abord.
        const hunt = !!(BOSSES[districtDef(g.shopId).boss] || {}).lampHunt;
        const lit = (x) => ((dark || hunt) && FURNITURE[x].night.behavior === 'light' && countOf(shop, x) < (hunt ? 4 : 3) ? 3 : 1);
        // Grignotins blindés (golems) : ce qui ignore l'armure (lumière, feu, poison) compte double.
        const pierce = (x) => (hasArmored(g.shopId) && PIERCING.includes(FURNITURE[x].night.element) ? 2 : 1);
        const val = (x) => defenseValue(x) * (air && FURNITURE[x].air ? 2 : 1) * lit(x) * pierce(x) / canBuy(save, g.shopId, x).price;
        id = buyable.sort((a, b) => val(b) - val(a))[0];
        const sellNeed = needsSelling(shop);
        if (sellNeed && buyable.includes(sellNeed)) id = sellNeed;
      }
      if (!id) break;
      const price = canBuy(save, g.shopId, id).price;
      if (save.player.coins - price < reserve) break;
      if (!place(id)) unplaceable.add(id);
    }
    // Pas de trésor qui dort (Moyen et Fort) : avec plus de 4 fois le prix du moins cher des achats utiles, on l'achète.
    if (profile.buy !== 'cheapest') {
      for (let guard = 0; guard < 4; guard++) {
        const cheap = catalogIds(g.shopId)
          .filter((id) => !unplaceable.has(id) && canBuy(save, g.shopId, id).ok)
          .sort((a, b) => canBuy(save, g.shopId, a).price - canBuy(save, g.shopId, b).price)[0];
        if (!cheap || save.player.coins <= 4 * canBuy(save, g.shopId, cheap).price) break;
        if (!place(cheap)) unplaceable.add(cheap);
      }
    }
  }

  /** Achète et pose un meuble ; faux s'il n'a pas de place. */
  function place(id) {
    const spot = profile.layout === 'default' ? naivePlacement(g.shopId, shop.expansion, shop.layout, id) : findPlacement(g.shopId, shop.expansion, shop.layout, id);
    if (!spot) return false;
    buyFurniture(save, g.shopId, id);
    shop.storage.splice(shop.storage.lastIndexOf(id), 1);
    shop.layout.push({ id, x: spot.x, y: spot.y, rot: spot.rot || 0 });
    out.bought.push(id);
    return true;
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

/** Listes de priorités « raisonnables » du profil moyen, par quartier (M16 : la Boulangerie a ses volants). */
const PRIORITIES = {
  q1: [
    ['etagere', 3], ['cagette', 2], ['frigo', 1], ['plante', 1], ['comptoir', 3], ['chaudron', 1], ['etagere', 4],
    ['frigo', 2], ['plante', 2], ['chaudron', 2], ['etagere', 6], ['plante', 3], ['comptoir', 5],
  ],
  // Chauves-souris par la cheminée : étagères et vitrine (contre les volants) d'abord, puis four et pétrin.
  q2: [
    ['etagere', 3], ['four', 1], ['plante', 1], ['comptoir', 2], ['vitrine', 1], ['etagere', 4], ['petrin', 1], ['cafe', 1],
    ['four', 2], ['vitrine', 2], ['etagere', 6], ['plante', 2], ['petrin', 2], ['comptoir', 4],
  ],
  // Obscurité : une lanterne tout de suite (les fantômes ne se voient qu'à la lumière), le pilulier contre les volants.
  q3: [
    ['lanterne', 1], ['etagere', 3], ['pilulier', 1], ['herbier', 1], ['lanterne', 2], ['plante', 1], ['comptoir', 2],
    ['pilulier', 2], ['alambic', 1], ['etagere', 5], ['lanterne', 3], ['herbier', 2], ['cafe', 1], ['comptoir', 4],
  ],
  // Corbeaux (volants) et golems (blindés, métal) : des lanternes (la lumière ignore l'armure), l'établi et l'enclume
  // qui frappent fort, l'aimant contre le métal, le pistolet à peinture contre les volants.
  q4: [
    ['etagere', 3], ['lanterne', 2], ['etabli', 1], ['plante', 1], ['aimant', 1], ['comptoir', 2], ['enclume', 1],
    ['lanterne', 4], ['peinture', 1], ['etabli', 2], ['plante', 2], ['ventilo', 1], ['etagere', 5], ['aimant', 2], ['comptoir', 4],
  ],
  // Phalènes (volants, attirées par les lampes) et tout le bestiaire : bonbons (plusieurs cibles), des lanternes-appâts
  // (la Reine Phalène les visite une à une avant la caisse, M20).
  q5: [
    ['etagere', 3], ['bonbons', 1], ['lanterne', 2], ['plante', 1], ['comptoir', 2], ['bonbons', 2], ['aimant', 1],
    ['cristal', 1], ['lanterne', 4], ['horloge', 1], ['plante', 2], ['etagere', 5], ['pupitre', 1], ['comptoir', 4],
  ],
};

/** Le quartier fait-il venir des volants ? (leur valeur contre les volants compte alors double) */
/** Le quartier fait-il venir des Grignotins blindés (armure 6 et plus) ? */
const PIERCING = ['light', 'fire', 'poison'];
const hasArmored = (districtId) => Object.keys(districtDef(districtId).weights || {}).some((t) => MONSTERS[t] && MONSTERS[t].armor >= 6);
const hasFlyers = (districtId) => Object.keys(districtDef(districtId).weights || {}).some((t) => ['chauvesouris', 'corbeau', 'phalene'].includes(t));

/** Liste de priorités « raisonnable » du profil moyen. */
function priorityPick(shop, buyable, profile, districtId = 'q1') {
  const want = PRIORITIES[districtId] || PRIORITIES.q1;
  for (const [id, n] of want) if (countOf(shop, id) + shop.storage.filter((s) => s === id).length < n && buyable.includes(id)) return id;
  void profile;
  return buyable.sort((a, b) => defenseValue(b) - defenseValue(a))[0];
}
