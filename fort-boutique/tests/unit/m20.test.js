// M20 : règles d'équilibrage global — Courage de Mamie qui éclaircit la Pleine Lune, coup de main de Mamie après une
// nuit sous 50 %, Reine Phalène qui visite les lanternes avant la caisse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run } from '../helpers/game.js';
import { defaultShop } from '../../src/save/schema.js';
import { startNight, finishNight } from '../../src/game/night/night.js';
import { spawnMonster } from '../../src/game/night/monsters.js';
import { enterDawn, leaveDawn } from '../../src/game/cycle.js';
import { NIGHT, courageThin, courageAssist } from '../../src/data/night.js';
import { MONSTERS } from '../../src/data/monsters.js';

/** Menace totale des vagues de la nuit (hors boss). */
const threat = (g) => g.night.waves.reduce((a, w) => a + w.groups.reduce((b, gr) => b + gr.count * MONSTERS[gr.type].threat, 0), 0);

function night(k, mutate) {
  const g = newGame(21, (s) => {
    Object.assign(s.shops.q1, { night: k, week: 2 });
    s.stats.nights = 20;
    s.player.level = 8;
    if (mutate) mutate(s.shops.q1);
  });
  for (const f of g.furn) f.eyes = 1;
  startNight(g, { dayTakings: 300 });
  return g;
}

test('Courage de Mamie : la horde de la Pleine Lune s’éclaircit de 25 % par échec, jusqu’à −75 %', () => {
  assert.equal(courageThin(0), 1);
  assert.equal(courageThin(1), 1 - NIGHT.thinPerFail);
  assert.equal(courageThin(10), NIGHT.thinMin);
  // Le Courage continue de monter après le plafond de G8.9 : pas de mur pour qui bute (P4).
  assert.equal(courageAssist(2), 2 * NIGHT.assistPerFail);
  assert.ok(courageAssist(6) > courageAssist(4) && courageAssist(4) > NIGHT.assistMax);
  const full = threat(night(7));
  const thin = threat(night(7, (sh) => { sh.bossAssist = 2; }));
  assert.ok(thin < full * 0.7, `${thin} < 70 % de ${full}`);
});

test('Courage de Mamie : moins d’invocations du boss après des échecs', () => {
  const g = newGame(45, (s) => {
    s.shops.q5 = defaultShop('q5');
    Object.assign(s.shops.q5, { unlocked: true, night: 7, bossAssist: 2 });
    s.shops.q5.layout = [{ id: 'caisse', x: 3, y: 4, rot: 0 }];
    s.currentShop = 'q5';
    s.player.level = 30;
  });
  startNight(g, { dayTakings: 100, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  g.night.thin = courageThin(2);
  g.night.state = 'idle';
  const b = spawnMonster(g, 'reine_phalene', 'windowLeft', { x: 1, y: 1 });
  b.entering = false;
  b.stunT = 1e9;
  const evs = run(g, 8.5, () => { b.x = 1; b.y = 1; });
  const sum = evs.find((e) => e.type === 'boss_summon');
  assert.ok(sum, 'une invocation');
  assert.equal(sum.a, Math.round(4 * courageThin(2)));
});

test('coup de main de Mamie : après une nuit sous 50 %, la nuit suivante a 25 % de horde en moins', () => {
  const g = night(4);
  const base = threat(g);
  g.night.jar = g.night.jarInitial * 0.3;
  finishNight(g, true);
  g.nightResult = g.night.result;
  enterDawn(g);
  leaveDawn(g);
  assert.equal(g.shop.helpNext, true);
  const helped = night(4, (sh) => { sh.helpNext = true; });
  assert.equal(helped.night.help, true);
  assert.ok(threat(helped) < base * 0.9, `${threat(helped)} < 90 % de ${base}`);
  // Une bonne nuit retire l'aide.
  const g2 = night(4, (sh) => { sh.helpNext = true; });
  finishNight(g2, true);
  g2.nightResult = g2.night.result;
  enterDawn(g2);
  leaveDawn(g2);
  assert.equal(g2.shop.helpNext, false);
});

test('Reine Phalène : visite chaque lanterne (et l’éteint) avant d’aller à la caisse', () => {
  const g = newGame(45, (s) => {
    s.shops.q5 = defaultShop('q5');
    Object.assign(s.shops.q5, { unlocked: true, night: 3 });
    s.shops.q5.layout = [{ id: 'caisse', x: 3, y: 4, rot: 0 }, { id: 'lanterne', x: 0, y: 0, rot: 0 }, { id: 'lanterne', x: 4, y: 0, rot: 0 }];
    s.currentShop = 'q5';
    s.player.level = 30;
  });
  startNight(g, { dayTakings: 100, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  g.night.state = 'idle';
  const lamps = g.furn.filter((f) => f.id === 'lanterne');
  const b = spawnMonster(g, 'reine_phalene', 'windowLeft', { x: 0.5, y: 3.5 });
  b.entering = false;
  b.hp = b.maxHp = 1e9;
  let grabAt = -1;
  for (let k = 0; k < 600 && grabAt < 0; k++) {
    const evs = run(g, 0.1, (gg) => { gg.player.x = 6.5; gg.player.y = 7.5; });
    if (evs.some((e) => e.type === 'thief_grab' && e.s === 'reine_phalene')) grabAt = k;
  }
  assert.ok(grabAt > 0, 'elle finit par voler');
  assert.ok(b.lampsSeen && lamps.every((l) => b.lampsSeen.has(l)), 'les deux lanternes visitées avant la caisse');
});
