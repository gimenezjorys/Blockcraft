// M17 : Quartier 3, la Pharmacie — un test par comportement (G8.1, G9.3, G9.4, G10.1, G10.3) : lumière et obscurité,
// lanterne, herbier, pilulier, alambic ; fantôme, lutin, gros gourmand ; trappe ; la Dame Blanche.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, teleport, count } from '../helpers/game.js';
import { defaultShop } from '../../src/save/schema.js';
import { startNight } from '../../src/game/night/night.js';
import { spawnMonster } from '../../src/game/night/monsters.js';
import { dealDamage } from '../../src/game/night/towers.js';
import { BOSSES } from '../../src/data/monsters.js';

/** Nuit de la Pharmacie sans vagues, disposition donnée. */
function q3Night(layout, night = 3) {
  const g = newGame(43, (s) => {
    s.shops.q3 = defaultShop('q3');
    s.shops.q3.unlocked = true;
    s.shops.q3.night = night;
    s.shops.q3.layout = [{ id: 'caisse', x: 3, y: 4, rot: 0 }, ...layout];
    s.currentShop = 'q3';
    s.player.level = 14;
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

test('fantôme : invisible et non ciblable hors lumière ; la lanterne le révèle à ≤ 2,5 cases et le frappe × 2', () => {
  const g = q3Night([{ id: 'etagere', x: 0, y: 2, rot: 0 }]);
  const ghost = dummy(g, 'fantome', 1.5, 0.5);
  run(g, 2, () => far(g));
  assert.equal(ghost.visible, false, 'dans le noir');
  assert.equal(ghost.hp, 1000, 'l’étagère ne le voit pas');
  const h = q3Night([{ id: 'lanterne', x: 1, y: 1, rot: 0 }]);
  const gh2 = dummy(h, 'fantome', 1.5, 2.6);
  run(h, 1.2, () => far(h));
  assert.equal(gh2.visible, true, 'éclairé par la lanterne');
  assert.ok(1000 - gh2.hp >= 14 - 1e-6, `rayon 7 × 2 (${1000 - gh2.hp})`);
  // La petite lanterne du marchand éclaire aussi (1,8 case).
  const k = q3Night([]);
  const gh3 = dummy(k, 'fantome', 2.5, 1.5);
  run(k, 0.1, () => teleport(k, 2.5, 2.8));
  assert.equal(gh3.visible, true);
});

test('fantôme : traverse les meubles (chemin droit vers la caisse)', () => {
  const g = q3Night([{ id: 'comptoir', x: 0, y: 2, rot: 0 }, { id: 'comptoir', x: 1, y: 2, rot: 0 }, { id: 'comptoir', x: 2, y: 2, rot: 0 }, { id: 'comptoir', x: 3, y: 2, rot: 0 }]);
  const ghost = spawnMonster(g, 'fantome', 'backdoor');
  ghost.hp = ghost.maxHp = 1e6;
  let stole = false;
  for (let k = 0; k < 120 && !stole; k++) if (count(run(g, 0.1, () => far(g)), 'thief_grab')) stole = true;
  assert.ok(stole, 'il atteint la caisse à travers les comptoirs');
});

test('herbier : nuage de spores (rayon 1), poison 6/s pendant 3 s, qui ignore l’armure', () => {
  const g = q3Night([{ id: 'herbier', x: 0, y: 1, rot: 0 }]);
  const m = dummy(g, 'gourmand', 1.5, 3.2);
  run(g, 4, () => far(g));
  assert.ok(1000 - m.hp >= 10, `poison malgré l’armure 4 (${(1000 - m.hp).toFixed(1)})`);
});

test('pilulier : 4 dégâts, 2,5 tirs/s, portée 2,6, touche les volants', () => {
  const g = q3Night([{ id: 'pilulier', x: 0, y: 1, rot: 0 }]);
  const bat = dummy(g, 'chauvesouris', 0.5, 3.5);
  const ev = run(g, 2, () => far(g));
  assert.ok(count(ev, 'shot') >= 4, `${count(ev, 'shot')} tirs en 2 s`);
  assert.ok(bat.hp < 1000, 'volant touché');
});

test('alambic : potion explosive, zone de rayon 1,3, 30 dégâts', () => {
  const g = q3Night([{ id: 'alambic', x: 0, y: 1, rot: 0 }]);
  const a = dummy(g, 'raton', 2.5, 3.5);
  const b = dummy(g, 'raton', 3.2, 3.5);
  run(g, 4, () => far(g));
  assert.ok(1000 - a.hp >= 30 && 1000 - b.hp >= 30, `deux Grignotins dans la zone (${1000 - a.hp}, ${1000 - b.hp})`);
});

test('lutin : toutes les 4 s, se téléporte 2 cases plus loin, signalé 0,5 s avant', () => {
  const g = q3Night([]);
  const l = spawnMonster(g, 'lutin', 'backdoor');
  l.hp = l.maxHp = 1e6;
  const ev = run(g, 4.7, () => far(g));
  assert.equal(count(ev, 'tele_warn'), 1, 'avertissement');
  assert.equal(count(ev, 'teleport'), 1, 'téléportation');
});

test('gros gourmand : 200 PV, armure 4, immunisé au recul (pétrin)', () => {
  const g = q3Night([{ id: 'petrin', x: 1, y: 1, rot: 0 }]);
  const m = spawnMonster(g, 'gourmand', 'backdoor', { x: 2.1, y: 1.5 });
  m.entering = false;
  m.stunT = 1e9;
  assert.equal(m.armor, 4);
  const x0 = m.x;
  run(g, 3, () => far(g));
  assert.ok(m.hp < m.maxHp, 'touché');
  assert.equal(m.x, x0, 'pas de recul');
});

test('trappe : ouverte dès la nuit 2 ; les Grignotins en sortent au milieu de la boutique', () => {
  const g = q3Night([], 2);
  assert.ok(g.night.openExits.includes('trapdoor') || g.grid.entrances.some((e) => e.kind === 'trapdoor'));
  const m = spawnMonster(g, 'raton', 'trapdoor');
  const e = g.grid.entrances.find((x) => x.kind === 'trapdoor');
  assert.ok(Math.abs(m.x - (e.x + 0.5)) < 1e-6 && Math.abs(m.y - (e.y + 0.5)) < 1e-6, 'sort par la trappe');
  assert.equal(m.entering, false, 'déjà dans la boutique');
});

test('la Dame Blanche : disparaît 3 s toutes les 7 s hors lumière, invoque 2 fantômes toutes les 10 s, lumière × 2', () => {
  const g = q3Night([]);
  const b = spawnMonster(g, 'dame_blanche', 'backdoor', { x: 1.5, y: 1.5 });
  b.entering = false;
  b.stunT = 1e9;
  assert.equal(b.maxHp, BOSSES.dame_blanche.hp);
  const ev = run(g, 10.5, () => far(g));
  assert.equal(count(ev, 'boss_vanish'), 1, 'disparaît à 7 s');
  assert.equal(count(ev, 'boss_appear'), 1, 'revient 3 s plus tard');
  assert.equal(count(ev, 'boss_summon'), 1, 'invoque à 10 s');
  assert.equal(g.night.monsters.active.filter((m) => m.type === 'fantome').length, 2);
  const hp = b.hp;
  dealDamage(g, b, 10, 'light', null);
  assert.ok(Math.abs(hp - b.hp - 20) < 1e-6, 'lumière × 2');
});

test('Festival des lanternes : une lanterne prêtée révèle les fantômes, deux à la Pharmacie', () => {
  const g = newGame(43, (s) => {
    s.shops.q3 = defaultShop('q3');
    s.shops.q3.unlocked = true;
    s.currentShop = 'q3';
  });
  startNight(g, { dayTakings: 100, mods: { lantern: true }, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  assert.equal(g.night.loanLights.length, 2);
  g.night.state = 'idle';
  const L = g.night.loanLights[0];
  const ghost = dummy(g, 'fantome', L.x + 0.5, L.y);
  run(g, 0.1, () => far(g));
  assert.equal(ghost.visible, true);
});
