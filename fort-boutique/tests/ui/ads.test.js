// M15 : pub de test au doigt (?ads=sim) — fermée avant la fin : rien ; vue jusqu'au bout : pièces de la nuit × 2 ;
// son coupé et jeu arrêté pendant la pub ; Garde-robe ouverte depuis le Matin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, calendarDoneToday } from '../helpers/dom.js';
import { TouchBot } from '../helpers/bot.js';
import { defaultSave } from '../../src/save/schema.js';
import { createGame } from '../../src/game/state.js';
import { startNight } from '../../src/game/night/night.js';
import { stepGame } from '../../src/game/phases.js';
import { enterDawn } from '../../src/game/cycle.js';
import { serialize, parseAndVerify, SAVE_KEY } from '../../src/save/save.js';

const saved = (g) => parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data;
/** Laisse passer les promesses (fin de la pub) entre deux avances du temps simulé. */
const flush = () => new Promise((r) => setImmediate(r));

/** Sauvegarde à l'aube d'une nuit gagnée, niveau 6, 20 min de jeu. */
function dawnSave() {
  const s = defaultSave({ seed: 6, now: 0, lang: 'fr' });
  s.progress.flags.introDone = true;
  s.progress.flags.firstChestDone = true;
  Object.assign(s.stats, { cycles: 4, nights: 4, playtimeMs: 20 * 60000 });
  Object.assign(s.player, { level: 6, coins: 500, rubies: 40 });
  Object.assign(s.shops.q1, { day: 5, night: 5 });
  const g = createGame({ save: s });
  for (const f of g.furn) f.eyes = 1;
  startNight(g, { dayTakings: 200, waves: { waves: [{ groups: [{ type: 'souris', count: 2, entrance: 'backdoor' }], boss: null }], golden: -1, newTypes: [] } });
  for (let i = 0; i < 60 * 90 && !g.night.ended; i++) {
    stepGame(g, 1 / 60);
    g.events.clear();
  }
  g.nightResult = g.night.result;
  g.dayResult = { takings: 200, sales: 180, tips: 20 };
  enterDawn(g);
  return calendarDoneToday(s);
}

test('pub de test : fermée avant la fin = pas de récompense ; vue jusqu’au bout = × 2 ; son coupé pendant la pub', async () => {
  const s = dawnSave();
  const nightCoins = s.shops.q1.phase.dawn.result.coins;
  assert.ok(nightCoins > 0);
  const g = loadGame({ storage: { [SAVE_KEY]: serialize(s) }, query: '?ads=sim' });
  try {
    const bot = new TouchBot(g);
    bot.tapEl('.screen-title');
    g.hooks.advance(4000);
    assert.equal(g.hooks.getState().screen, 'dawn');
    const coins0 = saved(g).player.coins;
    assert.ok(!g.$('#dawn-double').hidden, '×2 proposé (choix du joueur)');
    bot.tapEl('#dawn-double');
    g.hooks.advance(500);
    assert.equal(g.hooks.getState().screen, 'ad', 'écran « PUB DE TEST »');
    assert.equal(g.hooks.getState().audioMuted, true, 'son coupé pendant la pub');
    assert.equal(g.hooks.getState().scene.phase, 'dawn', 'le jeu ne tourne pas pendant la pub (aube figée)');
    bot.tapEl('#ad-close');
    await flush();
    g.hooks.advance(1500);
    assert.equal(g.hooks.getState().screen, 'dawn');
    assert.equal(saved(g).player.coins, coins0, 'fermée avant la fin : rien');
    assert.equal(g.hooks.getState().audioMuted, false, 'le son revient');
    bot.tapEl('#dawn-double');
    g.hooks.advance(3500);
    await flush();
    assert.equal(g.hooks.getState().screen, 'dawn', 'la pub se ferme seule à la fin');
    g.hooks.advance(1500);
    assert.equal(saved(g).player.coins, coins0 + nightCoins, 'pièces de la nuit × 2');
    g.hooks.advance(600);
    assert.ok(g.$('#dawn-double').hidden, 'une fois par nuit');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('sans régie : le bouton × 2 reste visible mais grisé, « Pub indisponible », aucune récompense', async () => {
  const s = dawnSave();
  const g = loadGame({ storage: { [SAVE_KEY]: serialize(s) } });
  try {
    const bot = new TouchBot(g);
    bot.tapEl('.screen-title');
    g.hooks.advance(4000);
    const coins0 = saved(g).player.coins;
    assert.ok(g.$('#dawn-double').classList.contains('disabled'));
    bot.tapEl('#dawn-double');
    g.hooks.advance(1000);
    assert.equal(g.hooks.getState().screen, 'dawn');
    assert.equal(saved(g).player.coins, coins0);
    assert.ok(g.hooks.getState().toasts.some((x) => /indisponible/.test(x)));
    // Garde-robe : depuis le Matin, acheter et porter un chapeau (rubis).
    bot.tapEl('#dawn-continue');
    g.hooks.advance(800);
    while (g.hooks.getState().screen === 'unlocks') {
      bot.tapEl('#unlock-ok');
      g.hooks.advance(600);
    }
    assert.equal(g.hooks.getState().screen, 'morning');
    const rubies0 = saved(g).player.rubies;
    bot.tapEl('#hub-wardrobe');
    g.hooks.advance(200);
    assert.equal(g.hooks.getState().screen, 'wardrobe');
    assert.equal(g.$('#wardrobe-ad'), null, '« +3 rubis » masqué sans régie');
    bot.tapEl('#ward-straw_hat');
    g.hooks.advance(100);
    bot.tapEl('#ward-straw_hat');
    g.hooks.advance(1500);
    const after = saved(g);
    assert.equal(after.player.rubies, rubies0 - 30, 'Chapeau de paille : 30 rubis');
    assert.equal(after.cosmetics.equipped.outfit, 'straw_hat');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
