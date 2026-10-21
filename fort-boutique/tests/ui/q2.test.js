// M16 : aller à la Boulangerie au doigt (carte des quartiers), y ouvrir une journée ; le Q1 garde sa semaine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, calendarDoneToday } from '../helpers/dom.js';
import { TouchBot } from '../helpers/bot.js';
import { defaultSave } from '../../src/save/schema.js';
import { serialize, parseAndVerify, SAVE_KEY } from '../../src/save/save.js';

const saved = (g) => parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data;

test('carte : le Roi Raton vaincu et le niveau 7 ouvrent la Boulangerie ; on y joue, l’Épicerie garde sa semaine', () => {
  const s = defaultSave({ seed: 13, now: 0, lang: 'fr' });
  Object.assign(s.progress.flags, { introDone: true, firstChestDone: true, editorSeen: true });
  Object.assign(s.stats, { cycles: 10, nights: 10, playtimeMs: 3600000 });
  Object.assign(s.player, { level: 7, coins: 2000 });
  Object.assign(s.shops.q1, { day: 11, night: 1, week: 2, bossBeatenCount: 1 });
  Object.assign(s.shops.q1.phase, { name: 'morning', dawnClaimed: true });
  s.progress.unlocksSeen = [2, 3, 4, 5, 6, 7];
  const g = loadGame({ storage: { [SAVE_KEY]: serialize(calendarDoneToday(s)) } });
  try {
    const bot = new TouchBot(g);
    bot.tapEl('.screen-title');
    g.hooks.advance(300);
    // La carte du nouveau quartier se fête d'abord (la boutique est créée au Matin, même si le niveau est venu après).
    for (let k = 0; k < 4 && g.hooks.getState().screen === 'unlocks'; k++) {
      bot.tapEl('#unlock-ok');
      g.hooks.advance(500);
    }
    assert.equal(g.hooks.getState().screen, 'morning');
    assert.ok(saved(g).shops.q2 && saved(g).shops.q2.unlocked, 'Boulangerie ouverte');
    bot.tapEl('.hub-map');
    g.hooks.advance(200);
    assert.equal(g.hooks.getState().screen, 'map');
    bot.tapEl('#map-go-q2');
    g.hooks.advance(500);
    assert.equal(g.hooks.getState().screen, 'morning');
    assert.equal(saved(g).currentShop, 'q2');
    bot.tapEl('#hub-open');
    g.hooks.advance(1000);
    const st = g.hooks.getState().scene;
    assert.equal(st.phase, 'day', 'journée à la Boulangerie');
    assert.ok(st.furniture.some((f) => f.id === 'four'), 'le four est là');
    const after = saved(g);
    assert.equal(after.shops.q1.week, 2, 'l’Épicerie garde sa semaine');
    assert.equal(after.shops.q2.day, 1);
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
