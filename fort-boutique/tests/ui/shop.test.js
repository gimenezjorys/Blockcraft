// M3 : dans le build, la boutique s'affiche et le marchand se déplace au joystick (vrais touchers).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../helpers/dom.js';

test('la boutique s’affiche et le marchand avance au doigt', () => {
  const g = loadGame();
  try {
    g.fingers.tap(g.$('.screen-title'), 180, 320);
    g.hooks.advance(50);
    let st = g.hooks.getState();
    assert.equal(st.scene.grid.w, 5);
    const x0 = st.scene.player.x;
    const canvas = g.$('#game');
    g.fingers.start(1, canvas, 120, 560);
    g.fingers.move(1, 70, 560);
    g.hooks.advance(400);
    g.fingers.end(1);
    g.hooks.advance(100);
    st = g.hooks.getState();
    assert.ok(st.scene.player.x < x0 - 0.8, `vers la gauche : ${x0} -> ${st.scene.player.x}`);
    assert.ok(g.canvas.drawCalls > 50, 'la boutique est dessinée');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
