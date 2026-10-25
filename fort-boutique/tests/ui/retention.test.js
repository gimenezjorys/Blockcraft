// M12 : Calendrier qui s'ouvre seul au Matin (G19 3:02), réclamation au doigt, Quêtes (onglets, Réclamer), flamme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, TEST_NOW } from '../helpers/dom.js';
import { TouchBot } from '../helpers/bot.js';
import { defaultSave } from '../../src/save/schema.js';
import { serialize, parseAndVerify, SAVE_KEY } from '../../src/save/save.js';

const saved = (g) => parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data;

test('Matin : le calendrier s’ouvre seul, J1 se réclame d’un tap ; Quêtes : Réclamer puis Bestiaire', () => {
  const s = defaultSave({ seed: 5, now: 0, lang: 'fr' });
  s.progress.flags.introDone = true;
  s.progress.flags.firstChestDone = true;
  Object.assign(s.stats, { cycles: 3, nights: 3 });
  Object.assign(s.player, { level: 4, coins: 100 });
  Object.assign(s.shops.q1, { day: 4, night: 4 });
  Object.assign(s.shops.q1.phase, { name: 'morning', dawnClaimed: true });
  const day = Math.floor(TEST_NOW / 86400000);
  s.daily.streak = { ...s.daily.streak, count: 3, best: 3, lastDay: day - 1 };
  s.daily.quests = { day, list: [{ id: 'serve', kind: 'serve', goal: 40, progress: 40, claimed: false }], rerollsUsed: 0, adRerollsUsed: 0, allClaimed: false };
  const g = loadGame({ storage: { [SAVE_KEY]: serialize(s) } });
  try {
    const bot = new TouchBot(g);
    bot.tapEl('.screen-title');
    g.hooks.advance(300);
    assert.equal(g.hooks.getState().screen, 'calendar', 'le calendrier attend une réclamation');
    bot.tapEl('#calendar-today');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'reward');
    bot.tapEl('.reward');
    g.hooks.advance(100);
    assert.equal(saved(g).player.coins, 250, 'J1 : 150 pièces');
    assert.equal(g.$('#calendar-today'), null, 'une seule réclamation aujourd’hui');
    assert.ok(g.$('.cal-locked .cal-count'), 'demain : cadenas et compte à rebours');
    bot.tapEl('#calendar-close');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'morning');
    assert.match(g.$('#hub-flame').textContent, /3/, 'la flamme montre la série');
    assert.ok(g.$('#hub-quests .badge-dot'), 'pastille : une quête attend');
    bot.tapEl('#hub-quests');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'quests');
    bot.tapEl('#quest-claim-0');
    g.hooks.advance(100);
    bot.tapEl('.reward');
    g.hooks.advance(1500);
    const after = saved(g);
    assert.equal(after.daily.quests.list[0].claimed, true);
    assert.equal(after.player.coins, 330, '1re quête : 80 pièces');
    bot.tapEl('#quests-tab-bestiary');
    g.hooks.advance(100);
    assert.equal(g.$('.best-card'), null, 'Bestiaire verrouillé (niveau 6) : on reste sur le Jour');
    bot.tapEl('#quests-close');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'morning');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
