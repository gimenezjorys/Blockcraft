// M7 : données et progression — courbe d'XP, déblocages, prix par exemplaire, plafonds, coûts (G9.1, G11.1, G12).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../helpers/game.js';
import { xpToNext, MAX_LEVEL } from '../../src/data/xp.js';
import { addXp, isUnlocked, unlocksAtLevel, unlockedFurniture, districtOpen, nextUnlock } from '../../src/game/progression.js';
import { furnitureLevelCap, upgradeCost, canUpgrade, upgradeFurniture, buyPrice } from '../../src/game/economy.js';
import { catalogIds, canBuy, buyFurniture, findPlacement, autoPlaceFromStorage, pathLengths } from '../../src/game/catalog.js';
import { merchantUpgradeInfo, buyMerchantUpgrade, recipeInfo, upgradeRecipe, expansionInfo, expandShop } from '../../src/game/upgrades.js';
import { validateLayout, gridSize } from '../../src/game/shop.js';
import { playerSpeed, stackCapacity } from '../../src/game/player.js';
import { itemPrice } from '../../src/game/day/register.js';
import { FURNITURE } from '../../src/data/furniture.js';
import { MONSTERS, BOSSES } from '../../src/data/monsters.js';
import { districtDef } from '../../src/data/districts.js';
import { unlockCards } from '../../src/ui/screens/unlocks.js';
import { defaultShop } from '../../src/save/schema.js';

test('courbe d’XP (G12.3) : table exacte, formule au-delà de 30, niveau 40 maximum', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(xpToNext), [120, 150, 200, 240, 280, 320, 650, 700, 750, 800, 850]);
  assert.deepEqual([12, 18, 23, 24, 29].map(xpToNext), [1150, 1700, 1950, 2900, 3400]);
  assert.equal(xpToNext(30), 3600);
  assert.equal(xpToNext(35), 4600);
  assert.equal(xpToNext(MAX_LEVEL), Infinity);
  const g = newGame();
  const ev = [];
  g.events = { push: (type, x, y, a) => ev.push({ type, a }) };
  assert.equal(addXp(g, 120 + 150 + 10), 2, 'deux niveaux d’un coup');
  assert.equal(g.save.player.level, 3);
  assert.equal(g.save.player.xp, 10);
  assert.deepEqual(g.save.progress.pendingUnlocks, [2, 3]);
  assert.deepEqual(ev.map((e) => e.a), [2, 3]);
  g.save.player.level = 39;
  g.save.player.xp = 0;
  addXp(g, 1e7);
  assert.equal(g.save.player.level, 40);
});

test('déblocages par niveau (G12.4) : Q1 complet, cartes au Matin (3 au plus, quartiers d’abord)', () => {
  assert.deepEqual(unlocksAtLevel(2).furniture.sort(), ['comptoir', 'frigo']);
  assert.deepEqual(unlocksAtLevel(2).features.sort(), ['calendar', 'merchantUpgrades']);
  assert.deepEqual(unlocksAtLevel(3).furniture, ['plante']);
  assert.deepEqual(unlocksAtLevel(3).features, ['editor']);
  assert.deepEqual(unlocksAtLevel(4).furniture, ['chaudron']);
  assert.deepEqual(unlocksAtLevel(4).features.sort(), ['daily', 'quests']);
  assert.deepEqual(unlocksAtLevel(5).features.sort(), ['cat', 'expansion1', 'recipes']);
  const g = newGame();
  assert.deepEqual(unlockedFurniture(g.save).sort(), ['cagette', 'caisse', 'etagere']);
  assert.equal(isUnlocked(g.save, 'editor'), false);
  g.save.player.level = 4;
  assert.deepEqual(unlockedFurniture(g.save).sort(), ['cagette', 'caisse', 'chaudron', 'comptoir', 'etagere', 'frigo', 'plante']);
  assert.equal(isUnlocked(g.save, 'editor'), true);
  assert.equal(nextUnlock(g.save).level, 5);
  // Un quartier : boss précédent vaincu ET niveau requis.
  g.save.player.level = 7;
  assert.equal(districtOpen(g.save, 'q2'), false, 'Roi Raton pas encore vaincu');
  g.save.shops.q1.bossBeatenCount = 1;
  assert.equal(districtOpen(g.save, 'q2'), true);
  g.save.player.level = 6;
  assert.equal(districtOpen(g.save, 'q2'), false, 'niveau 7 requis');
  // Cartes : une par déblocage, dans l'ordre d'importance.
  const cards = unlockCards([3]);
  assert.deepEqual(cards.map((c) => c.id), ['plante', 'editor']);
  assert.ok(unlockCards([2]).length >= 3);
});

test('données du Quartier 1 complètes (M7)', () => {
  for (const id of ['etagere', 'caisse', 'comptoir', 'plante', 'cagette', 'frigo', 'chaudron']) assert.ok(FURNITURE[id], id);
  for (const id of ['raton', 'souris', 'gloubi', 'termite', 'raton_dore']) assert.ok(MONSTERS[id], id);
  assert.ok(BOSSES.roi_raton);
  assert.deepEqual(districtDef('q1').products, ['pomme', 'lait', 'confiture']);
  assert.deepEqual(catalogIds('q1'), ['etagere', 'cagette', 'comptoir', 'frigo', 'plante', 'chaudron', 'cafe', 'lanterne', 'ventilo', 'aimant', 'horloge']);
});

test('prix par exemplaire : × 1,6 par meuble déjà possédé dans la boutique (G9.1)', () => {
  const g = newGame();
  const shop = g.save.shops.q1;
  const n = shop.layout.filter((it) => it.id === 'etagere').length;
  assert.equal(buyPrice(shop, 'etagere'), Math.round(40 * 1.6 ** n));
  shop.storage.push('etagere');
  assert.equal(buyPrice(shop, 'etagere'), Math.round(40 * 1.6 ** (n + 1)), 'les meubles rangés comptent');
  const q2 = defaultShop('q2');
  const n2 = q2.layout.filter((it) => it.id === 'etagere').length;
  assert.equal(buyPrice(q2, 'etagere'), Math.round(40 * 1.6 ** n2), 'chaque boutique compte ses propres exemplaires');
});

test('catalogue : raisons de refus, achat vers la Réserve puis pose à une place valide', () => {
  const g = newGame();
  const save = g.save;
  save.player.coins = 0;
  assert.equal(canBuy(save, 'q1', 'frigo').reason, 'level');
  save.player.level = 2;
  assert.equal(canBuy(save, 'q1', 'frigo').reason, 'coins');
  assert.equal(canBuy(save, 'q1', 'four').reason, 'district', 'un producteur ne s’achète que dans son quartier');
  assert.equal(canBuy(save, 'q1', 'caisse').reason, 'unknown', 'la caisse est unique');
  save.player.coins = 10000;
  const c = canBuy(save, 'q1', 'frigo');
  assert.equal(c.ok, true);
  const coins = save.player.coins;
  assert.equal(buyFurniture(save, 'q1', 'frigo'), true);
  assert.equal(save.player.coins, coins - c.price);
  assert.deepEqual(save.shops.q1.storage, ['frigo']);
  const spot = autoPlaceFromStorage(save, 'q1', 'frigo');
  assert.ok(spot, 'une place a été trouvée');
  assert.deepEqual(save.shops.q1.storage, []);
  assert.equal(validateLayout('q1', save.shops.q1.expansion, save.shops.q1.layout).ok, true);
  // Plafond par boutique.
  save.player.level = 3;
  for (let i = 0; i < 6; i++) save.shops.q1.storage.push('plante');
  assert.equal(canBuy(save, 'q1', 'plante').reason, 'max');
});

test('placement automatique : le trajet des Grignotins ne raccourcit pas et celui des clients s’allonge de 30 % au plus', () => {
  const g = newGame();
  const shop = g.save.shops.q1;
  const before = pathLengths('q1', shop.expansion, shop.layout);
  const spot = findPlacement('q1', shop.expansion, shop.layout, 'comptoir');
  assert.ok(spot);
  const after = pathLengths('q1', shop.expansion, shop.layout.concat([{ id: 'comptoir', ...spot }]));
  assert.ok(after.monsters >= before.monsters - 1e-9);
  assert.ok(after.customers <= before.customers * 1.3 + 1e-9);
});

test('plafond de niveau des meubles = min(10 ; 1 + ⌈niveau ÷ 3⌉) et coûts en plans et en pièces (G9.1)', () => {
  assert.deepEqual([1, 2, 3, 4, 6, 7, 26, 27, 40].map(furnitureLevelCap), [2, 2, 2, 3, 3, 4, 10, 10, 10]);
  assert.deepEqual([1, 2, 3, 9].map((l) => upgradeCost('etagere', l)), [
    { plans: 2, coins: 30 }, { plans: 4, coins: 80 }, { plans: 8, coins: 200 }, { plans: 150, coins: 24000 },
  ]);
  assert.equal(upgradeCost('etagere', 10), null);
  assert.equal(upgradeCost('horloge', 1).coins, 45, 'meuble rare : pièces × 1,5');
  const g = newGame();
  const save = g.save;
  save.furniture.etagere = { level: 2, plans: 100 };
  save.player.coins = 10000;
  assert.equal(canUpgrade(save, 'etagere').reason, 'cap', 'niveau 1 : plafond 2');
  save.player.level = 4;
  assert.equal(upgradeFurniture(save, 'etagere'), true);
  assert.equal(save.furniture.etagere.level, 3);
  assert.equal(save.furniture.etagere.plans, 96);
  assert.equal(save.player.coins, 10000 - 80);
});

test('marchand (G11.1), recettes (G7.5) et agrandissement E1 (G12.6) : coûts, effets, niveaux requis', () => {
  const g = newGame();
  const save = g.save;
  save.player.coins = 100000;
  assert.equal(merchantUpgradeInfo(save, 'shoes').reason, 'locked', 'dès le niveau 2');
  save.player.level = 2;
  assert.equal(merchantUpgradeInfo(save, 'shoes').cost, 80);
  assert.equal(buyMerchantUpgrade(save, 'shoes'), true);
  assert.equal(save.player.upgrades.shoes, 2);
  assert.ok(Math.abs(playerSpeed(2) - 3.15) < 1e-9);
  assert.equal(merchantUpgradeInfo(save, 'basket').cost, 60);
  buyMerchantUpgrade(save, 'basket');
  assert.equal(stackCapacity(save.player.upgrades.basket), 5);
  for (let i = 0; i < 20; i++) buyMerchantUpgrade(save, 'whistle');
  assert.equal(save.player.upgrades.whistle, 6, 'Sifflet : niveau 6 au plus');
  assert.equal(merchantUpgradeInfo(save, 'whistle').reason, 'max');
  // Recettes : niveau 5, +15 % par niveau.
  assert.equal(recipeInfo(save, 'q1', 'pomme').reason, 'locked');
  save.player.level = 5;
  const r = recipeInfo(save, 'q1', 'pomme');
  assert.equal(r.cost, 4 * 25);
  const p1 = itemPrice(g, 'pomme');
  assert.equal(upgradeRecipe(save, 'q1', 'pomme'), true);
  assert.ok(Math.abs(itemPrice(g, 'pomme') - p1 * 1.15) < 1e-9);
  assert.equal(recipeInfo(save, 'q1', 'baguette').reason, 'product');
  // Agrandissement : E1 au niveau 5 pour 300 pièces (× m_Q), la disposition reste valide.
  save.player.level = 4;
  assert.equal(expansionInfo(save, 'q1').reason, 'level');
  save.player.level = 5;
  const e = expansionInfo(save, 'q1');
  assert.deepEqual({ to: e.to, cost: e.cost }, { to: 1, cost: 300 });
  const coins = save.player.coins;
  assert.equal(expandShop(save, 'q1'), true);
  assert.equal(save.player.coins, coins - 300);
  assert.equal(save.shops.q1.expansion, 1);
  assert.deepEqual(gridSize(1), [6, 7]);
  assert.equal(validateLayout('q1', 1, save.shops.q1.layout).ok, true);
  assert.equal(expansionInfo(save, 'q1').reason, 'level', 'E2 au niveau 9');
  save.shops.q2 = defaultShop('q2');
  assert.equal(expansionInfo(save, 'q2').cost, Math.round(300 * 1.75), 'm_Q du quartier 2');
});

test('M11 : l’XP du jour s’additionne, mais le niveau monte à l’aube (G12.3, G19 2:57 et 6:30)', async () => {
  const { startDay } = await import('../../src/game/day/day.js');
  const { enterDawn } = await import('../../src/game/cycle.js');
  const g = newGame();
  startDay(g);
  addXp(g, 130);
  assert.equal(g.save.player.level, 1, 'pas de passage de niveau pendant le jour');
  assert.equal(g.save.player.xp, 130);
  g.nightResult = { stars: 3, kept: 1, coins: 0, xp: 45, jarFinal: 0, loot: 0, kills: 0, killsByType: {}, bossNight: false };
  g.phase = { name: 'night', t: 0 };
  const dawn = enterDawn(g);
  assert.equal(g.save.player.level, 2, 'l’aube applique le passage');
  assert.equal(g.save.player.xp, 130 + 45 - 120);
  assert.deepEqual(dawn.level, { from: 1, to: 2 }, 'le ruban de l’aube le montre');
  assert.deepEqual(g.save.progress.pendingUnlocks, [2]);
});

test('M11 : la première aube fête toujours le niveau 2 (G19 2:57), une seule fois', async () => {
  const { enterDawn } = await import('../../src/game/cycle.js');
  const g = newGame();
  g.save.player.xp = 70;
  g.phase = { name: 'dawn', t: 0 };
  g.nightResult = { stars: 2, kept: 0.95, coins: 0, xp: 30, jarFinal: 0, loot: 0, kills: 0, killsByType: {}, bossNight: false, tutorial: true };
  enterDawn(g);
  assert.equal(g.save.player.level, 2);
  assert.equal(g.save.player.xp, 0);
  const g2 = newGame();
  g2.save.player.xp = 70;
  g2.phase = { name: 'dawn', t: 0 };
  g2.nightResult = { ...g.nightResult, tutorial: false };
  enterDawn(g2);
  assert.equal(g2.save.player.level, 1, 'les nuits suivantes ne complètent rien');
});
