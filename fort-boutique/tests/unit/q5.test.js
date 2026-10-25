// M19 : Quartier 5, l'Emporium — un test par comportement (G9.3, G9.4, G10.1, G10.3) : distributeur de bonbons, boule de
// cristal, pupitre à grimoires, horloge de Mamie ; phalène ; la Reine Phalène.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, teleport, count } from '../helpers/game.js';
import { defaultShop } from '../../src/save/schema.js';
import { startNight } from '../../src/game/night/night.js';
import { spawnMonster } from '../../src/game/night/monsters.js';
import { effectiveSlow } from '../../src/game/night/effects.js';
import { BOSSES } from '../../src/data/monsters.js';

function q5Night(layout) {
  const g = newGame(45, (s) => {
    s.shops.q5 = defaultShop('q5');
    s.shops.q5.unlocked = true;
    s.shops.q5.night = 3;
    s.shops.q5.layout = [{ id: 'caisse', x: 3, y: 4, rot: 0 }, ...layout];
    s.currentShop = 'q5';
    s.player.level = 30;
  });
  for (const f of g.furn) f.eyes = 1;
  startNight(g, { dayTakings: 100, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  g.night.state = 'idle';
  teleport(g, 4.5, 0.5);
  return g;
}
const far = (g) => teleport(g, 4.5, 0.5);
function dummy(g, type, x, y, hp = 1000) {
  const m = spawnMonster(g, type, 'backdoor', { x, y });
  m.entering = false;
  m.hp = m.maxHp = hp;
  m.stunT = 1e9;
  return m;
}

test('distributeur de bonbons : mitraille sur 3 cibles à la fois', () => {
  const g = q5Night([{ id: 'bonbons', x: 1, y: 1, rot: 0 }]);
  const ms = [dummy(g, 'raton', 1.5, 3.0), dummy(g, 'raton', 2.5, 2.5), dummy(g, 'raton', 0.5, 2.8), dummy(g, 'raton', 3.5, 1.5)];
  run(g, 1.2, () => far(g));
  assert.ok(ms.filter((m) => m.hp < 1000).length >= 3, 'au moins 3 cibles touchées');
});

test('boule de cristal : rayon de 10/s qui monte de 50 % par seconde sur la même cible (× 4 au plus)', () => {
  const g = q5Night([{ id: 'cristal', x: 1, y: 1, rot: 0 }]);
  const m = dummy(g, 'raton', 1.5, 3.2, 1e6);
  run(g, 1, () => far(g));
  const first = 1e6 - m.hp;
  run(g, 1, () => far(g));
  const second = 1e6 - m.hp - first;
  assert.ok(first >= 9, `première seconde (${first.toFixed(1)})`);
  assert.ok(second > first * 1.3, `la deuxième seconde fait plus (${second.toFixed(1)})`);
});

test('pupitre à grimoires : page à tête chercheuse qui rebondit sur 3 cibles', () => {
  const g = q5Night([{ id: 'pupitre', x: 1, y: 1, rot: 0 }]);
  const ms = [dummy(g, 'raton', 1.5, 3.0), dummy(g, 'raton', 2.5, 3.2), dummy(g, 'raton', 3.3, 2.4)];
  run(g, 2.5, () => far(g));
  assert.ok(ms.filter((m) => m.hp < 1000).length >= 2, 'le rebond touche plusieurs Grignotins');
});

test('horloge de Mamie : ralentit de 30 % à ≤ 2 cases ; toutes les 10 s, étourdit 0,8 s', () => {
  const g = q5Night([{ id: 'horloge', x: 1, y: 1, rot: 0 }]);
  const h = g.furn.find((f) => f.id === 'horloge');
  const m = spawnMonster(g, 'raton', 'backdoor', { x: h.cx + 1, y: h.cy });
  m.entering = false;
  m.hp = m.maxHp = 1e6;
  let slow = 0;
  let stunned = 0;
  for (let k = 0; k < 110; k++) {
    run(g, 0.1, (gg) => { far(gg); m.x = h.cx + 1; m.y = h.cy; });
    slow = Math.max(slow, effectiveSlow(m));
    stunned = Math.max(stunned, m.stunT || 0);
  }
  assert.ok(Math.abs(slow - 0.3) < 1e-6, `ralenti 30 % (${slow})`);
  assert.ok(stunned >= 0.7, `étourdi (${stunned})`);
});

test('phalène : vole, attirée par les lanternes qu’elle attaque (6/s)', () => {
  const g = q5Night([{ id: 'lanterne', x: 0, y: 1, rot: 0 }]);
  const lamp = g.furn.find((f) => f.id === 'lanterne');
  const p = spawnMonster(g, 'phalene', 'windowRight');
  p.hp = p.maxHp = 1e6;
  assert.equal(p.flying, true);
  const hp0 = lamp.hp;
  run(g, 12, () => far(g));
  assert.ok(lamp.hp < hp0 || lamp.broken, `la lanterne est attaquée (${hp0 - lamp.hp})`);
});

test('la Reine Phalène : vole, éteint les lanternes à ≤ 2 cases (4 s toutes les 9 s), invoque 4 chauves-souris toutes les 8 s', () => {
  const g = q5Night([{ id: 'lanterne', x: 1, y: 1, rot: 0 }]);
  const lamp = g.furn.find((f) => f.id === 'lanterne');
  const b = spawnMonster(g, 'reine_phalene', 'windowLeft', { x: lamp.cx + 1, y: lamp.cy });
  b.entering = false;
  b.stunT = 1e9;
  assert.equal(b.flying, true);
  assert.equal(b.maxHp, BOSSES.reine_phalene.hp);
  let doused = false;
  let summons = 0;
  for (let k = 0; k < 95; k++) {
    summons += count(run(g, 0.1, (gg) => { far(gg); b.x = lamp.cx + 1; b.y = lamp.cy; }), 'boss_summon');
    if (lamp.doused > 0) doused = true;
  }
  assert.ok(doused, 'lanterne éteinte');
  assert.equal(summons, 1, 'une invocation en 9,5 s');
  assert.ok(g.night.monsters.active.filter((m) => m.type === 'chauvesouris').length >= 4);
});
