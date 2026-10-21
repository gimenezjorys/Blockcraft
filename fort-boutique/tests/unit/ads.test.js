// M15 : règles des pubs (G18, ad-policy.js), une par une ; Garde-robe (G17) : rubis uniquement, achats jamais perdus.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave } from '../../src/save/schema.js';
import { canOfferRewarded, noteRewarded, canShowInterstitial, noteInterstitial, noteCycle } from '../../src/ads/ad-policy.js';
import { buyCosmetic, equipCosmetic, cosmeticState } from '../../src/game/cosmetics.js';
import { ADS } from '../../src/data/balance.js';

const DAY = 86400000;
const T = 20745 * DAY + 10 * 3600000;
const MIN = 60000;

function save() {
  const s = defaultSave({ seed: 2, now: 0 });
  s.player.level = 8;
  s.stats.playtimeMs = 20 * MIN;
  s.stats.nights = 10;
  return s;
}
const ok = (s, id, t = T, ctx = {}) => canOfferRewarded(s, id, t, { phase: 'menu', ...ctx }).ok;

test('pubs récompensées : jamais pendant les 10 premières minutes ni pendant le jeu', () => {
  const s = save();
  s.stats.playtimeMs = 9 * MIN;
  assert.equal(canOfferRewarded(s, 'rw_double_night', T, { phase: 'menu' }).reason, 'quiet');
  s.stats.playtimeMs = 11 * MIN;
  for (const phase of ['day', 'closing', 'dusk', 'night', 'editor']) assert.equal(canOfferRewarded(s, 'rw_double_night', T, { phase }).reason, 'phase');
  assert.equal(ok(s, 'rw_double_night'), true);
  assert.equal(canOfferRewarded(s, 'rw_inconnue', T).ok, false);
});

test('pubs récompensées : plafond de chaque placement (nuit, jour, semaine, retour)', () => {
  const s = save();
  noteRewarded(s, 'rw_double_night', T);
  assert.equal(ok(s, 'rw_double_night'), false, '1 par nuit');
  s.stats.nights++;
  assert.equal(ok(s, 'rw_double_night'), true, 'nuit suivante');
  for (let i = 0; i < 3; i++) noteRewarded(s, 'rw_bonus_chest', T);
  assert.equal(ok(s, 'rw_bonus_chest'), false, '3 coffres bonus par jour');
  assert.equal(ok(s, 'rw_bonus_chest', T + DAY), true, 'le lendemain');
  noteRewarded(s, 'rw_quest_reroll', T + DAY);
  assert.equal(ok(s, 'rw_quest_reroll', T + DAY), false, '1 relance par jour');
  noteRewarded(s, 'rw_daily_rubies', T + DAY);
  assert.equal(ok(s, 'rw_daily_rubies', T + DAY), false, '+3 rubis une fois par jour');
  for (let i = 0; i < 2; i++) noteRewarded(s, 'rw_boss_retry', T + DAY);
  assert.equal(ok(s, 'rw_boss_retry', T + DAY), false, '2 revanches par jour');
  noteRewarded(s, 'rw_streak_restore', T + DAY);
  assert.equal(ok(s, 'rw_streak_restore', T + 2 * DAY), false, 'même semaine');
  assert.equal(ok(s, 'rw_streak_restore', T + 8 * DAY), true, 'semaine suivante');
  s.offline.lastCollectAt = 111;
  noteRewarded(s, 'rw_morning_delivery', T + 8 * DAY);
  assert.equal(ok(s, 'rw_morning_delivery', T + 8 * DAY), false, '1 par retour');
  s.offline.lastCollectAt = 222;
  assert.equal(ok(s, 'rw_morning_delivery', T + 8 * DAY), true, 'nouveau retour');
});

test('pubs récompensées : plafond global de 12 par jour UTC', () => {
  const s = save();
  for (let i = 0; i < ADS.rewardedPerDay; i++) {
    s.stats.nights++;
    noteRewarded(s, 'rw_double_night', T);
  }
  s.stats.nights++;
  assert.equal(canOfferRewarded(s, 'rw_double_night', T, { phase: 'menu' }).reason, 'global');
  assert.equal(ok(s, 'rw_double_night', T + DAY), true);
});

test('interstitielle it_dawn : chaque condition de G18.2', () => {
  const ready = () => {
    const s = save();
    s.player.level = 5;
    for (let i = 0; i < 3; i++) noteCycle(s);
    return s;
  };
  const why = (s, t = T, ctx = {}) => canShowInterstitial(s, t, ctx).reason || 'ok';
  assert.equal(why(ready()), 'ok');
  let s = ready();
  s.purchases.noAds = true;
  assert.equal(why(s), 'noAds');
  s = ready();
  s.player.level = 4;
  assert.equal(why(s), 'level');
  s = ready();
  s.stats.playtimeMs = 14 * MIN;
  assert.equal(why(s), 'playtime');
  s = ready();
  s.ads.cyclesSinceInterstitial = 2;
  assert.equal(why(s), 'cycles');
  s = ready();
  noteInterstitial(s, T - 3 * MIN);
  for (let i = 0; i < 3; i++) noteCycle(s);
  assert.equal(why(s), 'gap', '4 min au moins depuis la dernière');
  s = ready();
  s.ads.lastRewardedAt = T - 2 * MIN;
  assert.equal(why(s), 'recentReward');
  assert.equal(why(ready(), T, { bossWin: true }), 'celebration');
  assert.equal(why(ready(), T, { unlocked: true }), 'celebration');
  s = ready();
  for (let i = 0; i < 6; i++) {
    noteInterstitial(s, T - (60 - i * 5) * MIN);
    for (let k = 0; k < 3; k++) noteCycle(s);
  }
  assert.equal(why(s), 'daily', '6 par jour au plus');
});

test('Garde-robe : rubis uniquement, objets de saison pendant leur saison, objets gagnés jamais achetables', () => {
  const s = save();
  s.player.level = 6;
  s.player.rubies = 100;
  s.player.coins = 99999;
  assert.equal(buyCosmetic(s, 'straw_hat', T), true);
  assert.equal(s.player.rubies, 70, '30 rubis');
  assert.equal(s.player.coins, 99999, 'jamais de pièces');
  assert.deepEqual(s.purchases.cosmetics.map((x) => x.id), ['straw_hat'], 'achat enregistré');
  assert.equal(buyCosmetic(s, 'straw_hat', T), false, 'déjà à toi');
  assert.equal(equipCosmetic(s, 'straw_hat'), true);
  assert.equal(s.cosmetics.equipped.outfit, 'straw_hat');
  assert.equal(buyCosmetic(s, 'moon_suit', T), false, 'pas assez de rubis');
  assert.equal(cosmeticState(s, 'evt_apron_apple', T).buyable, false, 'événement : jamais achetable');
  const june = Date.UTC(2026, 5, 15);
  const oct = Date.UTC(2026, 9, 20);
  assert.equal(cosmeticState(s, 'pumpkin_hat', june).reason, 'season');
  assert.equal(buyCosmetic(s, 'pumpkin_hat', oct), false, '80 rubis, il en reste 70');
  s.player.rubies = 80;
  assert.equal(buyCosmetic(s, 'pumpkin_hat', oct), true, 'Halloween : achetable');
  assert.equal(equipCosmetic(s, 'cat_bow'), false, 'pas à toi');
  const low = save();
  low.player.level = 5;
  low.player.rubies = 100;
  assert.equal(buyCosmetic(low, 'straw_hat', T), false, 'Garde-robe au niveau 6');
});
