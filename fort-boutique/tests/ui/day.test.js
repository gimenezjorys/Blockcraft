// M4 : une journée jouée au doigt dans le build de test, avec les sons de base.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../helpers/dom.js';
import { walkTo, waitFor } from '../helpers/drive.js';

test('jour 1 au doigt : cagette -> étagère -> premier client -> encaissement, avec les sons', () => {
  const g = loadGame();
  try {
    assert.equal(g.audio.contexts, 0, 'aucun son avant le premier geste');
    g.fingers.tap(g.$('.screen-title'), 180, 320);
    g.hooks.advance(50);
    assert.equal(g.audio.contexts, 1, 'contexte audio créé au premier geste');
    let st = g.hooks.getState();
    assert.equal(st.scene.phase, 'day');
    // Laisse pousser des pommes, puis va à côté de la cagette (0,1).
    g.hooks.advance(9000);
    assert.ok(walkTo(g, 1.45, 1.5), 'atteint la cagette');
    g.hooks.advance(800);
    st = g.hooks.getState();
    assert.ok(st.scene.player.stack.length >= 3, `pommes sur la tête : ${st.scene.player.stack.length}`);
    const started = g.audio.started;
    assert.ok(started > 0, 'sons de prise');
    // Étagère A (0,4).
    assert.ok(walkTo(g, 1.45, 4.5));
    g.hooks.advance(800);
    st = g.hooks.getState();
    const shelf = st.scene.furniture.find((f) => f.id === 'etagere');
    assert.equal(shelf.product, 'pomme');
    assert.ok(shelf.count >= 3);
    // Le premier client entre (ding) ; le marchand va près de la caisse.
    assert.ok(waitFor(g, (s) => s.scene.day.customers > 0, 3000));
    assert.ok(walkTo(g, 2.5, 3.5));
    assert.ok(waitFor(g, (s) => s.scene.day.served >= 1, 20000), 'premier client servi');
    st = g.hooks.getState();
    assert.ok(st.scene.coins > 0 || st.scene.day.pile > 0);
    assert.ok(waitFor(g, (s) => s.scene.day.pad && s.scene.day.pad.id === 'P1', 2000), 'P1 apparaît après la première vente');
    assert.ok(g.audio.started > started, 'ding de porte et ka-ching');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
