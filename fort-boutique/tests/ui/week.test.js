// M9 au doigt : lune du Matin, carte des quartiers, et une vraie nuit de Pleine Lune jouée par le robot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, calendarDoneToday } from '../helpers/dom.js';
import { TouchBot } from '../helpers/bot.js';
import { defaultSave } from '../../src/save/schema.js';
import { serialize, parseAndVerify, SAVE_KEY } from '../../src/save/save.js';
import { districtDef } from '../../src/data/districts.js';
import { NIGHT } from '../../src/data/night.js';

/** Matin du jour 7 : la nuit qui vient est la Pleine Lune. */
function fullMoonSave(mutate) {
  const s = defaultSave({ seed: 12, now: 0, lang: 'fr' });
  s.progress.flags.introDone = true;
  s.progress.flags.firstChestDone = true;
  s.progress.flags.editorSeen = true;
  Object.assign(s.stats, { cycles: 6, nights: 6, playtimeMs: 20 * 60 * 1000 });
  Object.assign(s.player, { level: 6, coins: 400 });
  s.furniture.etagere = { level: 3, plans: 0 };
  s.furniture.cagette = { level: 3, plans: 0 };
  s.furniture.caisse = { level: 3, plans: 0 };
  const shop = s.shops.q1;
  Object.assign(shop, { day: 7, night: 7 });
  Object.assign(shop.phase, { name: 'morning', dawnClaimed: true });
  shop.pads.done = districtDef('q1').pads.map((p) => p.id);
  if (mutate) mutate(s);
  return { [SAVE_KEY]: serialize(calendarDoneToday(s)) };
}

function playUntil(g, bot, pred, maxMs = 600000) {
  for (let ms = 0; ms < maxMs; ms += 100) {
    const st = g.hooks.getState();
    if (pred(st)) return st;
    bot.tick(100);
  }
  throw new Error(`condition non atteinte : ${g.hooks.getState().screen}`);
}

test('Matin : la lune montre le boss et « cette nuit » ; la carte des quartiers dit ce qui manque', () => {
  const g = loadGame({ storage: fullMoonSave((s) => { s.shops.q1.bossAssist = 1; }) });
  try {
    const bot = new TouchBot(g);
    bot.tapEl('.screen-title');
    g.hooks.advance(300);
    assert.equal(g.$('.hub-moon .moon-n').textContent, '1');
    bot.tapEl('.hub-moon');
    g.hooks.advance(200);
    assert.equal(g.hooks.getState().screen, 'moon');
    assert.match(g.$('.moon-name').textContent, /Roi Raton/);
    assert.match(g.$('.moon-when').textContent, /cette nuit/);
    assert.match(g.$('.moon-courage').textContent, new RegExp(String(Math.round(NIGHT.assistPerFail * 100))), 'Courage de Mamie après un échec (M16 : 18,75 %)');
    bot.tapEl('.overlay');
    g.hooks.advance(800);
    assert.equal(g.hooks.getState().screen, 'morning');
    bot.tapEl('.hub-map');
    g.hooks.advance(200);
    assert.equal(g.hooks.getState().screen, 'map');
    assert.equal(g.$('.map-facade[data-district="q1"]').dataset.status, 'here');
    assert.equal(g.$('.map-facade[data-district="q2"]').dataset.status, 'boss');
    bot.tapEl('.panel-back');
    g.hooks.advance(300);
    assert.equal(g.hooks.getState().screen, 'morning');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('Pleine Lune jouée au doigt : le Roi Raton entre, l’aube suit la règle victoire / échec', () => {
  const g = loadGame({ storage: fullMoonSave() });
  try {
    const bot = new TouchBot(g);
    playUntil(g, bot, (s) => s.scene && s.scene.phase === 'night');
    let sawBoss = false;
    const st = playUntil(g, bot, (s) => {
      if (s.scene && s.scene.night && s.scene.night.monsters.some((m) => m.type === 'roi_raton')) sawBoss = true;
      return s.screen === 'dawn';
    });
    assert.ok(sawBoss, 'le Roi Raton est entré');
    const r = st.scene.night.result;
    assert.equal(r.bossNight, true);
    const saved = parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data;
    const dawn = saved.shops.q1.phase.dawn;
    if (r.bossWin) assert.equal(dawn.chest.type, 'moon', 'victoire : Coffre de Lune');
    else {
      assert.equal(r.stars, 0);
      assert.equal(dawn.chest, null, 'échec : pas de coffre');
    }
    playUntil(g, bot, (s) => s.screen === 'morning');
    const after = parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data.shops.q1;
    if (r.bossWin) assert.deepEqual([after.week, after.night], [2, 1]);
    else assert.deepEqual([after.week, after.night, after.bossAssist], [1, 7, 1]);
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
