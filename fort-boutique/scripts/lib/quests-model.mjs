// Fort Boutique — modèle provisoire des quêtes du jour pour les simulations (G14.1), en attendant M12.
// Dès le niveau 4, le bot termine k quêtes par cycle (Faible 1, Moyen 2, Fort 3) et reçoit leurs récompenses :
// XP 40 × X_Q par quête ; 1re : 80 × m_Q pièces + 4 plans ; 2e : 3 rubis + 2 croquettes ; 3e : coffre d'argent ;
// les 3 : +5 rubis. M12 remplacera ce modèle par les vraies quêtes et la simulation sera relancée.
import { Rng, seedFrom } from '../../src/core/rng.js';
import { XP_GAINS } from '../../src/data/xp.js';
import { mQ } from '../../src/data/balance.js';
import { addXp, xpFactor, isUnlocked, unlockedFurniture } from '../../src/game/progression.js';
import { rollChest, applyChest } from '../../src/game/chests.js';

export const QUESTS_PER_CYCLE = { weak: 1, medium: 2, strong: 3 };

/**
 * @param {any} g partie (au Matin)
 * @param {string} profileId
 * @param {number} cycle
 * @returns {number} quêtes terminées
 */
export function applyQuestModel(g, profileId, cycle) {
  const save = g.save;
  if (!isUnlocked(save, 'quests')) return 0;
  const k = Math.min(3, QUESTS_PER_CYCLE[profileId] || 0);
  const rng = new Rng(seedFrom(save.seed, 'quetes', cycle));
  const xq = xpFactor(g.shopId);
  for (let i = 0; i < k; i++) {
    addXp(g, XP_GAINS.dailyQuest * xq);
    if (i === 0) {
      save.player.coins += Math.round(80 * mQ(g.shopId));
      const ids = unlockedFurniture(save).filter((id) => id !== 'caisse');
      const id = rng.pick(ids);
      if (!save.furniture[id]) save.furniture[id] = { level: 1, plans: 0 };
      save.furniture[id].plans += 4;
    } else if (i === 1) {
      save.player.rubies += 3;
      save.player.kibble += 2;
    } else {
      applyChest(save, rollChest(save, 'silver', { shopId: g.shopId, seed: seedFrom(save.seed, 'quete-coffre', cycle) }));
    }
  }
  if (k >= 3) save.player.rubies += 5;
  return k;
}
