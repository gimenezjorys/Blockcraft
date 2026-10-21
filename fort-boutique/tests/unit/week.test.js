// M9 : la semaine et la Pleine Lune (G8.9, G10.3, G13.1) — boss, Courage de Mamie, semaines, quartier suivant.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, teleport, count } from '../helpers/game.js';
import { startNight, finishNight } from '../../src/game/night/night.js';
import { spawnMonster, kill } from '../../src/game/night/monsters.js';
import { knockbackAmount } from '../../src/game/night/effects.js';
import { bossOf } from '../../src/game/night/boss.js';
import { enterDawn, leaveDawn, openDawnChest } from '../../src/game/cycle.js';
import { generateNight } from '../../src/game/night/waves.js';
import { districtOpen } from '../../src/game/progression.js';
import { NIGHT } from '../../src/data/night.js';
import { BOSSES } from '../../src/data/monsters.js';
import { unlockCards } from '../../src/ui/screens/unlocks.js';
import { districtStatus } from '../../src/ui/screens/map.js';

/** Nuit 7 sans vagues générées : on fait entrer le boss à la main. */
function bossNight(mutate) {
  const g = newGame(31, (s) => {
    s.shops.q1.night = 7;
    s.progress.flags.firstChestDone = true;
    if (mutate) mutate(s);
  });
  g.shop.phase.dawnClaimed = false;
  startNight(g, { dayTakings: 200, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  g.night.state = 'idle';
  return g;
}

test('nuit 7 : la vague finale contient le Roi Raton, entré par la porte de derrière', () => {
  const ent = newGame().grid.entrances;
  const n = generateNight({ seed: 4, districtId: 'q1', week: 1, night: 7, entrances: ent, boss: 'roi_raton' });
  assert.equal(n.waves[n.waves.length - 1].boss, 'roi_raton');
  assert.ok(n.waves.slice(0, -1).every((w) => !w.boss));
  const g = bossNight();
  assert.equal(g.night.isBoss, true);
  const m = spawnMonster(g, 'roi_raton', 'backdoor');
  assert.equal(bossOf(g), m);
  assert.equal(m.maxHp, BOSSES.roi_raton.hp, 'PV de la semaine 1');
});

test('Roi Raton : invoque 3 ratons toutes les 6 s, immunisé au recul', () => {
  const g = bossNight();
  const m = spawnMonster(g, 'roi_raton', 'backdoor');
  m.hp = m.maxHp = 1e7; // ne meurt pas pendant le test
  m.stunT = 100; // reste sur place : il n'atteint pas la caisse (un voleur n'invoque plus)
  teleport(g, 0.5, 5.5);
  const ev = run(g, 12.2);
  assert.equal(count(ev, 'boss_summon'), 2);
  // Ratons apparus (M13 : plus rapides, certains volent et repartent avant la fin : on compte les apparitions).
  const ratons = ev.filter((e) => e.type === 'monster_spawn' && e.s === 'raton').length;
  assert.ok(ratons >= 6, `${ratons} ratons invoqués`);
  assert.equal(knockbackAmount(m, 1), 0);
});

test('le boss vole 35 % du Bocal et fuit à 0,75 case/s ; le vaincre pendant sa fuite rend tout (victoire)', () => {
  const g = bossNight((s) => { s.shops.q1.layout = s.shops.q1.layout.filter((it) => it.id === 'caisse'); });
  const n = g.night;
  const m = spawnMonster(g, 'roi_raton', 'backdoor');
  m.hp = m.maxHp = 1e7;
  m.summonT = 1e9; // pas d'invocation ici
  teleport(g, 0.5, 5.5);
  for (let i = 0; i < 60 * 60 && !m.thief; i++) run(g, 1 / 60);
  assert.equal(m.thief, true, 'le Roi Raton a volé');
  assert.equal(m.carry, Math.round(0.35 * n.jarInitial));
  const x0 = m.x;
  const y0 = m.y;
  run(g, 1);
  const v = Math.hypot(m.x - x0, m.y - y0);
  assert.ok(v > 0.5 && v <= 0.75 + 1e-6, `fuite à ${v.toFixed(2)} case/s`);
  kill(g, m, null);
  finishNight(g, false);
  assert.equal(n.result.bossWin, true);
  assert.ok(n.jar >= n.jarInitial, 'le sac revient au Bocal (+10 %)');
});

test('échec : 0 étoile, pas de coffre, la Pleine Lune revient avec le Courage de Mamie (+18,75 % par échec, 75 % au plus, M16)', () => {
  const g = bossNight();
  g.night.bossEscaped = true;
  finishNight(g, false);
  g.nightResult = g.night.result;
  assert.equal(g.night.result.stars, 0);
  assert.equal(g.night.result.bossWin, false);
  const dawn = enterDawn(g);
  assert.equal(dawn.chest, null, 'pas de Coffre de Lune');
  leaveDawn(g);
  assert.equal(g.shop.night, 7, 'la Pleine Lune revient');
  assert.equal(g.shop.week, 1);
  assert.equal(g.shop.bossAssist, 1);
  for (let i = 0; i < 6; i++) {
    g.shop.phase.dawnClaimed = false;
    startNight(g, { dayTakings: 200, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
    assert.ok(Math.abs(g.night.assist - Math.min(NIGHT.assistMax, NIGHT.assistPerFail * g.shop.bossAssist)) < 1e-9);
    g.night.bossEscaped = true;
    finishNight(g, false);
    g.nightResult = g.night.result;
    enterDawn(g);
    leaveDawn(g);
  }
  g.shop.phase.dawnClaimed = false;
  startNight(g, { dayTakings: 200, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  assert.equal(g.night.assist, NIGHT.assistMax, 'plafonné');
  assert.equal(NIGHT.assistMax, 0.75);
});

test('victoire : Coffre de Lune, semaine 2 (nuit 1), PV du boss × 1,35, Courage remis à zéro', () => {
  const g = bossNight((s) => { s.shops.q1.bossAssist = 2; });
  g.night.bossKilled = true;
  finishNight(g, false);
  g.nightResult = g.night.result;
  const dawn = enterDawn(g);
  assert.equal(dawn.chest.type, 'moon');
  const c = openDawnChest(g);
  assert.ok(c.coins >= 600, 'Coffre de Lune : 600 × m_Q pièces');
  assert.equal(c.cosmetic, 'moon_q1', 'cosmétique du quartier la première fois');
  leaveDawn(g);
  assert.deepEqual([g.shop.week, g.shop.night, g.shop.bossAssist, g.shop.bossBeatenCount], [2, 1, 0, 1]);
  assert.equal(g.save.stats.bossKills.roi_raton, 1);
  // Semaine 2 : toutes les entrées et tous les types, boss plus solide.
  g.shop.night = 7;
  g.shop.phase.dawnClaimed = false;
  startNight(g, { dayTakings: 200, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  assert.ok(Math.abs(spawnMonster(g, 'roi_raton', 'backdoor').maxHp - BOSSES.roi_raton.hp * 1.35) < 1e-6);
});

test('quartier suivant : seulement si le boss est vaincu ET le niveau atteint (carte au Matin)', () => {
  // Victoire au niveau 6 : rien ne s'ouvre encore.
  let g = bossNight((s) => { s.player.level = 6; });
  g.night.bossKilled = true;
  finishNight(g, false);
  g.nightResult = g.night.result;
  enterDawn(g);
  leaveDawn(g);
  assert.equal(districtOpen(g.save, 'q2'), false);
  assert.deepEqual(g.save.progress.pendingDistricts, []);
  assert.equal(districtStatus(g.save, 'q2', 'q1', ['q1']), 'level', 'la carte affiche « Niveau 7 requis »');
  g.save.player.level = 7;
  assert.deepEqual(unlockCards([7], { save: g.save }).filter((x) => x.id === 'q2').length, 1, 'au niveau 7, la carte du quartier arrive');
  // Victoire au niveau 7 : le quartier 2 s'ouvre et se fête.
  g = bossNight((s) => { s.player.level = 7; });
  g.night.bossKilled = true;
  finishNight(g, false);
  g.nightResult = g.night.result;
  enterDawn(g);
  leaveDawn(g);
  assert.equal(districtOpen(g.save, 'q2'), true);
  assert.deepEqual(g.save.progress.pendingDistricts, ['q2']);
  assert.equal(g.save.shops.q2.unlocked, true);
  const cards = unlockCards([], { save: g.save, districts: ['q2'] });
  assert.equal(cards[0].id, 'q2');
  assert.equal(districtStatus(g.save, 'q2', 'q1', ['q1']), 'soon', 'contenu du quartier 2 en M16');
  assert.equal(districtStatus(g.save, 'q2', 'q1', ['q1', 'q2']), 'open');
  assert.equal(districtStatus(g.save, 'q3', 'q1', ['q1']), 'boss');
  // Sans boss vaincu, le niveau seul ne suffit pas : pas de carte de quartier.
  const fresh = newGame(1, (s) => { s.player.level = 7; });
  assert.equal(unlockCards([7], { save: fresh.save }).some((x) => x.id === 'q2'), false);
});
