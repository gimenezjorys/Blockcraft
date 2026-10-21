// M12 : quêtes, calendrier, série, succès, bestiaire (G14, G15). Tests essentiels de la mission.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave } from '../../src/save/schema.js';
import { refreshQuests, trackQuest } from '../../src/game/quest-track.js';
import { claimQuest, rerollQuest, claimWeekly } from '../../src/game/quests.js';
import { calendarState, claimCalendar } from '../../src/game/calendar.js';
import { recordNight, streakCheck, streakBonus, relightStreak } from '../../src/game/streak.js';
import { checkAchievements } from '../../src/game/achievements.js';
import { checkBestiary } from '../../src/game/bestiary.js';
import { fakeClock } from '../helpers/clock.js';

const DAY = 86400000;
const T0 = 20000 * DAY + 5 * 3600000; // un jour UTC, 5 h du matin

function save(level = 4, seed = 7) {
  const s = defaultSave({ seed, now: 0 });
  s.player.level = level;
  s.shops.q1.day = 5;
  s.shops.q1.layout.push({ id: 'frigo', x: 0, y: 0, rot: 0 });
  return s;
}

test('quêtes : tirage à graine par jour UTC, jamais de quête impossible, relance gratuite une fois', () => {
  const a = save();
  const b = save();
  refreshQuests(a, T0);
  refreshQuests(b, T0 + 6 * 3600000);
  assert.equal(a.daily.quests.list.length, 3);
  assert.deepEqual(a.daily.quests.list, b.daily.quests.list, 'même graine, même jour UTC : mêmes quêtes');
  const days = new Set();
  for (let k = 0; k < 30; k++) {
    const s = save();
    refreshQuests(s, T0 + k * DAY);
    const ids = s.daily.quests.list.map((q) => q.id);
    days.add(ids.join());
    assert.ok(!ids.includes('daily'), 'Défi du jour pas encore disponible (M14)');
  }
  assert.ok(days.size > 10, 'le tirage change avec le jour');
  // Une quête impossible n'est jamais tirée : ni Commande spéciale avant le jour 3, ni aménagement avant le niveau 3.
  for (let k = 0; k < 30; k++) {
    const s = save();
    s.player.level = 4;
    s.shops.q1.day = 2;
    refreshQuests(s, T0 + k * DAY);
    assert.ok(!s.daily.quests.list.some((q) => q.id === 'order'));
  }
  // Niveau 3 : pas encore de quêtes (niveau 4).
  const low = save(3);
  refreshQuests(low, T0);
  assert.equal(low.daily.quests.list.length, 0);
  // Relance : une gratuite, puis refusée sans pub.
  const before = a.daily.quests.list[0].id;
  assert.equal(rerollQuest(a, 0), true);
  assert.notEqual(a.daily.quests.list[0].id, before);
  assert.equal(new Set(a.daily.quests.list.map((q) => q.id)).size, 3, 'pas de doublon');
  assert.equal(rerollQuest(a, 1), false);
  // Le lendemain : nouvelles quêtes ; une horloge qui recule ne redonne rien.
  refreshQuests(a, T0 + DAY);
  const next = JSON.stringify(a.daily.quests.list);
  refreshQuests(a, T0);
  assert.equal(JSON.stringify(a.daily.quests.list), next);
});

test('quêtes : suivi et récompenses exactes dans l’ordre des réclamations (+5 rubis pour les 3)', (t) => {
  const clock = fakeClock(T0);
  t.after(() => clock.restore());
  const s = save();
  refreshQuests(s, T0);
  s.daily.quests.list = [
    { id: 'serve', kind: 'serve', goal: 40, progress: 0, claimed: false },
    { id: 'takings', kind: 'takings', goal: 150, progress: 0, claimed: false, max: true },
    { id: 'chests', kind: 'chest', goal: 2, progress: 2, claimed: false },
  ];
  for (let i = 0; i < 39; i++) trackQuest(s, 'serve');
  trackQuest(s, 'takings', 120);
  trackQuest(s, 'takings', 90);
  assert.equal(s.daily.quests.list[0].progress, 39);
  assert.equal(s.daily.quests.list[1].progress, 120, 'recette : la meilleure journée, pas la somme');
  assert.equal(claimQuest(s, 0), null, 'pas encore finie');
  trackQuest(s, 'serve');
  trackQuest(s, 'takings', 151);
  const p0 = { ...s.player };
  const r1 = claimQuest(s, 2);
  assert.equal(r1.reward.coins, 80);
  assert.equal(r1.reward.plans.length, 1);
  assert.equal(r1.reward.plans[0][1], 4);
  assert.equal(s.player.coins - p0.coins, 80);
  assert.equal(s.player.xp - p0.xp, 40);
  assert.equal(claimQuest(s, 2), null, 'une seule fois');
  const r2 = claimQuest(s, 0);
  assert.deepEqual([r2.reward.rubies, r2.reward.kibble], [3, 2]);
  const chests = s.stats.chestsOpened;
  const rubies = s.player.rubies;
  const r3 = claimQuest(s, 1);
  assert.equal(r3.reward.chest.type, 'silver');
  assert.equal(s.stats.chestsOpened, chests + 1);
  assert.equal(r3.bonus.rubies, 5);
  assert.equal(s.player.rubies - rubies, 5 + r3.reward.chest.rubies);
  // Semaine (niveau 8) : coffre d'or par quête.
  const w = save(8);
  refreshQuests(w, T0);
  assert.equal(w.daily.weekly.list.length, 4, 'les Défis du jour arrivent en M14');
  trackQuest(w, 'moon');
  assert.equal(claimWeekly(w, 0).reward.chest.type, 'gold');
});

test('calendrier : une seule réclamation par jour UTC, jours non consécutifs, horloge reculée refusée', () => {
  const s = save(2);
  assert.equal(claimCalendar(save(1), T0), null, 'niveau 2 requis');
  const r1 = claimCalendar(s, T0);
  assert.equal(r1.day, 1);
  assert.equal(r1.reward.coins, 150);
  assert.equal(s.player.coins, 150);
  assert.equal(claimCalendar(s, T0 + 3600000), null, 'déjà réclamé aujourd’hui');
  assert.equal(calendarState(s, T0).claimedToday, true);
  assert.equal(claimCalendar(s, T0 + DAY).reward.chest.type, 'silver');
  assert.equal(claimCalendar(s, T0 + 5 * DAY).reward.rubies, 10, 'J3 après des jours sans venir');
  assert.equal(claimCalendar(s, T0 + 2 * DAY), null, 'horloge reculée : rien');
  // J4 : 20 plans pour le meuble choisi.
  const r4 = claimCalendar(s, T0 + 6 * DAY, 'frigo');
  assert.deepEqual(r4.reward.plans, [['frigo', 20]]);
  claimCalendar(s, T0 + 7 * DAY);
  claimCalendar(s, T0 + 8 * DAY);
  const r7 = claimCalendar(s, T0 + 9 * DAY);
  assert.equal(r7.day, 7);
  assert.equal(r7.reward.chest.type, 'moon');
  assert.ok(s.cosmetics.owned.includes('cal_apron_stars'), 'cosmétique du calendrier');
  assert.equal(claimCalendar(s, T0 + 10 * DAY).day, 1, 'le cycle recommence');
});

test('série : +1 par jour UTC, gel offert à 7 jours et consommé automatiquement, rallumage pendant 48 h', () => {
  const s = save();
  assert.equal(recordNight(s, T0).count, 1);
  assert.equal(recordNight(s, T0 + 3600000), null, 'une seule fois par jour');
  let last;
  for (let k = 1; k < 7; k++) last = recordNight(s, T0 + k * DAY);
  assert.equal(last.count, 7);
  assert.equal(last.freeze, true);
  assert.equal(last.rubies, 15, 'palier 7 jours');
  assert.equal(s.daily.streak.freezes, 1);
  assert.equal(streakBonus(s, T0 + 6 * DAY), 0.14);
  // Jour 8 manqué : le gel le couvre tout seul.
  assert.deepEqual(streakCheck(s, T0 + 8 * DAY), { frozen: 1, broken: false });
  assert.equal(s.daily.streak.freezes, 0);
  assert.equal(recordNight(s, T0 + 8 * DAY).count, 8);
  // Deux jours manqués sans gel : la flamme s'éteint, on peut la rallumer (20 rubis) pendant 48 h.
  const r = recordNight(s, T0 + 11 * DAY);
  assert.equal(r.count, 1);
  assert.equal(s.daily.streak.brokenCount, 8);
  s.player.rubies = 25;
  assert.equal(relightStreak(s, T0 + 14 * DAY), false, 'plus de 48 h : trop tard');
  assert.equal(relightStreak(s, T0 + 11 * DAY + 3600000), true);
  assert.equal(s.player.rubies, 5);
  assert.equal(s.daily.streak.count, 9, 'la nuit de ce jour compte en plus');
  assert.equal(recordNight(s, T0 + 12 * DAY).count, 10);
  assert.equal(streakBonus(s, T0 + 12 * DAY), 0.2, 'au plus +20 %');
});

test('succès et bestiaire : déclenchés une seule fois, rubis exacts, rétroactifs au niveau 6', () => {
  const s = save(5);
  s.stats.sold = 1200;
  s.collections.bestiary.raton = 260;
  assert.deepEqual(checkAchievements(s, T0), [], 'succès au niveau 6');
  assert.deepEqual(checkBestiary(s), []);
  s.player.level = 6;
  const got = checkAchievements(s, T0).map((a) => a.id);
  assert.ok(got.includes('sold_100') && got.includes('sold_1000') && !got.includes('sold_10000'));
  const r0 = s.player.rubies;
  assert.deepEqual(checkAchievements(s, T0), [], 'une seule fois');
  assert.equal(s.player.rubies, r0);
  const tiers = checkBestiary(s);
  assert.deepEqual(tiers.map((x) => x.rubies), [2, 5]);
  assert.deepEqual(checkBestiary(s), []);
  s.collections.bestiary.raton = 2500;
  assert.deepEqual(checkBestiary(s).map((x) => x.rubies), [10]);
});
