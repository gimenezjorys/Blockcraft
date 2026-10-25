// Fort Boutique — bestiaire (G14.4, niveau 6) : paliers 25 / 250 / 2 500 victoires → 2 / 5 / 10 rubis (une fois chacun).
// Le bonus de dégâts (seul le palier le plus haut compte) est lu par la nuit (night.js, bestiaryBonus).
import { BESTIARY } from '../data/achievements.js';
import { isUnlocked } from './progression.js';

/** Palier atteint (0 à 3). */
export function bestiaryTier(count) {
  let tier = 0;
  for (const n of BESTIARY.tiers) if (count >= n) tier++;
  return tier;
}

/**
 * Paliers nouvellement atteints : rubis versés une seule fois (rétroactif à l'ouverture du bestiaire).
 * @param {any} save
 * @returns {Array<{ type: string, tier: number, rubies: number }>}
 */
export function checkBestiary(save) {
  if (!isUnlocked(save, 'bestiary')) return [];
  const col = save.collections;
  const out = [];
  for (const [type, count] of Object.entries(col.bestiary)) {
    const tier = bestiaryTier(count);
    const prev = col.bestiaryTiers[type] || 0;
    for (let k = prev; k < tier; k++) {
      const rubies = BESTIARY.rubies[k];
      save.player.rubies += rubies;
      out.push({ type, tier: k + 1, rubies });
    }
    if (tier > prev) col.bestiaryTiers[type] = tier;
  }
  return out;
}
