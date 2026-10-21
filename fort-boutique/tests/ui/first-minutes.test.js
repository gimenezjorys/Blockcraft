// M11 : les 10 premières minutes au doigt (G19) — scène de l'enveloppe, étiquette d'objectif, indices, aube au rythme de G19.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../helpers/dom.js';
import { TouchBot } from '../helpers/bot.js';
import { waitFor } from '../helpers/drive.js';

const visible = (g, sel) => {
  const el = g.$(sel);
  return !!el && !el.closest('[hidden]');
};

test('enveloppe (G19 0:02) : un tap n’importe où l’ouvre, le Jour 1 commence, aucun mot à lire', () => {
  const g = loadGame();
  try {
    g.fingers.tap(g.$('.screen-title'), 180, 320);
    g.hooks.advance(200);
    assert.equal(g.hooks.getState().screen, 'intro');
    assert.equal(g.$('.intro').textContent.trim(), '', 'aucun texte dans la scène');
    // Main fantôme après 4 s sans tap.
    g.hooks.advance(1900 + 4200);
    assert.ok(visible(g, '.intro .ghost-hand'), 'la main fantôme montre l’enveloppe');
    // Tap à côté de l’enveloppe : on ne bloque jamais.
    g.fingers.tap(g.$('.intro'), 40, 600);
    assert.ok(waitFor(g, (s) => s.scene && s.scene.phase === 'day', 4000, 50));
    assert.equal(g.hooks.getState().screen, 'hud');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('Jour 1 : l’étiquette d’objectif est là dès le début (P1, 40) ; main et flèche dorée tout de suite', () => {
  const g = loadGame();
  try {
    const bot = new TouchBot(g);
    for (let i = 0; i < 80 && !(g.hooks.getState().scene && g.hooks.getState().scene.phase === 'day'); i++) bot.tick(100);
    g.hooks.advance(600);
    assert.ok(visible(g, '#objective'), 'objectif visible');
    assert.equal(g.$('#objective').dataset.kind, 'pad');
    assert.match(g.$('#objective').textContent, /40/);
    assert.equal(g.$('#objective').getAttribute('aria-label'), 'Prochain objectif', 'le nom n’est que pour les lecteurs d’écran');
    const h = g.hooks.getState().scene.hints;
    assert.ok(h.hand, 'main fantôme (G19 0:06)');
    assert.equal(h.arrow, 'gold', 'flèche dorée vers la cagette');
  } finally {
    g.close();
  }
});

test('tap sur l’objectif pendant le Jour : la flèche montre l’emplacement ; aube : coffre, cartes, puis ruban', () => {
  const g = loadGame();
  try {
    const bot = new TouchBot(g);
    let st = null;
    for (let i = 0; i < 2000; i++) {
      bot.tick(100);
      st = g.hooks.getState();
      if (st.scene && st.scene.day && st.scene.day.pad && st.scene.coins < st.scene.day.pad.price) break;
    }
    assert.ok(st.scene.day.pad, 'P1 est au sol');
    bot.release();
    // On arrête le robot (sinon il bouge) et on tape l’étiquette.
    bot.tapEl('#objective');
    g.hooks.advance(100);
    const pad = g.hooks.getState().scene.day.pad;
    // (copie JSON : les objets de jsdom ne sont pas ceux de Node)
    assert.deepEqual(JSON.parse(JSON.stringify(g.hooks.getState().scene.hints.to)), { x: pad.x + 0.5, y: pad.y + 0.5 }, 'la flèche dorée montre l’emplacement');
    // Jusqu’à l’aube : la pluie de pièces passe avant le ticket.
    for (let i = 0; i < 4000 && g.hooks.getState().scene.phase !== 'dawn'; i++) bot.tick(100);
    assert.equal(g.hooks.getState().screen, 'hud', 'pluie de pièces avant l’écran de l’aube');
    // 2,5 s de jeu (un peu plus en temps réel : le dernier Grignotin passe au ralenti).
    assert.ok(waitFor(g, (x) => x.screen === 'dawn', 4000, 100), 'puis l’écran de l’aube');
    assert.ok(g.$('.dawn-chest').hidden, 'le ticket s’imprime d’abord');
    assert.ok(waitFor(g, () => visible(g, '.dawn-chest'), 12000, 100), 'puis le coffre');
  } finally {
    g.close();
  }
});

test('quitter vers l’écran titre pendant la pluie de pièces : l’aube ne s’ouvre pas par-dessus ; elle revient au retour', async () => {
  const { key } = await import('../helpers/touch.js');
  const g = loadGame();
  try {
    const bot = new TouchBot(g);
    for (let i = 0; i < 4000 && !(g.hooks.getState().scene && g.hooks.getState().scene.phase === 'dawn'); i++) bot.tick(100);
    assert.equal(g.hooks.getState().screen, 'hud');
    key(g.window, 'keydown', 'Escape');
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().screen, 'pause');
    bot.tapEl('#pause-quit');
    g.hooks.advance(4000);
    assert.equal(g.hooks.getState().screen, 'title', 'l’écran titre reste');
    bot.tapEl('.screen-title');
    g.hooks.advance(300);
    assert.equal(g.hooks.getState().screen, 'dawn', 'l’aube reprend (gains déjà sauvegardés)');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
