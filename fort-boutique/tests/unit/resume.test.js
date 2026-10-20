// M6 (revue P1) : rien ne se perd et rien ne se compte deux fois quand la page est rechargée (G5.2, A0.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, teleport } from '../helpers/game.js';
import { startDay } from '../../src/game/day/day.js';
import { pay } from '../../src/game/day/register.js';
import { initDayEvents } from '../../src/game/day/day-events.js';
import { startNight, finishNight, claimNight } from '../../src/game/night/night.js';
import { spawnMonster, kill } from '../../src/game/night/monsters.js';
import { resumePoint, resumeNight, enterDawn, openDawnChest } from '../../src/game/cycle.js';
import { createGame } from '../../src/game/state.js';
import { cloneJson } from '../../src/save/schema.js';
import { SaveManager } from '../../src/save/save.js';
import { createStorage } from '../../src/save/storage.js';

/** Recharge la partie depuis une copie de la sauvegarde (comme après fermeture de l'onglet). */
const reload = (g) => createGame({ save: cloneJson(g.save) });

/** Un client à encaisser (deux pommes). */
const customer = (g) => ({ type: 'villager', got: ['pomme', 'pomme'], queueAt: g.t });

test('rechargement en pleine journée : le tas de pièces sur la caisse, les ventes et les pourboires reviennent', () => {
  const g = newGame();
  startDay(g);
  teleport(g, 0.5, 0.5); // loin de la caisse : le tas reste posé
  pay(g, customer(g));
  pay(g, customer(g));
  const d = g.day;
  assert.ok(d.pile > 0);
  const { pile, sales, tips, takings } = d;
  const coins = g.save.player.coins;
  run(g, 1);
  const g2 = reload(g);
  assert.equal(resumePoint(g2), 'day');
  startDay(g2, { resume: true });
  assert.equal(g2.day.pile, pile, 'le tas est toujours sur la caisse');
  assert.equal(g2.day.sales, sales);
  assert.equal(g2.day.tips, tips);
  assert.equal(g2.day.takings, takings);
  assert.equal(g2.save.player.coins, coins);
});

test('rechargement pendant la fermeture : le tas est crédité au début de la nuit, le ticket garde les bons chiffres', () => {
  const g = newGame();
  startDay(g);
  teleport(g, 0.5, 0.5);
  pay(g, customer(g));
  const { pile, sales, tips } = g.day;
  g.shop.phase.dayTimeLeftS = 0; // la barre de soleil est pleine : fermeture en cours
  const g2 = reload(g);
  assert.equal(resumePoint(g2), 'night');
  const coins = g2.save.player.coins;
  const takings = resumeNight(g2);
  assert.equal(takings, sales + tips);
  assert.equal(g2.save.player.coins, coins + pile, 'aucune pièce perdue');
  assert.equal(g2.shop.phase.dayPile, 0);
  assert.deepEqual({ sales: g2.dayResult.sales, tips: g2.dayResult.tips }, { sales, tips });
  // Une deuxième reprise ne recrédite rien.
  const g3 = reload(g2);
  const c3 = g3.save.player.coins;
  resumeNight(g3);
  assert.equal(g3.save.player.coins, c3);
});

test('nuit rejouée après rechargement : bestiaire et statistiques comptés une seule fois, à l’aube', () => {
  const g = newGame();
  g.shop.phase.dawnClaimed = false;
  startNight(g, { dayTakings: 100, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  g.night.state = 'idle';
  for (let i = 0; i < 3; i++) kill(g, spawnMonster(g, 'raton', 'backdoor'), null);
  assert.equal(g.save.stats.kills, 0, 'rien n’est écrit pendant la nuit');
  assert.equal(g.save.collections.bestiary.raton || 0, 0);
  // La page est fermée en pleine nuit : la nuit recommence, on y refait 2 victimes.
  const g2 = reload(g);
  g2.shop.phase.dawnClaimed = false;
  startNight(g2, { dayTakings: 100, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  g2.night.state = 'idle';
  for (let i = 0; i < 2; i++) kill(g2, spawnMonster(g2, 'raton', 'backdoor'), null);
  finishNight(g2, false);
  claimNight(g2, g2.night.result);
  assert.equal(g2.save.stats.kills, 2);
  assert.equal(g2.save.collections.bestiary.raton, 2);
  assert.equal(claimNight(g2, g2.night.result), false, 'jamais deux fois');
  assert.equal(g2.save.stats.kills, 2);
});

test('VIP : un VIP déjà venu ne revient pas après un rechargement (G7.2)', () => {
  const g = newGame(11, (s) => { s.shops.q1.day = 2; });
  startDay(g);
  assert.equal(g.day.vipTimes.length, 1);
  const at = g.day.vipTimes[0];
  run(g, at + 0.5);
  assert.equal(g.shop.phase.vipsSpawned, 1);
  const g2 = reload(g);
  startDay(g2, { resume: true });
  assert.equal(g2.day.vipTimes.length, 0, 'plus de VIP programmé ce jour-là');
  // Un nouveau jour remet le compteur à zéro.
  g2.shop.phase.name = 'morning';
  startDay(g2);
  assert.equal(g2.shop.phase.vipsSpawned, 0);
  initDayEvents(g2);
  assert.equal(g2.day.vipTimes.length, 1);
});

test('Coffre de Lune : le cosmétique du quartier vient dès la première victoire', () => {
  const g = newGame();
  g.shop.phase.dawnClaimed = false;
  startNight(g, { dayTakings: 100, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  g.night.isBoss = true;
  g.night.bossKilled = true;
  finishNight(g, false);
  g.nightResult = g.night.result;
  const dawn = enterDawn(g);
  assert.equal(dawn.chest.type, g.save.progress.flags.firstChestDone ? 'moon' : 'wood');
  if (dawn.chest.type !== 'moon') dawn.chest.type = 'moon';
  dawn.chest.first = false;
  const c = openDawnChest(g);
  assert.equal(c.cosmetic, 'moon_q1');
});

test('sauvegardes « forcées » rapprochées : au plus une écriture par 500 ms (B9), rien n’est perdu', () => {
  let t = 10000;
  const st = createStorage(null);
  const data = { a: 1 };
  const mgr = new SaveManager(st, data, { now: () => t }, null);
  mgr.request();
  assert.equal(mgr.writes, 1);
  t += 200;
  data.a = 2;
  mgr.request();
  assert.equal(mgr.writes, 1, 'deuxième écriture différée');
  t += 300;
  mgr.tick();
  assert.equal(mgr.writes, 2, 'écrite dès la fin du délai');
  assert.match(st.get('fortboutique.save'), /"a":2/);
});
