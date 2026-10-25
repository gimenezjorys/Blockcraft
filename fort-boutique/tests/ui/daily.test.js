// M14 : Défi du jour au doigt — carte du jour, aménagement libre, nuit du défi, résultat, partage, retour au Matin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, calendarDoneToday } from '../helpers/dom.js';
import { TouchBot } from '../helpers/bot.js';
import { defaultSave } from '../../src/save/schema.js';
import { serialize, parseAndVerify, SAVE_KEY } from '../../src/save/save.js';

const saved = (g) => parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data;

test('Défi du jour : Jouer, aménager, la nuit, le score ; la 2e fois c’est l’Entraînement', () => {
  const s = defaultSave({ seed: 8, now: 0, lang: 'fr' });
  s.progress.flags.introDone = true;
  s.progress.flags.firstChestDone = true;
  s.progress.flags.editorSeen = true;
  Object.assign(s.stats, { cycles: 3, nights: 3 });
  Object.assign(s.player, { level: 4, coins: 100 });
  Object.assign(s.shops.q1, { day: 4, night: 4 });
  Object.assign(s.shops.q1.phase, { name: 'morning', dawnClaimed: true });
  const g = loadGame({ storage: { [SAVE_KEY]: serialize(calendarDoneToday(s)) } });
  try {
    const bot = new TouchBot(g);
    bot.tapEl('.screen-title');
    g.hooks.advance(300);
    assert.ok(g.$('#hub-daily .badge-dot'), 'pastille : le défi du jour attend');
    bot.tapEl('#hub-daily');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'daily');
    assert.ok(g.$$('.daily-ico .new-tag').length > 0, 'des meubles ou Grignotins « NOUVEAU »');
    bot.tapEl('#daily-play');
    g.hooks.advance(200);
    assert.equal(g.hooks.getState().screen, 'editor', 'aménagement libre des meubles imposés');
    bot.tapEl('#ed-validate');
    g.hooks.advance(200);
    assert.equal(g.hooks.getState().screen, 'hud', 'la nuit du défi commence');
    const coins = saved(g).player.coins;
    for (let ms = 0; ms < 260000 && g.hooks.getState().screen !== 'daily'; ms += 500) g.hooks.advance(500);
    assert.equal(g.hooks.getState().screen, 'daily', 'retour à la carte du défi avec le résultat');
    assert.match(g.$('.daily-score').textContent, /pts/);
    g.hooks.advance(1500);
    const after = saved(g);
    assert.ok(after.player.rubies >= 3, 'première tentative récompensée');
    assert.equal(after.player.coins >= coins, true, 'la vraie partie ne perd rien');
    assert.equal(after.shops.q1.night, 4, 'la semaine de la boutique n’avance pas');
    assert.match(g.$('#daily-play').textContent, /Entraînement/);
    bot.tapEl('#daily-share');
    g.hooks.advance(100);
    bot.tapEl('#daily-close');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'morning');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
