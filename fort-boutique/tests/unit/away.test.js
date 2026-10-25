// M13 : hors ligne (G16), Moka (G11.2), personnel (G11.3). Tests essentiels de la mission.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, teleport } from '../helpers/game.js';
import { defaultSave } from '../../src/save/schema.js';
import { collectOffline } from '../../src/game/offline.js';
import { startDay, endDay } from '../../src/game/day/day.js';
import { startNight } from '../../src/game/night/night.js';
import { spawnMonster } from '../../src/game/night/monsters.js';
import { levelUpCat, catDamage } from '../../src/game/cat.js';
import { hireStaff } from '../../src/game/staff.js';

const MIN = 60000;
const T = 1792411200000;

/** Boutique du Q1 : niveau 10, un commis et un caissier, dernier jour 600 pièces en 150 s. */
function staffedSave() {
  const s = defaultSave({ seed: 4, now: T });
  s.player.level = 10;
  s.player.coins = 100000;
  assert.ok(hireStaff(s, 'q1', 'clerk'));
  assert.ok(hireStaff(s, 'q1', 'cashier'));
  s.player.coins = 1000;
  Object.assign(s.shops.q1, { lastDayTakings: 600, lastDayDurationS: 150 });
  s.shops.q1.layout.find((it) => it.id === 'cagette').stock = 1;
  s.shops.q1.layout.find((it) => it.id === 'etagere').count = 2;
  return s;
}

test('hors ligne : rien avant 15 min ; réserves pleines ; gains du personnel plafonnés à 8 h ; aucune perte', () => {
  const short = staffedSave();
  short.lastSeenAt = T - 14 * MIN;
  assert.equal(collectOffline(short, T), null, 'moins de 15 min : rien');
  const s = staffedSave();
  s.lastSeenAt = T - 30 * MIN;
  const before = JSON.parse(JSON.stringify(s));
  const r = collectOffline(s, T);
  // 0,2 × (600 ÷ 2,5 min) × 30 min = 1 440.
  assert.equal(r.coins, 1440);
  assert.equal(s.player.coins, 1000 + 1440);
  assert.equal(s.shops.q1.layout.find((it) => it.id === 'cagette').stock, 6, 'réserve de la cagette pleine');
  // Rien ne se perd : étagères, nuit, monnaies, série.
  assert.equal(s.shops.q1.layout.find((it) => it.id === 'etagere').count, 2);
  assert.equal(s.shops.q1.night, before.shops.q1.night);
  assert.equal(s.player.rubies, before.player.rubies);
  assert.deepEqual(s.daily.streak, before.daily.streak);
  assert.ok(s.offline.pendingDelivery && s.offline.pendingDelivery.coins === 1440, 'ticket pour le Matin');
  // 20 h d'absence : plafond de 8 h.
  const long = staffedSave();
  long.lastSeenAt = T - 20 * 60 * MIN;
  assert.equal(collectOffline(long, T).coins, Math.round(0.2 * 240 * 480));
  // Sans caissier : pas de gains (réserves pleines quand même).
  const solo = staffedSave();
  solo.shops.q1.staff.cashier = null;
  solo.lastSeenAt = T - 60 * MIN;
  assert.equal(collectOffline(solo, T).coins, 0);
  // Horloge reculée : rien.
  const back = staffedSave();
  back.lastSeenAt = T + 60 * MIN;
  assert.equal(collectOffline(back, T), null);
});

test('hors ligne : Coffre de Bienvenue après 3 jours, une seule fois par absence', () => {
  const s = staffedSave();
  s.lastSeenAt = T - 2 * 24 * 60 * MIN;
  assert.equal(collectOffline(s, T).welcome, null, '2 jours : pas de coffre');
  const a = staffedSave();
  a.lastSeenAt = T - 3 * 24 * 60 * MIN;
  const chests = a.stats.chestsOpened;
  const r = collectOffline(a, T);
  assert.equal(r.welcome.type, 'welcome');
  assert.equal(a.stats.chestsOpened, chests + 1);
  // Même absence relue (sauvegarde non réécrite) : pas de second coffre.
  a.lastSeenAt = T - 3 * 24 * 60 * MIN;
  assert.equal(collectOffline(a, T + MIN).welcome, null);
});

test('Moka : suit le marchand, rapporte le tas de pièces, bondit la nuit sur le Grignotin le plus proche', () => {
  const g = newGame(9, (s) => { s.player.level = 5; });
  startDay(g);
  assert.ok(g.cat, 'Moka arrive au niveau 5');
  run(g, 2.2, () => teleport(g, g.player.x, g.player.y));
  run(g, 1.5, (gg) => { gg.input.x = -1; gg.input.y = 0; });
  run(g, 0.6, (gg) => { gg.input.x = 0; gg.input.y = 0; });
  const d = Math.hypot(g.cat.x - g.player.x, g.cat.y - g.player.y);
  assert.ok(d >= 0.45 && d <= 1.6, `suit à distance : ${d.toFixed(2)}`);
  // Jour : le tas de la caisse revient au marchand.
  g.day.pile = 30;
  g.cat.x = g.register.cx;
  g.cat.y = g.register.cy + 1;
  const coins = g.save.player.coins;
  teleport(g, g.register.cx, g.register.cy + 1.4);
  g.cat.fetchT = 0;
  run(g, 0.05, () => {});
  assert.equal(g.save.player.coins, coins + 30);
  // Nuit : bond sur un Grignotin à portée (dégâts 6,75 au niveau 1), volants compris.
  const n = newGame(9, (s) => { s.player.level = 5; });
  startNight(n, { dayTakings: 100, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  n.night.state = 'idle';
  n.cat.arriveT = 0;
  const m = spawnMonster(n, 'chauvesouris', 'backdoor');
  m.hp = m.maxHp = 1000;
  m.entering = false;
  n.cat.x = m.x + 1;
  n.cat.y = m.y;
  teleport(n, m.x + 1.5, m.y);
  run(n, 0.05, () => {});
  assert.ok(1000 - m.hp >= catDamage(1) - 1e-6, `Moka a frappé : ${1000 - m.hp}`);
  // Croquettes : 5 pour le niveau 2.
  n.save.player.kibble = 5;
  assert.equal(levelUpCat(n.save), true);
  assert.equal(n.save.player.cat.level, 2);
  assert.equal(levelUpCat(n.save), false);
});

test('personnel : le commis remplit l’étagère et le caissier encaisse sans le marchand ; la nuit, ils dorment', () => {
  const g = newGame(5, (s) => {
    s.player.level = 10;
    s.player.coins = 100000;
    hireStaff(s, 'q1', 'clerk');
    hireStaff(s, 'q1', 'cashier');
    s.shops.q1.day = 4;
    s.stats.cycles = 3;
    s.shops.q1.phase.firstSaleDone = true;
  });
  startDay(g);
  const shelf = g.furn.find((f) => f.id === 'etagere');
  const crate = g.furn.find((f) => f.id === 'cagette');
  crate.stock = 6;
  shelf.count = 0;
  // Le marchand reste loin de tout (coin du haut à droite).
  const served = g.save.stats.served;
  let maxShelf = 0;
  run(g, 40, (gg) => {
    teleport(gg, gg.grid.w - 0.5, 0.5);
    maxShelf = Math.max(maxShelf, shelf.count);
  });
  assert.ok(maxShelf > 0, 'le commis a garni l’étagère');
  assert.ok(g.save.stats.served > served, 'le caissier a encaissé');
  g.day.timeLeft = 0;
  run(g, 4, () => {});
  endDay(g);
  startNight(g, { dayTakings: 100 });
  assert.ok(g.staff.length === 2 && g.staff.every((s) => s.sleep && s.state === 'sleep'));
  const pos = g.staff.map((s) => `${s.x},${s.y}`).join();
  run(g, 3, () => {});
  assert.equal(g.staff.map((s) => `${s.x},${s.y}`).join(), pos, 'ils ne bougent pas la nuit');
});
