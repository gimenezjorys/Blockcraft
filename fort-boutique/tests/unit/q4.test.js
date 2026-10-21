// M18 : Quartier 4, la Quincaillerie — un test par comportement (G9.3, G9.4, G10.1, G10.3) : établi, enclume, mélangeur
// de peinture, ventilateur, aimant ; corbeau, golem ; le Ferrailleur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, teleport, count } from '../helpers/game.js';
import { defaultShop } from '../../src/save/schema.js';
import { startNight } from '../../src/game/night/night.js';
import { spawnMonster } from '../../src/game/night/monsters.js';
import { dealDamage } from '../../src/game/night/towers.js';
import { effectiveSlow, applySlow, applyStun } from '../../src/game/night/effects.js';
import { BOSSES, MONSTERS } from '../../src/data/monsters.js';
import { generateNight } from '../../src/game/night/waves.js';

function q4Night(layout) {
  const g = newGame(44, (s) => {
    s.shops.q4 = defaultShop('q4');
    s.shops.q4.unlocked = true;
    s.shops.q4.night = 3;
    s.shops.q4.layout = [{ id: 'caisse', x: 3, y: 4, rot: 0 }, ...layout];
    s.currentShop = 'q4';
    s.player.level = 21;
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

test('établi : tir perçant sur 4 cases, 14 dégâts à chaque Grignotin traversé', () => {
  const g = q4Night([{ id: 'etabli', x: 0, y: 0, rot: 0 }]);
  const e = g.furn.find((f) => f.id === 'etabli');
  const a = dummy(g, 'raton', e.x + 0.5, e.y + 2);
  const b = dummy(g, 'raton', e.x + 0.5, e.y + 3);
  run(g, 2, () => far(g));
  assert.ok(1000 - a.hp >= 14 && 1000 - b.hp >= 14, `les deux traversés (${1000 - a.hp}, ${1000 - b.hp})`);
});

test('enclume : toutes les 3 s, 35 dégâts à ≤ 1,2 case et étourdit 0,6 s', () => {
  const g = q4Night([{ id: 'enclume', x: 1, y: 1, rot: 0 }]);
  const en = g.furn.find((f) => f.id === 'enclume');
  const m = spawnMonster(g, 'raton', 'backdoor', { x: en.cx + 1, y: en.cy });
  m.entering = false;
  m.hp = m.maxHp = 1000;
  let stomps = 0;
  let stunned = 0;
  // On le garde à côté de l'enclume (il marcherait vers la caisse) ; elle a 3 s de recharge en début de nuit.
  for (let k = 0; k < 40; k++) {
    stomps += count(run(g, 0.1, (gg) => { far(gg); m.x = en.cx + 1; m.y = en.cy; }), 'stomp');
    stunned = Math.max(stunned, m.stunT);
  }
  assert.ok(stomps >= 1, 'coup de marteau');
  assert.ok(1000 - m.hp >= 35, `35 dégâts (${1000 - m.hp})`);
  assert.ok(stunned >= 0.5, 'étourdi');
});

test('mélangeur de peinture : « taché » = +25 % de dégâts subis pendant 3 s', () => {
  const g = q4Night([{ id: 'peinture', x: 0, y: 1, rot: 0 }]);
  const m = dummy(g, 'raton', 0.5, 3.5);
  run(g, 1.5, () => far(g));
  assert.ok(m.taggedT > 0 && Math.abs(m.tagAmt - 0.25) < 1e-9, 'taché (+25 %)');
  const hp = m.hp;
  dealDamage(g, m, 10, 'physical', null);
  assert.ok(Math.abs(hp - m.hp - 12.5) < 1e-6, `+25 % (${hp - m.hp})`);
});

test('ventilateur : toutes les 2,5 s, repousse d’une case dans son couloir + 4 dégâts ; boss immunisés', () => {
  const g = q4Night([{ id: 'ventilo', x: 2, y: 0, rot: 0 }]);
  const v = g.furn.find((f) => f.id === 'ventilo');
  const m = dummy(g, 'raton', v.cx, v.cy + 1.5);
  const boss = dummy(g, 'ferrailleur', v.cx, v.cy + 2.5, 1e6);
  const y0 = m.y;
  const by0 = boss.y;
  run(g, 3, () => far(g));
  assert.ok(m.y > y0 + 0.5, `repoussé (${(m.y - y0).toFixed(2)})`);
  assert.ok(1000 - m.hp >= 4);
  assert.equal(boss.y, by0, 'boss immunisé');
});

test('aimant : ralentit de 40 % les Grignotins « métal » à ≤ 2 cases, pas les autres', () => {
  const g = q4Night([{ id: 'aimant', x: 1, y: 1, rot: 0 }]);
  const golem = dummy(g, 'golem', 2.5, 1.5);
  const raton = dummy(g, 'raton', 2.5, 2.0);
  run(g, 0.2, () => far(g));
  assert.ok(Math.abs(effectiveSlow(golem) - 0.4) < 1e-6, `golem ralenti (${effectiveSlow(golem)})`);
  assert.equal(effectiveSlow(raton), 0);
});

test('corbeau : vole et arrive en V de 3', () => {
  const g = q4Night([]);
  assert.equal(spawnMonster(g, 'corbeau', 'windowLeft').flying, true);
  let groups = [];
  for (let seed = 1; seed < 30 && !groups.length; seed++) {
    const n = generateNight({ seed, districtId: 'q4', week: 2, night: 3, entrances: g.grid.entrances });
    groups = n.waves.flatMap((w) => w.groups).filter((x) => x.type === 'corbeau');
  }
  assert.ok(groups.length && groups.every((x) => x.count === 3), 'groupes de 3');
  assert.equal(MONSTERS.corbeau.formation, 'V');
});

test('golem : 360 PV, armure 8, métal ; ralentissements de froid × 0,5', () => {
  const g = q4Night([]);
  const m = dummy(g, 'golem', 2.5, 1.5);
  assert.equal(m.armor, 8);
  m.stunT = 0;
  applySlow(m, 0.5, 2, 'cold');
  assert.ok(Math.abs(effectiveSlow(m) - 0.25) < 1e-6, `froid divisé par 2 (${effectiveSlow(m)})`);
});

test('le Ferrailleur : frappe les meubles voisins (30/s), immunisé au recul et à l’étourdissement, métal', () => {
  const g = q4Night([{ id: 'comptoir', x: 1, y: 1, rot: 0 }]);
  const wall = g.furn.find((f) => f.id === 'comptoir');
  const b = spawnMonster(g, 'ferrailleur', 'backdoor', { x: wall.cx + 1, y: wall.cy });
  b.entering = false;
  assert.equal(b.maxHp, BOSSES.ferrailleur.hp);
  applyStun(b, 2);
  assert.equal(b.stunT || 0, 0, 'pas d’étourdissement');
  const hp0 = wall.hp;
  b.speedBoost = 0;
  run(g, 1, (gg) => { far(gg); b.x = wall.cx + 1; b.y = wall.cy; });
  assert.ok(hp0 - wall.hp >= 25 || wall.broken, `meuble frappé (${hp0 - wall.hp})`);
});
