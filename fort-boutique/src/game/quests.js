// Fort Boutique — quêtes du jour et de la semaine (G14.1, G14.2) : relance, réclamation et récompenses exactes.
// Le tirage et le suivi sont dans quest-track.js.
import { QUESTS, WEEKLY_COSMETICS } from '../data/quests.js';
import { XP_GAINS } from '../data/xp.js';
import { DISTRICT_FACTORS } from '../data/balance.js';
import { seedFrom } from '../core/rng.js';
import { now } from '../core/time.js';
import { refreshQuests, drawReplacement, questDistrict } from './quest-track.js';
import { grantReward } from './rewards.js';

export { refreshQuests, trackQuest } from './quest-track.js';

const done = (q) => !q.claimed && q.progress >= q.goal;

/** Une quête (du jour ou de la semaine) attend d'être réclamée ? */
export function questsClaimable(save, t = now()) {
  refreshQuests(save, t);
  return save.daily.quests.list.some(done) || save.daily.weekly.list.some(done);
}

/**
 * Relance la quête i : une gratuite par jour, une de plus avec une pub (G14.1). Une quête finie ne se relance pas.
 * @returns {boolean}
 */
export function rerollQuest(save, i, { ad = false } = {}) {
  const qs = save.daily.quests;
  const q = qs.list[i];
  if (!q || q.claimed || q.progress >= q.goal) return false;
  const free = qs.rerollsUsed < QUESTS.freeRerolls;
  if (!free && !(ad && qs.adRerollsUsed < QUESTS.adRerolls)) return false;
  const next = drawReplacement(save, i);
  if (!next) return false;
  if (free) qs.rerollsUsed++;
  else qs.adRerollsUsed++;
  qs.list[i] = next;
  return true;
}

/** Relances encore possibles aujourd'hui. */
export function rerollsLeft(save) {
  const qs = save.daily.quests;
  return { free: Math.max(0, QUESTS.freeRerolls - qs.rerollsUsed), ad: Math.max(0, QUESTS.adRerolls - qs.adRerollsUsed) };
}

/**
 * Réclame la quête du jour i. Récompense selon l'ordre des réclamations : 1re 80 × m_Q pièces + 4 plans, 2e 3 rubis
 * + 2 croquettes, 3e coffre d'argent ; les 3 : +5 rubis. Chaque quête donne aussi 40 × X_Q d'XP (le niveau se fête à l'aube).
 * @returns {null | { reward: any, bonus: any, xp: number, order: number }}
 */
export function claimQuest(save, i) {
  const qs = save.daily.quests;
  const q = qs.list[i];
  if (!q || !done(q)) return null;
  const order = qs.list.filter((x) => x.claimed).length;
  q.claimed = true;
  const reward = grantReward(save, QUESTS.rewards[Math.min(order, QUESTS.rewards.length - 1)], { seed: seedFrom(save.seed, 'quete', qs.day, order) });
  const xp = Math.round(XP_GAINS.dailyQuest * DISTRICT_FACTORS.xp[`q${questDistrict(save)}`]);
  save.player.xp = Math.round((save.player.xp + xp) * 100) / 100;
  let bonus = null;
  if (!qs.allClaimed && qs.list.length && qs.list.every((x) => x.claimed)) {
    qs.allClaimed = true;
    bonus = grantReward(save, QUESTS.allBonus, { seed: seedFrom(save.seed, 'quetes3', qs.day) });
  }
  return { reward, bonus, xp, order };
}

/**
 * Réclame la quête de la semaine i : un coffre d'or ; les 5 : Coffre de Lune + cosmétique de la semaine.
 * @returns {null | { reward: any, bonus: any }}
 */
export function claimWeekly(save, i) {
  const wk = save.daily.weekly;
  const q = wk.list[i];
  if (!q || !done(q)) return null;
  q.claimed = true;
  const reward = grantReward(save, QUESTS.weeklyEach, { seed: seedFrom(save.seed, 'semaine', wk.week, q.id) });
  let bonus = null;
  if (!wk.allClaimed && wk.list.length && wk.list.every((x) => x.claimed)) {
    wk.allClaimed = true;
    const cosmetic = WEEKLY_COSMETICS[((wk.week % WEEKLY_COSMETICS.length) + WEEKLY_COSMETICS.length) % WEEKLY_COSMETICS.length];
    bonus = grantReward(save, { chest: QUESTS.weeklyAll.chest }, { seed: seedFrom(save.seed, 'semaine5', wk.week), cosmetic });
  }
  return { reward, bonus };
}
