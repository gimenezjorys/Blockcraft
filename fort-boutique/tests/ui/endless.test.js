// M19 : Nuit sans fin et Franchise au doigt, depuis la carte des quartiers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, calendarDoneToday } from '../helpers/dom.js';
import { TouchBot } from '../helpers/bot.js';
import { defaultSave, defaultShop } from '../../src/save/schema.js';
import { serialize, parseAndVerify, SAVE_KEY } from '../../src/save/save.js';

const saved = (g) => parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data;

function level16() {
  const s = defaultSave({ seed: 8, now: 0, lang: 'fr' });
  Object.assign(s.progress.flags, { introDone: true, firstChestDone: true, editorSeen: true });
  Object.assign(s.stats, { cycles: 30, nights: 30 });
  Object.assign(s.player, { level: 16, coins: 100 });
  Object.assign(s.shops.q1, { day: 3, night: 3, week: 4, bossBeatenCount: 1 });
  Object.assign(s.shops.q1.phase, { name: 'morning', dawnClaimed: true });
  s.progress.pendingUnlocks = [];
  return calendarDoneToday(s);
}

test('Nuit sans fin : la carte, choisir la boutique, Jouer, jusqu’au Bocal vide, le record ; la vraie partie ne bouge pas', () => {
  const s = level16();
  s.shops.q2 = defaultShop('q2');
  s.shops.q2.unlocked = true;
  const g = loadGame({ storage: { [SAVE_KEY]: serialize(s) } });
  try {
    const bot = new TouchBot(g);
    bot.tapEl('.screen-title');
    g.hooks.advance(300);
    bot.tapEl('.hub-map');
    g.hooks.advance(100);
    bot.tapEl('#map-endless');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'endless');
    assert.match(g.$('.endless').textContent, /Rivaux simulés de la semaine/);
    bot.tapEl('#endless-shop-q2');
    g.hooks.advance(100);
    assert.match(g.$('.endless .up-title').textContent, /Boulangerie/);
    bot.tapEl('#endless-play');
    g.hooks.advance(200);
    assert.equal(g.hooks.getState().screen, 'hud');
    for (let ms = 0; ms < 900000 && g.hooks.getState().screen !== 'endless'; ms += 1000) g.hooks.advance(1000);
    assert.equal(g.hooks.getState().screen, 'endless', 'retour à l’écran avec le résultat');
    assert.match(g.$('#endless-result').textContent, /vagues tenues/);
    g.hooks.advance(1500);
    const after = saved(g);
    assert.ok(after.endless.best >= 0);
    assert.equal(after.shops.q1.night, 3, 'la semaine de la boutique n’avance pas');
    bot.tapEl('#endless-close');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'morning');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('Franchise : deux taps sur la carte, semaine 1 en Lune rouge', () => {
  const g = loadGame({ storage: { [SAVE_KEY]: serialize(level16()) } });
  try {
    const bot = new TouchBot(g);
    bot.tapEl('.screen-title');
    g.hooks.advance(300);
    bot.tapEl('.hub-map');
    g.hooks.advance(100);
    bot.tapEl('#map-franchise-q1');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'map', 'le 1er tap demande confirmation');
    bot.tapEl('#map-franchise-q1');
    g.hooks.advance(1500);
    assert.equal(g.hooks.getState().screen, 'morning');
    const sh = saved(g).shops.q1;
    assert.deepEqual([sh.week, sh.night, sh.redMoon], [1, 1, true]);
    bot.tapEl('.hub-map');
    g.hooks.advance(100);
    assert.match(g.$('[data-district="q1"]').textContent, /Lune rouge/);
    assert.equal(g.$('#map-franchise-q1'), null);
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
