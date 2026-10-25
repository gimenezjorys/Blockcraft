// M19 : Nuit sans fin (G13.2) et Franchise de quartier (G13.4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run } from '../helpers/game.js';
import { defaultSave } from '../../src/save/schema.js';
import { startNight } from '../../src/game/night/night.js';
import { ENDLESS, FRANCHISE } from '../../src/data/balance.js';
import { endlessWave, createEndless, startEndlessNight, recordEndless, endlessRivals } from '../../src/game/endless.js';
import { canFranchise, startFranchise, franchiseBossWin, redMoonMult, franchiseSalesBonus } from '../../src/game/franchise.js';
import { achievementMetric } from '../../src/game/achievements.js';

const DAY = 86400000;
const T = 1792411200000;
const size = (w) => w.groups.reduce((a, gr) => a + gr.count, 0);
const level16 = (s) => {
  s.player.level = 16;
  s.shops.q1.bossBeatenCount = 1;
};

test('Nuit sans fin : les vagues grossissent, les PV aussi', () => {
  const g = newGame(7, level16);
  assert.ok(size(endlessWave(1, 'q1', 12, g.grid.entrances)) > 2 * size(endlessWave(1, 'q1', 1, g.grid.entrances)));
  const eg = createEndless(g.save, 'q1', T);
  startEndlessNight(eg);
  const hp1 = eg.night.hpMult;
  const w5 = eg.night.endless.next(eg, 5);
  assert.ok(size(w5) > 0);
  assert.ok(Math.abs(eg.night.hpMult / hp1 - ENDLESS.hpGrowth ** 4) < 1e-9);
});

test('Nuit sans fin : la partie dure tant que le Bocal tient, la vraie partie ne change pas', () => {
  const g = newGame(7, level16);
  const before = JSON.stringify(g.save);
  const eg = createEndless(g.save, 'q1', T);
  startEndlessNight(eg);
  assert.equal(eg.night.jar, ENDLESS.jar);
  run(eg, 900);
  assert.ok(eg.night.ended, 'finie');
  assert.ok(eg.night.jar <= 0, 'Bocal vide');
  assert.ok(eg.night.waves.length >= 2, 'des vagues ajoutées en route');
  assert.equal(eg.night.result.endlessHeld, eg.night.endless.held);
  assert.equal(JSON.stringify(g.save), before);
});

test('Nuit sans fin : record, un coffre toutes les 5 vagues, 3 par jour', () => {
  const s = defaultSave({ seed: 3, now: 0 });
  let r = recordEndless(s, 12, T);
  assert.equal(r.chests.length, 2);
  assert.ok(r.newBest);
  assert.equal(r.best, 12);
  r = recordEndless(s, 11, T);
  assert.equal(r.chests.length, 1, 'plafond du jour');
  assert.equal(r.newBest, false);
  assert.equal(recordEndless(s, 30, T).chests.length, 0);
  assert.equal(recordEndless(s, 7, T + DAY).chests.length, 1, 'le lendemain, on repart');
  assert.equal(achievementMetric(s, 'endlessBest'), 30);
});

test('Nuit sans fin : 15 rivaux simulés, les mêmes toute la semaine', () => {
  const s = defaultSave({ seed: 3, now: 0 });
  const a = endlessRivals(s, T);
  assert.equal(a.length, ENDLESS.rivals);
  assert.deepEqual(endlessRivals(s, T + 3600000), a);
  assert.ok(a.every((x, i) => i === 0 || a[i - 1].score >= x.score));
});

test('Franchise : boss vaincu requis, semaine 1, Lune rouge, une étoile par boss battu', () => {
  const s = defaultSave({ seed: 3, now: 0 });
  s.player.level = 16;
  assert.equal(canFranchise(s, 'q1').reason, 'boss');
  s.shops.q1.bossBeatenCount = 1;
  s.shops.q1.week = 3;
  s.shops.q1.night = 5;
  assert.ok(startFranchise(s, 'q1'));
  const sh = s.shops.q1;
  assert.deepEqual([sh.week, sh.night, sh.redMoon], [1, 1, true]);
  assert.equal(canFranchise(s, 'q1').reason, 'running');
  assert.equal(redMoonMult(sh), FRANCHISE.redMoonBase);
  assert.ok(franchiseBossWin(sh));
  assert.deepEqual([sh.franchiseStars, sh.redMoon, redMoonMult(sh)], [1, false, 1]);
  assert.ok(Math.abs(franchiseSalesBonus(sh) - FRANCHISE.salesPerStar) < 1e-9);
  startFranchise(s, 'q1');
  assert.equal(redMoonMult(sh), FRANCHISE.redMoonBase + FRANCHISE.redMoonPerStar);
  sh.franchiseStars = FRANCHISE.maxStars;
  sh.redMoon = false;
  assert.equal(canFranchise(s, 'q1').reason, 'max');
  assert.equal(achievementMetric(s, 'franchiseStars'), FRANCHISE.maxStars);
});

test('Franchise : la Lune rouge renforce les Grignotins de la nuit', () => {
  const hp = (red) => {
    const g = newGame(7, (s) => {
      s.shops.q1.redMoon = red;
      s.shops.q1.night = 2;
    });
    startNight(g, { dayTakings: 100 });
    return g.night.hpMult;
  };
  assert.ok(Math.abs(hp(true) / hp(false) - FRANCHISE.redMoonBase) < 1e-9);
});
