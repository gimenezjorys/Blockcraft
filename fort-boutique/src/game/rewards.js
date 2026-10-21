// Fort Boutique — récompenses des quêtes et du calendrier (G14, G15) : pièces × m_Q, plans, rubis, croquettes,
// coffres (tirés à graine) et cosmétiques. Retourne un résumé que l'interface affiche.
import { mQ } from '../data/balance.js';
import { Rng, seedFrom } from '../core/rng.js';
import { rollChest, applyChest, ownedFurnitureIds } from './chests.js';
import { furnState } from './state.js';
import { upgradeCost } from './economy.js';
import { questDistrict } from './quest-track.js';

/** Meubles possédés qui peuvent recevoir des plans (ceux à qui il en manque passent d'abord). */
export function planTargets(save) {
  const ids = ownedFurnitureIds(save).filter((id) => upgradeCost(id, furnState(save, id).level));
  const need = (id) => {
    const st = furnState(save, id);
    const c = upgradeCost(id, st.level);
    return c && st.plans < c.plans ? 0 : 1;
  };
  return ids.sort((a, b) => need(a) - need(b) || a.localeCompare(b));
}

/**
 * Applique une récompense.
 * @param {any} save
 * @param {{ coins?: number, coinsMQ?: boolean, plans?: number, rubies?: number, kibble?: number, chest?: string }} def
 * @param {{ seed: number, planId?: string, cosmetic?: string | null }} ctx
 */
export function grantReward(save, def, ctx) {
  const out = { coins: 0, rubies: 0, kibble: 0, plans: [], chest: null, cosmetic: null };
  const q = questDistrict(save);
  if (def.coins) out.coins = Math.round(def.coins * (def.coinsMQ ? mQ(`q${q}`) : 1));
  if (def.rubies) out.rubies = def.rubies;
  if (def.kibble) out.kibble = def.kibble;
  if (def.plans) {
    const targets = planTargets(save);
    const rng = new Rng(seedFrom(ctx.seed, 'plans'));
    const id = ctx.planId && targets.includes(ctx.planId) ? ctx.planId : targets.length ? targets[Math.min(targets.length - 1, rng.int(Math.min(2, targets.length)))] : null;
    if (id) out.plans.push([id, def.plans]);
    // Aucun meuble à améliorer : les plans deviennent des pièces (rien ne se perd).
    else out.coins += def.plans * 10;
  }
  save.player.coins += out.coins;
  save.player.rubies += out.rubies;
  save.player.kibble += out.kibble;
  for (const [id, n] of out.plans) furnState(save, id).plans += n;
  if (def.chest) {
    const content = rollChest(save, def.chest, { shopId: `q${q}`, seed: seedFrom(ctx.seed, 'coffre') });
    if (ctx.cosmetic && !save.cosmetics.owned.includes(ctx.cosmetic)) content.cosmetic = ctx.cosmetic;
    applyChest(save, content);
    out.chest = content;
  } else if (ctx.cosmetic && !save.cosmetics.owned.includes(ctx.cosmetic)) {
    save.cosmetics.owned.push(ctx.cosmetic);
    out.cosmetic = ctx.cosmetic;
  }
  return out;
}
