// M11 : événements du jour (G7.7) — Rush (dès le jour 2) et Commande spéciale (dès le jour 3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, teleport, count } from '../helpers/game.js';
import { startDay } from '../../src/game/day/day.js';
import { itemPrice } from '../../src/game/day/register.js';
import { enterDawn, leaveDawn, openExtraChest } from '../../src/game/cycle.js';
import { RUSH, SPECIAL_ORDER as SO } from '../../src/data/tutorial.js';

/** Boutique au jour `day`, étagère A garnie de pommes. */
function dayGame(day, seed = 11) {
  const g = newGame(seed, (s) => {
    s.shops.q1.day = day;
    s.shops.q1.night = day;
    s.stats.cycles = day - 1;
    s.shops.q1.phase.firstSaleDone = true;
  });
  startDay(g);
  const shelf = g.furn.find((f) => f.id === 'etagere');
  shelf.product = 'pomme';
  shelf.count = 4;
  return g;
}

test('Rush : pas le jour 1 ; dès le jour 2, une fois, entre 35 % et 70 % de la journée', () => {
  const g1 = dayGame(1);
  assert.equal(g1.day.rushAt, -1);
  const g = dayGame(2);
  const d = g.day;
  assert.ok(d.rushAt >= d.duration * RUSH.window[0] - 1e-9 && d.rushAt <= d.duration * RUSH.window[1] + 1e-9, `${d.rushAt}`);
  const ev = run(g, d.rushAt + 0.1, () => teleport(g, 0.5, 0.5));
  assert.equal(count(ev, 'rush'), 1);
  assert.equal(g.shop.phase.rushDone, true);
  assert.equal(g.day.tipMult, RUSH.tipMult, 'pourboires × 1,5');
});

test('Rush : 5 clients en 4 s, pourboires × 1,5 pendant 20 s, puis retour à la normale', () => {
  const g = dayGame(2);
  run(g, g.day.rushAt - 0.05, () => teleport(g, 0.5, 0.5));
  const ev = run(g, RUSH.spreadS + 0.2, () => teleport(g, 0.5, 0.5));
  const entered = count(ev, 'door_bell') + count(ev, 'vip');
  assert.ok(entered >= RUSH.customers, `${entered} clients entrés`);
  run(g, RUSH.tipS - RUSH.spreadS - 0.5, () => teleport(g, 0.5, 0.5));
  assert.equal(g.day.tipMult, RUSH.tipMult);
  run(g, 1, () => teleport(g, 0.5, 0.5));
  assert.equal(g.day.tipMult, 1);
  assert.equal(g.day.rush, null);
});

test('Rush : un rechargement le même jour ne le rejoue pas', () => {
  const g = dayGame(2);
  run(g, g.day.rushAt + 0.1, () => teleport(g, 0.5, 0.5));
  startDay(g, { resume: true });
  assert.equal(g.day.rushAt, -1);
});

test('Commande spéciale : dès le jour 3 ; livrée à temps, +30 % de la valeur et un coffre en bois à l’aube', () => {
  assert.equal(dayGame(2).day.orderAt, -1, 'pas avant le jour 3');
  const g = dayGame(3);
  run(g, g.day.orderAt + 0.1, () => teleport(g, 0.5, 0.5));
  const o = g.day.order;
  assert.ok(o, 'le client au parchemin est entré');
  assert.equal(o.product, 'pomme');
  assert.ok(o.need >= SO.count[0] && o.need <= SO.count[1]);
  assert.equal(o.c.type, 'order');
  // Il rejoint sa place près de la caisse, puis le minuteur démarre.
  run(g, 8, () => teleport(g, 0.5, 0.5));
  assert.equal(o.waiting, true);
  assert.ok(Math.abs(o.c.x - (g.register.cx)) + Math.abs(o.c.y - g.register.cy) <= 2.6, 'il attend près de la caisse');
  const pile0 = g.day.pile;
  const sales0 = g.day.sales;
  g.player.stack = Array(o.need).fill('pomme');
  const ev = run(g, 2, () => teleport(g, o.c.x, o.c.y));
  assert.equal(count(ev, 'order_give'), o.need);
  assert.equal(count(ev, 'order_done'), 1);
  const amount = Math.round(o.need * itemPrice(g, 'pomme') * (1 + SO.bonus));
  assert.equal(g.day.sales - sales0, amount);
  void pile0;
  assert.ok(g.day.collected + g.day.pile >= amount, 'les pièces tombent sur la caisse (ramassées en passant)');
  assert.equal(g.shop.phase.orderChests, 1);
  assert.equal(g.day.order, null);
  assert.equal(o.c.state, 'leave');
  // À l’aube : un coffre en bois en plus, ouvert après celui de la nuit (et jamais perdu).
  g.nightResult = { stars: 3, kept: 1, coins: 0, xp: 0, jarFinal: 0, loot: 0, kills: 0, killsByType: {}, bossNight: false };
  const dawn = enterDawn(g);
  assert.equal(dawn.extra.length, 1);
  assert.equal(dawn.extra[0].type, 'wood');
  assert.equal(g.shop.phase.orderChests, 0);
  const opened = g.save.stats.chestsOpened || 0;
  assert.ok(openExtraChest(g, 0));
  assert.equal(openExtraChest(g, 0), null, 'une seule fois');
  assert.equal(g.save.stats.chestsOpened, opened + 1);
});

test('Commande spéciale : ratée, il repart en souriant, sans pénalité ; une seule par jour, même après un rechargement', () => {
  const g = dayGame(3);
  run(g, g.day.orderAt + 0.1, () => teleport(g, 0.5, 0.5));
  const o = g.day.order;
  const lost0 = g.day.lost;
  const coins0 = g.save.player.coins;
  const ev = [];
  let mood = null;
  for (let i = 0; i < SO.deliverS + 15 && mood === null; i++) {
    const step = run(g, 1, () => teleport(g, 0.5, 0.5));
    ev.push(...step);
    // Juste après l’échec (le client est ensuite recyclé pour un autre).
    if (count(step, 'order_fail')) mood = o.c.mood;
  }
  assert.equal(count(ev, 'order_fail'), 1);
  assert.equal(mood, 1, 'il repart en souriant');
  assert.equal(g.day.lost, lost0 + count(ev, 'grumpy'), 'le client de la commande ne compte pas comme déçu');
  assert.ok(g.save.player.coins >= coins0, 'aucune pièce retirée');
  assert.equal(g.shop.phase.orderChests || 0, 0);
  startDay(g, { resume: true });
  assert.equal(g.day.orderAt, -1, 'pas de deuxième commande ce jour-là');
});

test('un coffre de commande resté fermé s’ouvre tout seul en quittant l’aube (rien ne se perd)', () => {
  const g = dayGame(3);
  g.shop.phase.orderChests = 2;
  g.nightResult = { stars: 3, kept: 1, coins: 0, xp: 0, jarFinal: 0, loot: 0, kills: 0, killsByType: {}, bossNight: false };
  const dawn = enterDawn(g);
  assert.equal(dawn.extra.length, 2);
  const opened = g.save.stats.chestsOpened || 0;
  leaveDawn(g);
  assert.equal(g.save.stats.chestsOpened, opened + 3, 'coffre de la nuit + 2 coffres de commande');
});
