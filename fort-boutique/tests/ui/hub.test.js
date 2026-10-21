// M7 : le Matin au doigt — cartes de déblocage, Catalogue (acheter puis placer), Améliorer (meubles, marchand).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../helpers/dom.js';
import { TouchBot } from '../helpers/bot.js';
import { defaultSave } from '../../src/save/schema.js';
import { serialize, parseAndVerify, SAVE_KEY } from '../../src/save/save.js';
import { districtDef } from '../../src/data/districts.js';

/** Une partie au Matin du jour 3, niveau 5, tous les emplacements du tutoriel payés. */
function morningSave(mutate) {
  const s = defaultSave({ seed: 7, now: 0, lang: 'fr' });
  s.progress.flags.introDone = true;
  s.progress.flags.firstChestDone = true;
  s.stats.cycles = 2;
  s.stats.nights = 2;
  s.player.level = 5;
  s.player.coins = 3000;
  s.progress.pendingUnlocks = [5];
  s.furniture.etagere = { level: 1, plans: 10 };
  const shop = s.shops.q1;
  shop.day = 3;
  shop.night = 3;
  shop.phase.name = 'morning';
  shop.phase.dawnClaimed = true;
  shop.pads.done = districtDef('q1').pads.map((p) => p.id);
  if (mutate) mutate(s);
  return { [SAVE_KEY]: serialize(s) };
}

const savedData = (g) => parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data;

test('Matin : les déblocages du niveau 5 se fêtent une seule fois (G12.4)', () => {
  const g = loadGame({ storage: morningSave() });
  try {
    const bot = new TouchBot(g);
    bot.tapEl('.screen-title');
    g.hooks.advance(300);
    assert.equal(g.hooks.getState().screen, 'unlocks');
    assert.equal(g.$$('.unlock-card').length, 3);
    assert.match(g.$('.unlock-title').textContent, /5/);
    bot.tapEl('#unlock-ok');
    g.hooks.advance(800);
    assert.equal(g.hooks.getState().screen, 'morning');
    assert.deepEqual(savedData(g).progress.pendingUnlocks, []);
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('Catalogue : acheter un Frigo le pose dans la boutique, le prix suivant est × 1,6', () => {
  const g = loadGame({ storage: morningSave((s) => { s.progress.pendingUnlocks = []; }) });
  try {
    const bot = new TouchBot(g);
    bot.tapEl('.screen-title');
    g.hooks.advance(300);
    assert.equal(g.hooks.getState().screen, 'morning');
    bot.tapEl('#hub-catalog');
    g.hooks.advance(300);
    assert.equal(g.hooks.getState().screen, 'catalog');
    const before = g.hooks.getState().scene;
    const fridges = before.furniture.filter((f) => f.id === 'frigo').length;
    const card = g.$('.cat-card[data-furniture="frigo"]');
    const price = Number(card.querySelector('.cat-price').textContent.replace(/\D/g, ''));
    bot.tapEl(card);
    g.hooks.advance(300);
    const after = g.hooks.getState().scene;
    assert.equal(after.coins, before.coins - price);
    assert.equal(after.furniture.filter((f) => f.id === 'frigo').length, fridges + 1, 'posé tout de suite');
    assert.ok(g.hooks.getState().toasts.some((x) => /posé/.test(x)));
    const next = Number(g.$('.cat-card[data-furniture="frigo"] .cat-price').textContent.replace(/\D/g, ''));
    assert.equal(next, Math.round(price * 1.6));
    // Verrouillé : silhouette et niveau requis, l'achat est refusé.
    const locked = g.$('.cat-card[data-furniture="cafe"]');
    assert.ok(locked.classList.contains('locked'));
    bot.tapEl(locked);
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().scene.coins, after.coins);
    bot.tapEl('.panel-back');
    g.hooks.advance(300);
    assert.equal(g.hooks.getState().screen, 'morning');
    assert.equal(g.$('#hub-coins').textContent.replace(/\D/g, ''), String(after.coins), 'le hub affiche le nouveau solde');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('Améliorer : un meuble monte de niveau (stats avant → après), le marchand achète des Baskets', () => {
  const g = loadGame({ storage: morningSave((s) => { s.progress.pendingUnlocks = []; }) });
  try {
    const bot = new TouchBot(g);
    bot.tapEl('.screen-title');
    g.hooks.advance(300);
    bot.tapEl('#hub-upgrades');
    g.hooks.advance(300);
    assert.equal(g.hooks.getState().screen, 'upgrades');
    const row = g.$('.up-row[data-id="etagere"]');
    assert.match(row.querySelector('.up-stats').textContent, /→/);
    const coins = g.hooks.getState().scene.coins;
    bot.tapEl(row.querySelector('.tag'));
    g.hooks.advance(300);
    let st = g.hooks.getState().scene;
    assert.equal(st.save.furniture.etagere.level, 2);
    assert.equal(st.coins, coins - 30);
    assert.ok(st.furniture.filter((f) => f.id === 'etagere').every((f) => f.level === 2), 'les étagères posées suivent');
    bot.tapEl('[data-tab="merchant"]');
    g.hooks.advance(200);
    bot.tapEl(g.$('.up-row[data-id="shoes"] .tag'));
    g.hooks.advance(300);
    st = g.hooks.getState().scene;
    assert.equal(st.coins, coins - 30 - 80);
    assert.equal(savedData(g).player.upgrades.shoes, 2);
    bot.tapEl('.panel-back');
    g.hooks.advance(300);
    assert.equal(g.hooks.getState().screen, 'morning');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
