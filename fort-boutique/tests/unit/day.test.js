// M4 : le jour (G5, G6.7, G7) — producteurs, pile, étagères, clients, caisse, emplacements, fermeture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, teleport, count } from '../helpers/game.js';
import { startDay, dayDuration } from '../../src/game/day/day.js';
import { arrivalInterval, maxCustomers, spawnCustomer, attractiveness } from '../../src/game/day/customers.js';
import { padFillSeconds, nextPadDef } from '../../src/game/day/pads.js';
import { itemPrice } from '../../src/game/day/register.js';
import { dayStats } from '../../src/game/stats.js';
import { FURNITURE } from '../../src/data/furniture.js';

const shelfOf = (g) => g.furn.find((f) => f.id === 'etagere');
const crateOf = (g) => g.furn.find((f) => f.id === 'cagette');

/** Remplit l'étagère A de pommes sans passer par le marchand. */
function stockShelf(g, n = 4) {
  const s = shelfOf(g);
  s.product = 'pomme';
  s.count = n;
}

/** Place le marchand près de la caisse (≤ 1,3 case) ou loin. */
const nearRegister = (g) => teleport(g, 3.5, 3.5);
const farFromRegister = (g) => teleport(g, 0.5, 0.5);

test('durée des journées : 90 s, 120 s, puis 150 s ; +10 s avec l’Horloge', () => {
  const g = newGame();
  assert.equal(dayDuration(g), 90);
  g.shop.day = 2;
  assert.equal(dayDuration(g), 120);
  g.shop.day = 7;
  assert.equal(dayDuration(g), 150);
  g.shop.layout.push({ id: 'horloge', x: 2, y: 2 });
  const g2 = newGame(11, (s) => { s.shops.q1.day = 5; s.shops.q1.layout.push({ id: 'horloge', x: 2, y: 2 }); });
  assert.equal(dayDuration(g2), 160);
});

test('intervalle d’arrivée (G7.1) et nombre maximal de clients', () => {
  const g = newGame();
  assert.equal(attractiveness(g), 0);
  assert.ok(Math.abs(arrivalInterval(g) - 4.2) < 1e-9);
  g.shop.night = 3;
  g.shop.week = 2;
  const expected = (4.2 * 0.95 ** 2 * 0.97) / 1;
  assert.ok(Math.abs(arrivalInterval(g) - expected) < 1e-9);
  g.shop.night = 7;
  g.shop.week = 40;
  assert.ok(Math.abs(arrivalInterval(g) - 1.6) < 1e-9, 'plancher de 1,6 s');
  assert.equal(maxCustomers(g), 3 + Math.floor(30 / 8));
});

test('producteur : 1 pomme / 2,2 s, réserve de 6, arrêt quand pleine', () => {
  const g = newGame();
  startDay(g);
  farFromRegister(g);
  teleport(g, 2.5, 2.5);
  const c = crateOf(g);
  assert.equal(c.stock, 0);
  run(g, 2.25);
  assert.equal(c.stock, 1);
  run(g, 2.2 * 6);
  assert.equal(c.stock, 6, 'plafonnée');
  const lvl3 = dayStats(FURNITURE.cagette, 3);
  assert.equal(lvl3.reserve, 7);
  assert.ok(Math.abs(lvl3.interval - 2.2 * 0.93 * 0.93) < 1e-9);
});

test('pile du marchand : prise à 6/s jusqu’à 4, dépose à 8/s sur l’étagère, le premier article fixe le produit', () => {
  const g = newGame();
  startDay(g);
  const c = crateOf(g);
  c.stock = 6;
  teleport(g, 1.4, 1.5); // à côté de la cagette (0,1)
  run(g, 0.34);
  assert.equal(g.player.stack.length, 2, '6 articles/s');
  run(g, 1);
  assert.equal(g.player.stack.length, 4, 'pile de 4 au départ');
  assert.equal(c.stock, 2);
  const s = shelfOf(g);
  assert.equal(s.product, null);
  teleport(g, 1.4, 4.5); // à côté de l'étagère (0,4)
  run(g, 0.26);
  assert.equal(s.count, 2, '8 articles/s');
  run(g, 1);
  assert.equal(s.count, 4);
  assert.equal(s.product, 'pomme');
  assert.equal(g.player.stack.length, 0);
});

test('cycle de vie d’un client : entre, prend, fait la queue, paie, sort', () => {
  const g = newGame();
  startDay(g);
  stockShelf(g, 4);
  g.day.firstCustomerPending = false;
  g.day.spawnT = 1e9;
  nearRegister(g);
  const c = spawnCustomer(g, 'villager');
  assert.ok(c);
  const states = new Set();
  const ev = run(g, 25, () => states.add(c.state));
  for (const s of ['enter', 'toShelf', 'take', 'toQueue', 'queue', 'leave']) assert.ok(states.has(s), `état ${s} vu`);
  assert.equal(count(ev, 'kaching'), 1);
  assert.equal(g.day.served, 1);
  assert.equal(g.day.customers.length, 0, 'sorti de la boutique');
  assert.equal(shelfOf(g).count, 4 - c.got.length);
});

test('patience écoulée -> départ sans vente et sans autre pénalité', () => {
  const g = newGame();
  startDay(g);
  const s = shelfOf(g);
  s.product = 'pomme';
  s.count = 0;
  g.day.firstCustomerPending = false;
  g.day.spawnT = 1e9;
  farFromRegister(g);
  const coins0 = g.save.player.coins;
  spawnCustomer(g, 'villager');
  const ev = run(g, 30);
  assert.equal(count(ev, 'grumpy'), 1);
  assert.equal(count(ev, 'kaching'), 0);
  assert.equal(g.day.served, 0);
  assert.equal(g.day.lost, 1);
  assert.equal(g.save.player.coins, coins0, 'aucune pénalité');
  assert.equal(g.day.customers.length, 0);
});

test('pas d’encaissement si le marchand est loin ; encaissement en 0,6 s s’il revient', () => {
  const g = newGame();
  startDay(g);
  stockShelf(g, 4);
  g.day.firstCustomerPending = false;
  g.day.spawnT = 1e9;
  farFromRegister(g);
  const c = spawnCustomer(g, 'greedy'); // patience 12 s
  run(g, 8, () => teleport(g, 0.5, 0.5));
  assert.equal(c.state, 'queue');
  assert.equal(g.day.served, 0, 'personne à la caisse');
  nearRegister(g);
  run(g, 0.55);
  assert.equal(g.day.served, 0);
  run(g, 0.1);
  assert.equal(g.day.served, 1);
});

test('recette = ventes + pourboires ; pourboire si servi en moins de 3 s ; tas ramassé à ≤ 0,8 case', () => {
  const g = newGame();
  startDay(g);
  stockShelf(g, 4);
  g.day.firstCustomerPending = false;
  g.day.spawnT = 1e9;
  teleport(g, 3.5, 3.9);
  spawnCustomer(g, 'villager');
  spawnCustomer(g, 'hurried');
  run(g, 25, () => teleport(g, 3.5, 3.9));
  const d = g.day;
  assert.equal(d.served, 2);
  assert.equal(d.takings, d.sales + d.tips);
  assert.ok(d.tips >= 2, `pourboires ${d.tips}`);
  assert.equal(d.pile, 0, 'ramassé (marchand à côté)');
  assert.equal(g.save.player.coins, d.takings);
  assert.equal(itemPrice(g, 'pomme'), 4);
  g.shop.recipes.pomme = 3;
  assert.ok(Math.abs(itemPrice(g, 'pomme') - 4 * 1.3) < 1e-9);
});

test('emplacement P1 : apparaît après la 1re vente, se paie au bon débit, l’Étagère B tombe', () => {
  const g = newGame();
  startDay(g);
  assert.equal(nextPadDef(g), null, 'pas avant la première vente');
  g.shop.phase.firstSaleDone = true;
  run(g, 0.05);
  const pad = g.day.pad;
  assert.equal(pad.id, 'P1');
  assert.equal(pad.price, 40);
  assert.equal(padFillSeconds(40), 1.0);
  assert.equal(padFillSeconds(150), 2.5);
  g.save.player.coins = 25;
  teleport(g, 4.5, 2.5);
  run(g, 0.3);
  assert.ok(Math.abs(pad.paid - 12) <= 1, `40 pièces/s : ${pad.paid}`);
  run(g, 1);
  assert.equal(pad.paid, 25, 'paiement partiel quand les pièces manquent');
  assert.equal(g.save.player.coins, 0);
  teleport(g, 2.5, 2.5);
  g.save.player.coins = 100;
  run(g, 0.5);
  assert.equal(pad.paid, 25, 'rien ne se paie hors du carré');
  teleport(g, 4.5, 2.5);
  const ev = run(g, 1);
  assert.equal(count(ev, 'build_pop'), 1);
  assert.equal(g.save.player.coins, 85);
  assert.ok(g.furn.some((f) => f.id === 'etagere' && f.x === 4 && f.y === 2));
  assert.deepEqual(g.shop.pads.done, ['P1']);
  assert.ok(!(Math.floor(g.player.x) === 4 && Math.floor(g.player.y) === 2), 'le marchand est poussé hors du meuble');
  assert.equal(g.day.pad === null || g.day.pad.id === 'P2', true);
});

test('P3 attend le jour 2 et le niveau 2 ; P5 le jour 3 et le niveau 3', () => {
  const g = newGame(11, (s) => {
    s.shops.q1.pads.done = ['P1', 'P2'];
    s.shops.q1.phase.firstSaleDone = true;
  });
  assert.equal(nextPadDef(g), null);
  g.shop.day = 2;
  assert.equal(nextPadDef(g), null, 'niveau 1');
  g.save.player.level = 2;
  assert.equal(nextPadDef(g).id, 'P3');
  g.shop.pads.done.push('P3', 'P4');
  assert.equal(nextPadDef(g), null);
  g.shop.day = 3;
  g.save.player.level = 3;
  assert.equal(nextPadDef(g).id, 'P5');
});

test('fin de journée : soleil à l’horizon, 6 s de grâce, tas ramassés, clients partis', () => {
  const g = newGame();
  startDay(g);
  stockShelf(g, 4);
  g.day.firstCustomerPending = false;
  farFromRegister(g);
  let ev = run(g, 89.9, () => teleport(g, 0.5, 0.5));
  assert.equal(g.phase.name, 'day');
  ev = run(g, 0.2, () => teleport(g, 0.5, 0.5));
  assert.equal(g.phase.name, 'closing');
  assert.equal(count(ev, 'close_shop'), 1);
  const before = g.day.customers.length;
  run(g, 1, () => teleport(g, 0.5, 0.5));
  assert.ok(g.day.customers.length <= before, 'plus aucun client n’entre');
  const pile = g.day.pile;
  const coins = g.save.player.coins;
  ev = run(g, 5.2, () => teleport(g, 0.5, 0.5));
  // G5.1 : après les 6 s de fermeture vient le crépuscule.
  assert.equal(g.phase.name, 'dusk');
  assert.equal(count(ev, 'day_end'), 1);
  assert.equal(g.day.customers.length, 0);
  assert.equal(g.day.pile, 0);
  assert.ok(g.save.player.coins >= coins + pile, 'aucune perte');
  assert.equal(g.dayResult.takings, g.dayResult.sales + g.dayResult.tips);
  assert.equal(g.shop.lastDayTakings, g.dayResult.takings);
});

test('premier jour : le premier client attend la première pomme posée', () => {
  const g = newGame();
  startDay(g);
  assert.equal(g.day.firstCustomerPending, true);
  run(g, 5, () => teleport(g, 2.5, 2.5));
  assert.equal(g.day.customers.length, 0);
  stockShelf(g, 1);
  run(g, 0.1);
  assert.equal(g.day.customers.length, 1);
});

test('la pile ne se bloque jamais : on ne ramasse pas un produit qu’aucune étagère ne peut exposer (G7.6)', async () => {
  const { hasShelfFor } = await import('../../src/game/day/carry.js');
  const { startDay } = await import('../../src/game/day/day.js');
  const { newGame, run, teleport } = await import('../helpers/game.js');
  const g = newGame(9, (s) => {
    s.player.level = 2;
    s.shops.q1.layout.push({ id: 'frigo', x: 4, y: 0, rot: 0, stock: 5 });
  });
  startDay(g);
  for (const f of g.furn) if (f.def.day.kind === 'shelf') f.product = 'pomme';
  assert.equal(hasShelfFor(g, 'lait'), false);
  const fridge = g.furn.find((f) => f.id === 'frigo');
  fridge.stock = 5;
  teleport(g, fridge.x + 0.5, fridge.y + 1.4);
  run(g, 1, () => teleport(g, fridge.x + 0.5, fridge.y + 1.4));
  assert.ok(!g.player.stack.includes('lait'), 'aucun lait ramassé');
  // Une étagère libre (ou réglée sur le lait) débloque la prise.
  g.furn.find((f) => f.def.day.kind === 'shelf').product = null;
  assert.equal(hasShelfFor(g, 'lait'), true);
});
