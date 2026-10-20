// M1 : entrées réelles dans le build de test (toucher, souris, clavier, second doigt, pause onglet caché).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../helpers/dom.js';
import { mouse, key } from '../helpers/touch.js';

function toDemo(g) {
  g.fingers.tap(g.$('.screen-title'), 180, 320);
  g.hooks.advance(50);
  const st = g.hooks.getState();
  assert.equal(st.screen, 'blank');
  return st.scene.ball;
}

test('joystick piloté par de vrais touchstart/touchmove/touchend', () => {
  const g = loadGame();
  try {
    const start = toDemo(g);
    const canvas = g.$('#game');
    g.fingers.start(1, canvas, 100, 450);
    g.fingers.move(1, 152, 450);
    g.hooks.advance(500);
    let st = g.hooks.getState();
    assert.equal(st.joystick.active, true);
    assert.ok(Math.abs(st.move.x - 1) < 1e-6);
    assert.ok(st.scene.ball.x > start.x + 60, `le rond avance : ${st.scene.ball.x}`);
    g.fingers.end(1);
    g.hooks.advance(100);
    st = g.hooks.getState();
    assert.equal(st.joystick.active, false);
    assert.equal(st.move.x, 0, 'arrêt après la décélération');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('même vecteur à la souris', () => {
  const g = loadGame();
  try {
    toDemo(g);
    // Les événements souris qui suivent un toucher de moins de 800 ms sont des doublons : on attend.
    g.hooks.advance(1000);
    const canvas = g.$('#game');
    mouse(g.window, 'mousedown', canvas, 100, 450);
    mouse(g.window, 'mousemove', g.document, 100 - 20, 450 + 21);
    g.hooks.advance(20);
    const st = g.hooks.getState();
    const len = Math.hypot(st.move.x, st.move.y);
    const expected = (29 - 6) / (52 - 6);
    assert.ok(Math.abs(len - expected) < 1e-6, `norme ${len}`);
    assert.ok(st.move.x < 0 && st.move.y > 0);
    mouse(g.window, 'mouseup', g.document, 80, 471, 0);
    g.hooks.advance(100);
    assert.equal(g.hooks.getState().move.x, 0);
  } finally {
    g.close();
  }
});

test('ZQSD, WASD et flèches', () => {
  const g = loadGame();
  try {
    toDemo(g);
    for (const [k, dx, dy] of [['z', 0, -1], ['q', -1, 0], ['s', 0, 1], ['d', 1, 0], ['w', 0, -1], ['a', -1, 0], ['ArrowUp', 0, -1], ['ArrowLeft', -1, 0], ['ArrowDown', 0, 1], ['ArrowRight', 1, 0]]) {
      key(g.window, 'keydown', k);
      g.hooks.advance(20);
      const m = g.hooks.getState().move;
      assert.ok(Math.abs(m.x - dx) < 1e-9 && Math.abs(m.y - dy) < 1e-9, `${k} -> ${m.x},${m.y}`);
      key(g.window, 'keyup', k);
      g.hooks.advance(20);
    }
    key(g.window, 'keydown', 'd');
    key(g.window, 'keydown', 's');
    g.hooks.advance(20);
    const m = g.hooks.getState().move;
    assert.ok(Math.abs(Math.hypot(m.x, m.y) - 1) < 1e-9, 'diagonale normalisée');
  } finally {
    g.close();
  }
});

test('second doigt : la Cloche pendant que le premier tient le joystick', () => {
  const g = loadGame();
  try {
    toDemo(g);
    const canvas = g.$('#game');
    g.fingers.start(1, canvas, 100, 450);
    g.fingers.move(1, 100, 400);
    g.hooks.advance(50);
    g.fingers.start(2, canvas, 312, 592);
    g.fingers.end(2);
    g.hooks.advance(50);
    const st = g.hooks.getState();
    assert.equal(st.scene.bells, 1, 'la Cloche a été touchée');
    assert.equal(st.joystick.active, true, 'le joystick reste tenu');
    assert.ok(st.move.y < -0.9);
  } finally {
    g.close();
  }
});

test('Pointer Events prioritaires : un geste n’est jamais traité deux fois', () => {
  const g = loadGame();
  try {
    toDemo(g);
    const canvas = g.$('#game');
    const pe = (type, x, y) => canvas.dispatchEvent(new g.window.PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 5, pointerType: 'touch' }));
    pe('pointerdown', 312, 592);
    // Le navigateur envoie aussi les Touch Events du même geste : ils doivent être ignorés.
    g.fingers.start(9, canvas, 312, 592);
    g.fingers.end(9);
    pe('pointerup', 312, 592);
    g.hooks.advance(20);
    assert.equal(g.hooks.getState().scene.bells, 1);
  } finally {
    g.close();
  }
});

test('pause sur visibilitychange (onglet caché)', () => {
  const g = loadGame();
  try {
    toDemo(g);
    const t0 = g.hooks.getState().simTime;
    Object.defineProperty(g.document, 'hidden', { value: true, configurable: true });
    g.document.dispatchEvent(new g.window.Event('visibilitychange'));
    g.hooks.advance(1000);
    let st = g.hooks.getState();
    assert.equal(st.paused, true);
    assert.equal(st.simTime, t0);
    Object.defineProperty(g.document, 'hidden', { value: false, configurable: true });
    g.document.dispatchEvent(new g.window.Event('visibilitychange'));
    g.hooks.advance(1000);
    st = g.hooks.getState();
    assert.equal(st.paused, false);
    assert.ok(st.simTime > t0 + 0.9);
  } finally {
    g.close();
  }
});

test('?debug=1 affiche l’overlay ; absent sinon', () => {
  const g = loadGame({ query: '?debug=1' });
  const g2 = loadGame();
  try {
    assert.ok(g.$('.debug-panel'));
    assert.match(g.$('.debug-stats').textContent, /FPS/);
    assert.equal(g2.$('.debug-panel'), null);
  } finally {
    g.close();
    g2.close();
  }
});
