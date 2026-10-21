// v0.2 : Paramètres au doigt — réglages gardés, export puis import = même partie, réinitialisation en deux temps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../helpers/dom.js';
import { TouchBot } from '../helpers/bot.js';
import { defaultSave } from '../../src/save/schema.js';
import { serialize, parseAndVerify, SAVE_KEY } from '../../src/save/save.js';

/** Matin du jour 3, niveau 4, 777 pièces. */
function morningSave() {
  const s = defaultSave({ seed: 9, now: 0, lang: 'fr' });
  s.progress.flags.introDone = true;
  s.progress.flags.firstChestDone = true;
  Object.assign(s.stats, { cycles: 2, nights: 2 });
  Object.assign(s.player, { level: 4, coins: 777 });
  Object.assign(s.shops.q1, { day: 3, night: 3 });
  Object.assign(s.shops.q1.phase, { name: 'morning', dawnClaimed: true });
  return { [SAVE_KEY]: serialize(s) };
}

const saved = (g) => parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data;

function openSettings(g, bot) {
  bot.tapEl('.screen-title');
  g.hooks.advance(300);
  assert.equal(g.hooks.getState().screen, 'morning');
  bot.tapEl('.hub-gear');
  g.hooks.advance(200);
  assert.equal(g.hooks.getState().screen, 'settings', 'le rouage ouvre les Paramètres');
}

test('Paramètres : un réglage est gardé ; exporter puis importer redonne la même partie', () => {
  const g = loadGame({ storage: morningSave() });
  try {
    const bot = new TouchBot(g);
    openSettings(g, bot);
    bot.tapEl('#set-shake');
    g.hooks.advance(700);
    assert.equal(saved(g).settings.shake, false, 'secousses coupées et sauvegardées');
    bot.tapEl('#set-export');
    g.hooks.advance(50);
    const code = g.$('#set-code').value;
    assert.match(code, /^FB1-[A-Za-z0-9_-]+-[0-9a-f]{8}$/);
    const before = saved(g);
    // On réimporte le code : on retrouve exactement l'état exporté.
    bot.tapEl('#set-import');
    g.hooks.advance(50);
    g.$('#set-import-code').value = 'FB1-pas-valide';
    bot.tapEl('#set-check');
    g.hooks.advance(50);
    assert.ok(g.$('.set-msg').classList.contains('bad'), 'un mauvais code est refusé');
    assert.equal(g.$('#set-replace'), null);
    g.$('#set-import-code').value = code;
    bot.tapEl('#set-check');
    g.hooks.advance(50);
    assert.match(g.$('.set-cmp').textContent, /777/, 'comparaison avant de remplacer');
    bot.tapEl('#set-replace');
    g.hooks.advance(700);
    assert.equal(g.hooks.getState().screen, 'title');
    bot.tapEl('.screen-title');
    g.hooks.advance(300);
    const after = saved(g);
    for (const k of ['player', 'shops', 'furniture', 'progress', 'settings', 'stats', 'seed']) {
      const norm = (x) => {
        const c = JSON.parse(JSON.stringify(x));
        // Seul le compteur de lancements change : rouvrir la partie est une nouvelle session.
        if (k === 'stats') delete c.sessions;
        return c;
      };
      assert.deepEqual(norm(after[k]), norm(before[k]), k);
    }
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('Paramètres : réinitialiser demande deux taps ; l’ancienne partie reste en secours', () => {
  const g = loadGame({ storage: morningSave() });
  try {
    const bot = new TouchBot(g);
    openSettings(g, bot);
    bot.tapEl('#set-reset');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'settings', 'un seul tap ne fait rien d’irréversible');
    g.hooks.advance(5500);
    bot.tapEl('#set-reset');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'settings', 'le délai de confirmation est passé : il faut recommencer');
    bot.tapEl('#set-reset');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'title');
    assert.equal(saved(g).player.coins, 0, 'partie neuve');
    assert.ok(g.window.localStorage.getItem('fortboutique.save.beforeReset'), 'copie de la partie effacée');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('Pause : le bouton Paramètres ouvre l’écran (plus de « Bientôt »)', () => {
  const g = loadGame({ storage: morningSave() });
  try {
    const bot = new TouchBot(g);
    bot.tapEl('.screen-title');
    g.hooks.advance(300);
    bot.tapEl('#hub-open');
    g.hooks.advance(500);
    g.window.document.dispatchEvent(new g.window.KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'pause');
    bot.tapEl('#pause-settings');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'settings');
    bot.tapEl('#settings-close');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'pause');
  } finally {
    g.close();
  }
});

test('Paramètres : la langue change tout de suite et reste choisie', () => {
  const g = loadGame({ storage: morningSave() });
  try {
    const bot = new TouchBot(g);
    openSettings(g, bot);
    bot.tapEl('#set-lang-en');
    g.hooks.advance(700);
    assert.equal(g.hooks.getState().screen, 'settings', 'Paramètres rouverts');
    assert.match(g.$('.settings .panel-title').textContent, /Settings/);
    bot.tapEl('#settings-close');
    g.hooks.advance(100);
    assert.match(g.$('#hub-open').textContent, /OPEN|Open/i);
    assert.equal(saved(g).settings.lang, 'en');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
