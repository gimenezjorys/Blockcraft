// M16 : Quartier 2, la Boulangerie — un test par comportement (G9.4, G10.1, G10.3) : four, pétrin, vitrine, machine à
// café ; chauve-souris, hérisson, champiboum ; la Grande Pâte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, teleport, count } from '../helpers/game.js';
import { defaultShop } from '../../src/save/schema.js';
import { startNight } from '../../src/game/night/night.js';
import { spawnMonster } from '../../src/game/night/monsters.js';
import { dealDamage } from '../../src/game/night/towers.js';
import { applySlow, effectiveSlow } from '../../src/game/night/effects.js';
import { BOSSES } from '../../src/data/monsters.js';

/** Nuit de la Boulangerie sans vagues, disposition donnée (la caisse en bas à droite). */
function q2Night(layout, mutate) {
  const g = newGame(41, (s) => {
    s.shops.q2 = defaultShop('q2');
    s.shops.q2.unlocked = true;
    s.shops.q2.layout = [{ id: 'caisse', x: 3, y: 4, rot: 0 }, ...layout];
    s.currentShop = 'q2';
    s.player.level = 10;
    if (mutate) mutate(s);
  });
  for (const f of g.furn) f.eyes = 1;
  startNight(g, { dayTakings: 100, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  g.night.state = 'idle';
  teleport(g, 4.5, 0.5);
  return g;
}

/** Grignotin immobile (étourdi) avec beaucoup de PV, à une position donnée. */
function dummy(g, type, x, y) {
  const m = spawnMonster(g, type, 'backdoor', { x, y });
  m.entering = false;
  m.hp = m.maxHp = 1000;
  m.stunT = 1e9;
  return m;
}

test('four : cône de 90° sur 2,2 cases devant lui, 5 ticks/s de 2 dégâts et brûlure ; rien derrière', () => {
  const g = q2Night([{ id: 'four', x: 1, y: 1, rot: 0 }]);
  const four = g.furn.find((f) => f.id === 'four');
  const front = dummy(g, 'raton', four.cx, four.y + four.h + 1);
  const behind = dummy(g, 'raton', four.cx, four.y - 0.6);
  run(g, 1, () => teleport(g, 4.5, 0.5));
  assert.ok(1000 - front.hp >= 9, `devant : ${1000 - front.hp} dégâts en 1 s`);
  assert.ok(front.burnT > 0 || front.burn > 0, 'brûlure');
  assert.equal(behind.hp, 1000, 'derrière : intact');
});

test('pétrin : toutes les 2,5 s, 12 dégâts à ≤ 1,3 case et recul ; les volants passent au-dessus', () => {
  const g = q2Night([{ id: 'petrin', x: 1, y: 1, rot: 0 }]);
  const p = g.furn.find((f) => f.id === 'petrin');
  const m = dummy(g, 'raton', p.cx + 0.6, p.cy);
  const bat = dummy(g, 'chauvesouris', p.cx - 1, p.cy);
  // Le pétrin démarre la nuit avec son temps de recharge (2,5 s), puis tourbillonne toutes les 2,5 s.
  const swirls = [];
  const x0 = m.x;
  for (let k = 0; k < 56; k++) {
    if (count(run(g, 0.1, () => teleport(g, 4.5, 0.5)), 'swirl')) swirls.push(g.night.t);
  }
  const hit = 1000 - m.hp;
  assert.equal(swirls.length, 2, `deux tourbillons en 5,6 s (${swirls.length})`);
  assert.ok(Math.abs(swirls[1] - swirls[0] - 2.5) < 0.1, 'toutes les 2,5 s');
  assert.ok(hit >= 24, `12 dégâts par tourbillon (${hit})`);
  assert.ok(m.x > x0, 'recul');
  assert.equal(bat.hp, 1000, 'les volants ne sont pas touchés');
  void swirls;
});

test('vitrine : chantilly 5 dégâts et ralenti de 50 % pendant 1,5 s, portée 3', () => {
  const g = q2Night([{ id: 'vitrine', x: 0, y: 1, rot: 0 }]);
  const v = g.furn.find((f) => f.id === 'vitrine');
  const m = dummy(g, 'raton', v.cx, v.cy + 2.5);
  run(g, 1.5, () => teleport(g, 4.5, 0.5));
  assert.ok(m.hp < 1000, 'touché à 2,5 cases');
  assert.ok(effectiveSlow(m) >= 0.5 - 1e-9, 'ralenti de 50 %');
});

test('machine à café : +30 % de cadence aux meubles à ≤ 1,5 case, non cumulable entre machines', () => {
  const shoot = (layout) => {
    const g = q2Night(layout);
    dummy(g, 'raton', 0.5, 3.5);
    return count(run(g, 10, () => teleport(g, 4.5, 0.5)), 'shot');
  };
  const alone = shoot([{ id: 'etagere', x: 0, y: 2, rot: 0 }]);
  const one = shoot([{ id: 'etagere', x: 0, y: 2, rot: 0 }, { id: 'cafe', x: 1, y: 2, rot: 0 }]);
  const two = shoot([{ id: 'etagere', x: 0, y: 2, rot: 0 }, { id: 'cafe', x: 1, y: 2, rot: 0 }, { id: 'cafe', x: 0, y: 1, rot: 0 }]);
  assert.ok(one >= Math.floor(alone * 1.25), `${alone} -> ${one} tirs`);
  assert.equal(two, one, 'deux machines : pas plus');
});

test('chauve-souris : entre par la cheminée et vole tout droit (ignore le labyrinthe)', () => {
  const g = q2Night([{ id: 'comptoir', x: 0, y: 3, rot: 0 }, { id: 'comptoir', x: 1, y: 3, rot: 0 }, { id: 'comptoir', x: 2, y: 3, rot: 0 }]);
  const bat = spawnMonster(g, 'chauvesouris', 'chimney');
  assert.equal(bat.flying, true);
  let grabbed = false;
  run(g, 8, (gg) => {
    teleport(gg, 4.5, 0.5);
    if (bat.thief) grabbed = true;
  });
  assert.ok(grabbed, 'atteint la caisse par-dessus les comptoirs');
});

test('hérisson : armure 3 ; le feu et le poison l’ignorent', () => {
  const g = q2Night([]);
  const h = dummy(g, 'herisson', 2.5, 1.5);
  dealDamage(g, h, 6, 'physical', null);
  assert.equal(1000 - h.hp, 3, 'armure 3');
  const hp = h.hp;
  dealDamage(g, h, 6, 'fire', null);
  assert.equal(hp - h.hp, 6, 'le feu passe l’armure');
  const hp2 = h.hp;
  dealDamage(g, h, 4, 'poison', null);
  assert.equal(hp2 - h.hp, 4, 'le poison aussi');
});

test('champiboum : explose contre un meuble (40 dégâts à ≤ 1 case) et étourdit le marchand à ≤ 1 case', () => {
  const g = q2Night([{ id: 'comptoir', x: 1, y: 2, rot: 0 }, { id: 'comptoir', x: 2, y: 2, rot: 0 }]);
  const hp0 = new Map(g.furn.map((f) => [f, f.hp]));
  // Il entre par la porte de derrière et marche ; invulnérable aux tirs pour le test (on veut voir l'explosion).
  const c = spawnMonster(g, 'champiboum', 'backdoor');
  c.hp = c.maxHp = 1e6;
  let exploded = false;
  let stunned = 0;
  for (let k = 0; k < 200 && !exploded; k++) {
    // Le marchand le suit de près (à 0,5 case).
    if (count(run(g, 0.1, (gg) => teleport(gg, c.x + 0.5, c.y)), 'explode')) exploded = true;
    stunned = Math.max(stunned, g.player.stunT);
  }
  assert.ok(exploded, 'il a explosé');
  const hurt = g.furn.filter((f) => f.maxHp > 0 && (f.broken || hp0.get(f) - f.hp >= 40 - 1e-6));
  assert.ok(hurt.length >= 1, 'un meuble voisin encaisse 40');
  assert.ok(stunned >= 0.75, `marchand étourdi 0,8 s (${stunned}, lu un pas plus tard)`);
});

test('la Grande Pâte : se scinde à 66 % et 33 % (3 gloubis, M16) ; feu × 1,5 ; ralentissements divisés par 2', () => {
  const g = q2Night([]);
  const b = spawnMonster(g, 'grande_pate', 'backdoor', { x: 2.5, y: 1.5 });
  b.entering = false;
  b.stunT = 1e9;
  const max = b.maxHp;
  assert.equal(max, BOSSES.grande_pate.hp, 'PV de la semaine 1');
  const glo = () => g.night.monsters.active.filter((m) => m.type === 'gloubi').length;
  dealDamage(g, b, max * 0.3, 'physical', null);
  let ev = run(g, 0.05, () => teleport(g, 4.5, 0.5));
  assert.equal(count(ev, 'boss_split'), 0, 'pas encore (70 %)');
  dealDamage(g, b, max * 0.05, 'physical', null);
  ev = run(g, 0.05, () => teleport(g, 4.5, 0.5));
  assert.equal(count(ev, 'boss_split'), 1);
  assert.equal(glo(), BOSSES.grande_pate.splitSpawn.count, 'gloubis de la scission');
  dealDamage(g, b, max * 0.4, 'physical', null);
  ev = run(g, 0.05, () => teleport(g, 4.5, 0.5));
  assert.equal(count(ev, 'boss_split'), 1, 'seconde scission à 33 %');
  const hp = b.hp;
  dealDamage(g, b, 10, 'fire', null);
  assert.ok(Math.abs(hp - b.hp - 15) < 1e-6, 'feu × 1,5');
  b.stunT = 0;
  applySlow(b, 0.6, 2, 'physical');
  assert.ok(Math.abs(effectiveSlow(b) - 0.3) < 1e-6, 'ralenti divisé par 2');
});
