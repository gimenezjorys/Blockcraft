// Fort Boutique — coffres et tirage des plans (G12.7). Le tirage est à graine (jamais Math.random).
import { CHESTS, CHEST_RANKS, FIRST_CHEST, PLAN_DRAW } from '../data/chests.js';
import { FURNITURE } from '../data/furniture.js';
import { mQ, pQ } from '../data/balance.js';
import { Rng, seedFrom } from '../core/rng.js';
import { furnState } from './state.js';
import { upgradeCost } from './economy.js';
import { unlockedFurniture } from './progression.js';
import { trackQuest } from './quest-track.js';

/** Monte le coffre d'un rang (Raton doré, G8.8) : Bois -> Argent -> Or. */
export function upgradeChestRank(type) {
  const i = CHEST_RANKS.indexOf(type);
  return i >= 0 && i < CHEST_RANKS.length - 1 ? CHEST_RANKS[i + 1] : type;
}

/** Meubles « possédés » : présents dans au moins une boutique (posés ou rangés). */
export function ownedFurnitureIds(save) {
  const set = new Set();
  for (const shop of Object.values(save.shops)) {
    if (!shop) continue;
    for (const it of shop.layout) set.add(it.id);
    for (const s of shop.storage) set.add(s);
  }
  set.delete('caisse');
  return [...set];
}

/**
 * Tire le contenu d'un coffre.
 * @param {any} save
 * @param {string} type wood | silver | gold | moon | welcome
 * @param {{ shopId: string, seed: number, first?: boolean }} o
 * @returns {{ type: string, coins: number, kibble: number, rubies: number, plans: Array<[string, number]>, cosmetic: string | null }}
 */
export function rollChest(save, type, o) {
  if (o.first) {
    return { type: 'wood', coins: FIRST_CHEST.coins, kibble: 0, rubies: 0, plans: FIRST_CHEST.plans.map(([id, n]) => [id, n]), cosmetic: null };
  }
  const def = CHESTS[type] || CHESTS.wood;
  const rng = new Rng(seedFrom(o.seed, 'coffre', type));
  const coins = Math.round(rng.intRange(def.coins[0], def.coins[1]) * mQ(o.shopId));
  const totalPlans = Math.round(def.plans * pQ(o.shopId));
  const unlocked = unlockedFurniture(save).filter((id) => id !== 'caisse');
  const owned = new Set(ownedFurnitureIds(save));
  const rareAllowed = rng.chance(def.rareChance);
  const pool = unlocked.filter((id) => !FURNITURE[id].rare || rareAllowed);
  const picks = [];
  const nTypes = Math.min(def.types, pool.length);
  for (let i = 0; i < nTypes; i++) {
    const left = pool.filter((id) => !picks.includes(id));
    if (!left.length) break;
    const ownedLeft = left.filter((id) => owned.has(id));
    const otherLeft = left.filter((id) => !owned.has(id));
    let from = left;
    if (ownedLeft.length && otherLeft.length) from = rng.chance(PLAN_DRAW.ownedChance) ? ownedLeft : otherLeft;
    const id = rng.weighted(from, (fid) => (needsPlans(save, fid) ? PLAN_DRAW.needWeight : 1));
    if (id) picks.push(id);
  }
  // Répartition des plans : un type rare reçoit un tiers de sa part.
  const shares = picks.map((id) => (FURNITURE[id].rare ? PLAN_DRAW.rareShare : 1));
  const sum = shares.reduce((a, b) => a + b, 0) || 1;
  const plans = [];
  let given = 0;
  picks.forEach((id, i) => {
    const raw = i === picks.length - 1 && !FURNITURE[id].rare ? totalPlans - given : Math.max(1, Math.round((totalPlans * shares[i]) / sum));
    const n = Math.max(1, raw);
    given += n;
    plans.push([id, n]);
  });
  return { type, coins, kibble: def.kibble, rubies: def.rubies, plans, cosmetic: null };
}

/** Il manque des plans pour le prochain niveau ? */
function needsPlans(save, id) {
  const st = furnState(save, id);
  const c = upgradeCost(id, st.level);
  return !!c && st.plans < c.plans;
}

/**
 * Applique le contenu d'un coffre à la sauvegarde.
 * @param {any} save
 * @param {ReturnType<typeof rollChest>} content
 */
export function applyChest(save, content) {
  save.player.coins += content.coins;
  save.player.kibble += content.kibble;
  save.player.rubies += content.rubies;
  for (const [id, n] of content.plans) furnState(save, id).plans += n;
  if (content.cosmetic && !save.cosmetics.owned.includes(content.cosmetic)) save.cosmetics.owned.push(content.cosmetic);
  save.stats.chestsOpened = (save.stats.chestsOpened || 0) + 1;
  trackQuest(save, 'chest');
}
