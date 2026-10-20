// M6 : cycle complet (G5), coffres (G12.7), améliorations (G9.1), reprise (G5.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, teleport } from '../helpers/game.js';
import { resumePoint, enterMorning, openShop, enterDawn, openDawnChest, leaveDawn } from '../../src/game/cycle.js';
import { startNight, finishNight } from '../../src/game/night/night.js';
import { rollChest, applyChest, upgradeChestRank, ownedFurnitureIds } from '../../src/game/chests.js';
import { canUpgrade, upgradeFurniture, upgradeCost, furnitureLevelCap, buyPrice, recipeCost } from '../../src/game/economy.js';
import { createGame } from '../../src/game/state.js';
import { defaultSave, cloneJson } from '../../src/save/schema.js';
import { xpToNext } from '../../src/data/xp.js';

function nightResult(g, stars, extra = {}) {
  startNight(g, { dayTakings: 100, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  const n = g.night;
  n.jar = stars === 3 ? n.jarInitial : stars === 2 ? Math.ceil(n.jarInitial * 0.75) : 1;
  n.loot = 12;
  Object.assign(n, extra);
  finishNight(g, false);
  g.nightResult = n.result;
  return n.result;
}

test('aube : gains attribués une seule fois (dawnClaimed), coffre selon les étoiles', () => {
  const g = newGame();
  g.save.progress.flags.firstChestDone = true;
  g.shop.phase.dawnClaimed = false;
  const r = nightResult(g, 2);
  const coins0 = g.save.player.coins;
  const dawn = enterDawn(g);
  assert.equal(dawn.chest.type, 'silver');
  assert.equal(g.save.player.coins, coins0 + r.coins);
  assert.equal(g.shop.phase.dawnClaimed, true);
  // Rechargement pendant l'aube : la sauvegarde relue ne redonne rien.
  const reloaded = createGame({ save: cloneJson(g.save) });
  assert.equal(resumePoint(reloaded), 'dawn');
  const before = reloaded.save.player.coins;
  reloaded.nightResult = reloaded.shop.phase.dawn.result;
  enterDawn(reloaded);
  assert.equal(reloaded.save.player.coins, before, 'pas de double gain');
});

test('premier coffre du jeu : bois, 30 pièces, 4 plans Étagère, 2 plans Cagette', () => {
  const g = newGame();
  g.shop.phase.dawnClaimed = false;
  nightResult(g, 3);
  const dawn = enterDawn(g);
  assert.equal(dawn.chest.first, true);
  assert.equal(dawn.chest.type, 'wood');
  const coins = g.save.player.coins;
  const c = openDawnChest(g);
  assert.deepEqual(c.plans, [['etagere', 4], ['cagette', 2]]);
  assert.equal(c.coins, 30);
  assert.equal(g.save.player.coins, coins + 30);
  assert.equal(g.save.furniture.etagere.plans, 4);
  assert.equal(openDawnChest(g), null, 'un coffre ne s’ouvre qu’une fois');
  // La première amélioration est garantie : 2 plans + 30 pièces.
  g.save.player.coins = 30;
  assert.equal(canUpgrade(g.save, 'etagere').ok, true);
  assert.equal(upgradeFurniture(g.save, 'etagere'), true);
  assert.equal(g.save.furniture.etagere.level, 2);
  assert.equal(g.save.furniture.etagere.plans, 2);
  assert.equal(g.save.player.coins, 0);
});

test('raton doré : le coffre monte d’un rang ; nuit de boss gagnée : Coffre de Lune', () => {
  assert.equal(upgradeChestRank('wood'), 'silver');
  assert.equal(upgradeChestRank('silver'), 'gold');
  assert.equal(upgradeChestRank('gold'), 'gold');
  const g = newGame();
  g.save.progress.flags.firstChestDone = true;
  g.shop.phase.dawnClaimed = false;
  nightResult(g, 1, { goldenKilled: true });
  assert.equal(enterDawn(g).chest.type, 'silver');
});

test('aube -> matin : nuit suivante, jour suivant, cycle compté ; Pleine Lune gagnée -> semaine 2', () => {
  const g = newGame();
  g.shop.phase.dawnClaimed = false;
  nightResult(g, 3);
  enterDawn(g);
  leaveDawn(g);
  assert.equal(g.shop.night, 2);
  assert.equal(g.shop.day, 2);
  assert.equal(g.save.stats.cycles, 1);
  assert.equal(g.phase.name, 'morning');
  assert.equal(resumePoint(g), 'morning');
  // Nuit 7 gagnée.
  g.shop.night = 7;
  g.shop.phase.dawnClaimed = false;
  g.shop.phase.dawn = { result: { bossNight: true, bossWin: true, stars: 3, coins: 0, xp: 0 }, day: { sales: 0, tips: 0 }, chest: null };
  leaveDawn(g);
  assert.equal(g.shop.week, 2);
  assert.equal(g.shop.night, 1);
  assert.equal(g.shop.bossBeatenCount, 1);
  // Nuit 7 perdue : le boss revient, Courage de Mamie +1.
  g.shop.night = 7;
  g.shop.phase.dawn = { result: { bossNight: true, bossWin: false, stars: 0, coins: 0, xp: 0 }, day: { sales: 0, tips: 0 }, chest: null };
  leaveDawn(g);
  assert.equal(g.shop.night, 7);
  assert.equal(g.shop.bossAssist, 1);
});

test('reprise (G5.2) : jour avec le temps restant, nuit depuis le début, aube, matin, intro', () => {
  const g = newGame();
  assert.equal(resumePoint(g), 'intro');
  g.save.progress.flags.introDone = true;
  assert.equal(resumePoint(g), 'morning');
  openShop(g);
  run(g, 20, () => teleport(g, 2.5, 2.5));
  assert.equal(resumePoint(g), 'day');
  assert.ok(Math.abs(g.shop.phase.dayTimeLeftS - 70) < 0.1);
  g.shop.phase.name = 'night';
  assert.equal(resumePoint(g), 'night');
  g.shop.phase.name = 'dusk';
  assert.equal(resumePoint(g), 'night');
  enterMorning(g);
  assert.equal(resumePoint(g), 'morning');
});

test('coffres : contenu à graine, plans des meubles débloqués, rares au tiers', () => {
  const save = defaultSave({ seed: 1, now: 0 });
  save.player.level = 14;
  save.shops.q2 = cloneJson(save.shops.q1);
  save.shops.q1.bossBeatenCount = 1;
  save.shops.q2.bossBeatenCount = 1;
  save.shops.q3 = cloneJson(save.shops.q1);
  save.shops.q3.layout.push({ id: 'alambic', x: 1, y: 1 });
  const a = rollChest(save, 'gold', { shopId: 'q3', seed: 9 });
  const b = rollChest(save, 'gold', { shopId: 'q3', seed: 9 });
  assert.deepEqual(a, b, 'même graine, même coffre');
  assert.equal(a.coins >= Math.round(180 * 2.5) && a.coins <= Math.round(300 * 2.5), true);
  assert.equal(a.plans.length, 4);
  const total = a.plans.reduce((s, [, n]) => s + n, 0);
  assert.ok(Math.abs(total - Math.round(30 * 1.5)) <= 2, `plans ${total}`);
  // Le Coffre de Lune donne un plan rare à coup sûr si un rare est débloqué : sa part est d'un tiers.
  const moon = rollChest(save, 'moon', { shopId: 'q3', seed: 3 });
  const rare = moon.plans.find(([id]) => id === 'alambic');
  if (rare) {
    const others = moon.plans.filter(([id]) => id !== 'alambic').map(([, n]) => n);
    assert.ok(rare[1] < Math.max(...others), 'un type rare reçoit moins de plans');
  }
  let owned = 0;
  let total2 = 0;
  for (let s = 0; s < 300; s++) {
    const c = rollChest(save, 'wood', { shopId: 'q1', seed: s });
    for (const [id] of c.plans) {
      total2++;
      if (ownedFurnitureIds(save).includes(id)) owned++;
    }
  }
  assert.ok(owned / total2 > 0.5 && owned / total2 < 0.85, `70 % pour un meuble possédé : ${(owned / total2).toFixed(2)}`);
  applyChest(save, a);
  assert.ok(save.player.coins >= a.coins);
});

test('améliorations : coûts G9.1, plafond selon le niveau de marchand, meubles rares ×1,5', () => {
  assert.deepEqual(upgradeCost('etagere', 1), { plans: 2, coins: 30 });
  assert.deepEqual(upgradeCost('etagere', 9), { plans: 150, coins: 24000 });
  assert.equal(upgradeCost('etagere', 10), null);
  assert.deepEqual(upgradeCost('alambic', 2), { plans: 4, coins: 120 });
  assert.equal(furnitureLevelCap(1), 2);
  assert.equal(furnitureLevelCap(3), 2);
  assert.equal(furnitureLevelCap(4), 3);
  assert.equal(furnitureLevelCap(27), 10);
  const save = defaultSave({ seed: 1, now: 0 });
  save.player.coins = 1e6;
  save.furniture.etagere = { level: 2, plans: 999 };
  assert.equal(canUpgrade(save, 'etagere').reason, 'cap', 'niveau 1 : plafond 2');
  save.player.level = 4;
  assert.equal(canUpgrade(save, 'etagere').ok, true);
  save.furniture.etagere.plans = 1;
  assert.equal(canUpgrade(save, 'etagere').reason, 'plans');
  save.furniture.etagere.plans = 10;
  save.player.coins = 5;
  assert.equal(canUpgrade(save, 'etagere').reason, 'coins');
  assert.equal(upgradeFurniture(save, 'etagere'), false);
});

test('prix croissant par exemplaire et coût des recettes', () => {
  const save = defaultSave({ seed: 1, now: 0 });
  const shop = save.shops.q1;
  assert.equal(buyPrice(shop, 'etagere'), Math.round(40 * 1.6));
  shop.storage.push('comptoir');
  assert.equal(buyPrice(shop, 'comptoir'), Math.round(20 * 1.6));
  assert.equal(buyPrice(shop, 'plante'), 90);
  assert.equal(recipeCost('pomme', 1), 100);
  assert.equal(recipeCost('pomme', 4), 4 * 320);
  assert.equal(recipeCost('pomme', 5), null);
});

test('quitter l’aube sans ouvrir le coffre : son contenu est quand même crédité (G3.8, P1)', () => {
  const g = newGame();
  g.shop.phase.dawnClaimed = false;
  nightResult(g, 3);
  const dawn = enterDawn(g);
  assert.equal(dawn.chest.opened, false);
  const coins = g.save.player.coins;
  leaveDawn(g);
  assert.equal(g.save.furniture.etagere.plans, 4, 'plans du premier coffre crédités');
  assert.equal(g.save.furniture.cagette.plans, 2);
  assert.equal(g.save.player.coins, coins + 30);
  assert.equal(g.save.progress.flags.firstChestDone, true);
  assert.equal(g.shop.phase.dawn, null);
});

test('aube : le passage de niveau est noté pour le ruban (même après rechargement)', () => {
  const g = newGame();
  g.shop.phase.dawnClaimed = false;
  g.save.player.xp = xpToNext(1) - 1;
  nightResult(g, 3);
  const dawn = enterDawn(g);
  assert.equal(dawn.level.from, 1);
  assert.equal(dawn.level.to, g.save.player.level);
  assert.equal(dawn.level.to, 2, 'les étoiles de la nuit font passer niveau 2');
  const reloaded = createGame({ save: cloneJson(g.save) });
  assert.deepEqual(reloaded.shop.phase.dawn.level, dawn.level);
});
