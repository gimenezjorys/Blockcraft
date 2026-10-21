// M14 : Défi du jour (G13.3), événements de la semaine (G13.5), saisons (G13.6). Tests essentiels de la mission.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave } from '../../src/save/schema.js';
import { dailySetup, dailyScore, shareText, recordDaily, dailyRivals, dailyRank } from '../../src/game/daily.js';
import { createChallenge } from '../../src/game/daily-game.js';
import { currentEvent, currentSeason, trackEvent, checkEvent } from '../../src/game/weekly-events.js';
import { WEEKLY_EVENTS } from '../../src/data/events.js';
import { utcDay, utcWeek } from '../../src/core/time.js';

const DAY = Date.UTC(2026, 9, 19) / 86400000;

test('défi : identique pour une même date UTC, quelle que soit la partie ; différent le lendemain', () => {
  const a = dailySetup(DAY);
  assert.deepEqual(dailySetup(DAY), a);
  assert.ok(a.furniture.length >= 8 && a.furniture.length <= 10, `${a.furniture.length} meubles imposés`);
  assert.equal(a.waves.waves.length, 5);
  const g1 = createChallenge(defaultSave({ seed: 1, now: 0 }), DAY);
  const g2 = createChallenge(defaultSave({ seed: 999, now: 0 }), DAY);
  assert.deepEqual(g1.shop.layout, g2.shop.layout, 'même boutique pour tout le monde');
  assert.ok(g1.furn.filter((f) => f.id !== 'caisse').every((f) => f.level === 5), 'meubles au niveau 5');
  assert.notDeepEqual(dailySetup(DAY + 1).layout, a.layout);
  assert.deepEqual(dailyRivals(DAY), dailyRivals(DAY));
  assert.equal(dailyRivals(DAY).length, 20);
  assert.ok(dailyRivals(DAY).every((r) => r.score >= 300 && r.score <= 1400));
  assert.equal(dailyRank(DAY, 2000), 1);
  assert.equal(dailyRank(DAY, 0), 21);
});

test('défi : calcul du score et texte de partage', () => {
  assert.equal(dailyScore({ kept: 0.9, caught: 2, noneBroken: true, cleanWaves: 3 }), 900 + 50 + 100 + 150);
  assert.equal(dailyScore({ kept: 1, caught: 0, noneBroken: false, cleanWaves: 0 }), 1000);
  const text = shareText({ day: DAY, stars: 3, score: 1240, waves: ['clean', 'clean', 'caught', 'clean', 'clean'] }, 'fr', 'https://exemple.github.io/fort-boutique/');
  assert.equal(text, 'Fort Boutique — Défi du 19/10/2026 🌙\n★★★ 1 240 pts\n🟩🟩🟨🟩🟩\nhttps://exemple.github.io/fort-boutique/');
  assert.match(shareText({ day: DAY, stars: 1, score: 512, waves: ['lost'] }, 'fr'), /★ 512 pts\n🟥$/);
});

test('défi : une seule tentative récompensée par jour UTC (★★★ 5 rubis + coffre d’argent), puis Entraînement', () => {
  const s = defaultSave({ seed: 3, now: 0 });
  s.player.level = 4;
  const r1 = recordDaily(s, DAY, { score: 1100, stars: 3, waves: ['clean'] });
  assert.equal(r1.first, true);
  assert.equal(r1.reward.rubies, 5);
  assert.equal(r1.reward.chest.type, 'silver');
  const rubies = s.player.rubies;
  const r2 = recordDaily(s, DAY, { score: 1300, stars: 3, waves: ['clean'] });
  assert.equal(r2.first, false);
  assert.equal(r2.reward, null);
  assert.equal(s.player.rubies, rubies);
  assert.equal(s.daily.challenge.scoreToday, 1100, 'le score de la première tentative compte');
  const r3 = recordDaily(s, DAY + 1, { score: 600, stars: 2, waves: ['lost'] });
  assert.deepEqual([r3.first, r3.reward.rubies, r3.reward.chest.type], [true, 3, 'wood']);
  assert.equal(s.daily.challenge.streak, 2);
  assert.equal(recordDaily(s, DAY, { score: 999, stars: 3, waves: [] }).first, false, 'horloge reculée : rien');
});

test('événements : choisis selon la semaine UTC ; défi de la semaine récompensé une fois (puis 20 rubis)', () => {
  for (let w = 2900; w < 2912; w++) {
    const t = (w * 7 - 3) * 86400000 + 3600000; // un lundi de la semaine w
    assert.equal(utcWeek(t), w);
    assert.equal(currentEvent(t).id, WEEKLY_EVENTS[w % 6].id);
    assert.equal(currentEvent(t + 6 * 86400000).id, currentEvent(t).id, 'tout le dimanche aussi');
  }
  const t = (2904 * 7 - 3) * 86400000 + 3600000;
  const ev = currentEvent(t);
  const s = defaultSave({ seed: 3, now: 0 });
  const kind = ev.goal.kind;
  trackEvent(s, kind, ev.goal.n - 1, ev.goal.type, t);
  assert.equal(checkEvent(s, t), null);
  trackEvent(s, kind, 5, ev.goal.type, t);
  assert.equal(checkEvent(s, t).cosmetic, ev.reward);
  assert.equal(checkEvent(s, t), null, 'une seule fois');
  // Semaine suivante du même événement (6 semaines plus tard) : déjà à toi -> 20 rubis.
  const t6 = t + 42 * 86400000;
  trackEvent(s, kind, ev.goal.n, ev.goal.type, t6);
  assert.deepEqual(checkEvent(s, t6), { cosmetic: null, rubies: 20 });
});

test('saisons : selon la date UTC (bornes comprises)', () => {
  const at = (m, d) => currentSeason(Date.UTC(2026, m - 1, d, 12));
  assert.equal(at(10, 14), null);
  assert.equal(at(10, 15).id, 'halloween');
  assert.equal(at(11, 5).id, 'halloween');
  assert.equal(at(11, 6), null);
  assert.equal(at(12, 1).id, 'winter');
  assert.equal(at(12, 31).id, 'winter');
  assert.equal(at(3, 20).id, 'spring');
  assert.equal(at(4, 10).id, 'spring');
  assert.equal(at(7, 1).id, 'summer');
  assert.equal(at(6, 15), null);
  assert.equal(utcDay(Date.UTC(2026, 9, 19)), DAY);
});
