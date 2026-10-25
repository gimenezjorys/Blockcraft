// Fort Boutique — règles des pubs (G18), sans DOM : placements récompensés et leurs plafonds, plafond global,
// interstitielle it_dawn et ses conditions. Testé règle par règle. Les compteurs vivent dans `save.ads`.
import { ADS } from '../data/balance.js';
import { utcDay, utcWeek } from '../core/time.js';

/** Remet les compteurs du jour à zéro au changement de jour UTC. */
export function refreshAds(save, t) {
  const a = save.ads;
  const day = utcDay(t);
  if (a.day !== day && !(a.day > day)) {
    a.day = day;
    a.rewardedToday = 0;
    a.interstitialsToday = 0;
    for (const [id, c] of Object.entries(a.byPlacement)) if (c && c.per === 'day') delete a.byPlacement[id];
  }
  return a;
}

/** Clé de la période d'un placement (nuit, jour, semaine, retour). */
function periodKey(save, per, t, ctx = {}) {
  if (per === 'night') return `n${ctx.night ?? save.stats.nights}`;
  if (per === 'week') return `w${utcWeek(t)}`;
  if (per === 'return') return `r${ctx.returnId ?? save.offline.lastCollectAt}`;
  return `d${utcDay(t)}`;
}

/**
 * Une pub récompensée peut-elle être proposée ici et maintenant ?
 * @param {any} save
 * @param {string} id placement
 * @param {number} t
 * @param {{ phase?: string, night?: number, returnId?: number }} [ctx]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function canOfferRewarded(save, id, t, ctx = {}) {
  const def = ADS.rewarded[id];
  if (!def) return { ok: false, reason: 'unknown' };
  // Jamais pendant le Jour, la Nuit, l'aménagement, ni les 10 premières minutes (G18.3).
  if (['day', 'closing', 'dusk', 'night', 'editor'].includes(ctx.phase)) return { ok: false, reason: 'phase' };
  if ((save.stats.playtimeMs || 0) < ADS.quietPlaytimeMs) return { ok: false, reason: 'quiet' };
  const a = refreshAds(save, t);
  if (a.rewardedToday >= ADS.rewardedPerDay) return { ok: false, reason: 'global' };
  const c = a.byPlacement[id];
  const key = periodKey(save, def.per, t, ctx);
  if (c && c.key === key && c.n >= def.cap) return { ok: false, reason: 'cap' };
  return { ok: true };
}

/** La pub a été vue jusqu'au bout : on compte (la récompense est donnée par l'appelant). */
export function noteRewarded(save, id, t, ctx = {}) {
  const def = ADS.rewarded[id];
  const a = refreshAds(save, t);
  const key = periodKey(save, def.per, t, ctx);
  const c = a.byPlacement[id];
  a.byPlacement[id] = { key, per: def.per, n: c && c.key === key ? c.n + 1 : 1 };
  a.rewardedToday++;
  a.lastRewardedAt = t;
}

/**
 * Interstitielle au passage Aube → Matin (G18.2), seulement si toutes les conditions sont vraies.
 * @param {{ bossWin?: boolean, unlocked?: boolean }} ctx juste après une victoire de boss ou un déblocage
 */
export function canShowInterstitial(save, t, ctx = {}) {
  const I = ADS.interstitial;
  const a = refreshAds(save, t);
  if (save.purchases.noAds) return { ok: false, reason: 'noAds' };
  if (save.player.level < I.minLevel) return { ok: false, reason: 'level' };
  if ((save.stats.playtimeMs || 0) < I.minPlaytimeMs) return { ok: false, reason: 'playtime' };
  if ((a.cyclesSinceInterstitial || 0) < I.minCycles) return { ok: false, reason: 'cycles' };
  if (t - (a.lastInterstitialAt || 0) < I.minGapMs) return { ok: false, reason: 'gap' };
  if (t - (a.lastRewardedAt || 0) < I.quietAfterRewardedMs) return { ok: false, reason: 'recentReward' };
  if (ctx.bossWin || ctx.unlocked) return { ok: false, reason: 'celebration' };
  if (a.interstitialsToday >= I.perDay) return { ok: false, reason: 'daily' };
  return { ok: true };
}

/** Un cycle de plus depuis la dernière interstitielle. */
export function noteCycle(save) {
  save.ads.cyclesSinceInterstitial = (save.ads.cyclesSinceInterstitial || 0) + 1;
}

/** Interstitielle montrée. */
export function noteInterstitial(save, t) {
  const a = refreshAds(save, t);
  a.interstitialsToday++;
  a.lastInterstitialAt = t;
  a.cyclesSinceInterstitial = 0;
}
