// Fort Boutique — entrées unifiées (B6) : Pointer Events, repli Touch puis Mouse, clavier, multi-touch.
import { perfNow } from '../core/time.js';
import { Disposer } from '../core/events.js';
import { Joystick } from './joystick.js';

const mode = { pointerSeen: false, lastTouchAt: -1e9 };

/**
 * Déduplication des familles d'événements : Pointer Events en priorité,
 * puis Touch Events, puis Mouse Events. Un geste n'est jamais traité deux fois.
 * @param {'pointer' | 'touch' | 'mouse'} family
 * @returns {boolean} vrai si l'événement doit être traité
 */
export function acceptFamily(family) {
  if (family === 'pointer') {
    mode.pointerSeen = true;
    return true;
  }
  if (mode.pointerSeen) return false;
  if (family === 'touch') {
    mode.lastTouchAt = perfNow();
    return true;
  }
  return perfNow() - mode.lastTouchAt > 800;
}

/** Remet la déduplication à zéro (tests). */
export function resetInputMode() {
  mode.pointerSeen = false;
  mode.lastTouchAt = -1e9;
}

const KEYMAP = {
  z: 'up', w: 'up', arrowup: 'up',
  s: 'down', arrowdown: 'down',
  q: 'left', a: 'left', arrowleft: 'left',
  d: 'right', arrowright: 'right',
};

/**
 * @typedef {object} InputOptions
 * @property {HTMLElement} surface élément qui reçoit les gestes (le canvas)
 * @property {() => { scale: number, offsetX: number, offsetY: number }} viewport
 * @property {(x: number, y: number) => string | null} [hitTest] bouton du HUD sous ce point
 * @property {(id: string, phase: 'down' | 'up') => void} [onButton]
 * @property {(x: number, y: number) => void} [onTap] tap hors bouton et hors joystick
 * @property {(key: string) => void} [onKey] Échap, Entrée, Espace…
 * @property {() => boolean} [joystickEnabled]
 * @property {(phase: 'down' | 'move' | 'up' | 'cancel', x: number, y: number) => boolean | void} [onPointer]
 *   gestes bruts pour une scène qui les gère elle-même (éditeur) : si 'down' renvoie vrai, le doigt lui appartient
 */

/**
 * @param {InputOptions} opts
 */
export function createInput(opts) {
  const d = new Disposer();
  const joy = new Joystick();
  /** @type {Map<string, { kind: 'joy' | 'button' | 'tap' | 'scene', button?: string, x0: number, y0: number, moved: boolean }>} */
  const pointers = new Map();
  const keys = new Set();
  const pt = { x: 0, y: 0 };
  const input = {
    joystick: joy,
    /** Vecteur de déplacement (norme ≤ 1). */
    move: { x: 0, y: 0 },
    /** Nombre d'appuis sur la Cloche (consommés par le jeu). */
    bellPresses: 0,
    enabled: true,
    taps: 0,
  };

  function toLogical(cx, cy) {
    const vp = opts.viewport();
    pt.x = (cx - vp.offsetX) / vp.scale;
    pt.y = (cy - vp.offsetY) / vp.scale;
    return pt;
  }

  function down(key, cx, cy) {
    if (!input.enabled) return;
    const p = toLogical(cx, cy);
    const button = opts.hitTest ? opts.hitTest(p.x, p.y) : null;
    if (button) {
      pointers.set(key, { kind: 'button', button, x0: p.x, y0: p.y, moved: false });
      if (button === 'bell') input.bellPresses++;
      if (opts.onButton) opts.onButton(button, 'down');
      return;
    }
    // Un seul doigt à la fois pour la scène (glisser un meuble).
    if (opts.onPointer && ![...pointers.values()].some((s) => s.kind === 'scene') && opts.onPointer('down', p.x, p.y)) {
      pointers.set(key, { kind: 'scene', x0: p.x, y0: p.y, moved: false });
      return;
    }
    const joyOk = !opts.joystickEnabled || opts.joystickEnabled();
    if (joyOk && !joy.active && p.y >= 640 * 0.25) {
      joy.begin(key, p.x, p.y);
      pointers.set(key, { kind: 'joy', x0: p.x, y0: p.y, moved: false });
      return;
    }
    pointers.set(key, { kind: 'tap', x0: p.x, y0: p.y, moved: false });
  }

  function moveTo(key, cx, cy) {
    const st = pointers.get(key);
    if (!st) return;
    const p = toLogical(cx, cy);
    if (Math.hypot(p.x - st.x0, p.y - st.y0) > 10) st.moved = true;
    if (st.kind === 'joy' && joy.pointerId === key) joy.move(p.x, p.y);
    else if (st.kind === 'scene' && opts.onPointer) opts.onPointer('move', p.x, p.y);
  }

  function up(key, cx, cy) {
    const st = pointers.get(key);
    if (!st) return;
    pointers.delete(key);
    if (st.kind === 'scene') {
      const p = toLogical(cx, cy);
      if (opts.onPointer) opts.onPointer('up', p.x, p.y);
      return;
    }
    if (st.kind === 'joy') {
      if (joy.pointerId === key) joy.end();
      // Un tap très court sans déplacement compte aussi comme tap (HUD, objectif).
      if (!st.moved && opts.onTap) {
        const p = toLogical(cx, cy);
        opts.onTap(p.x, p.y);
      }
    } else if (st.kind === 'button') {
      if (opts.onButton) opts.onButton(st.button, 'up');
    } else if (!st.moved && opts.onTap) {
      const p = toLogical(cx, cy);
      input.taps++;
      opts.onTap(p.x, p.y);
    }
  }

  function cancelAll() {
    for (const st of pointers.values()) if (st.kind === 'scene' && opts.onPointer) opts.onPointer('cancel', st.x0, st.y0);
    pointers.clear();
    joy.cancel();
  }

  const s = opts.surface;
  // --- Pointer Events ---
  d.listen(s, 'pointerdown', (e) => {
    if (!acceptFamily('pointer')) return;
    if (e.cancelable) e.preventDefault();
    if (s.setPointerCapture && e.pointerId !== undefined) {
      try { s.setPointerCapture(e.pointerId); } catch { /* jsdom */ }
    }
    down('p' + e.pointerId, e.clientX, e.clientY);
  });
  d.listen(s, 'pointermove', (e) => {
    if (!acceptFamily('pointer')) return;
    moveTo('p' + e.pointerId, e.clientX, e.clientY);
  });
  const pUp = (e) => {
    if (!acceptFamily('pointer')) return;
    up('p' + e.pointerId, e.clientX, e.clientY);
  };
  d.listen(s, 'pointerup', pUp);
  d.listen(s, 'pointercancel', pUp);
  // --- Touch Events (repli) ---
  d.listen(s, 'touchstart', (e) => {
    if (!acceptFamily('touch')) return;
    if (e.cancelable) e.preventDefault();
    for (const t of e.changedTouches) down('t' + t.identifier, t.clientX, t.clientY);
  }, { passive: false });
  d.listen(s, 'touchmove', (e) => {
    if (!acceptFamily('touch')) return;
    if (e.cancelable) e.preventDefault();
    for (const t of e.changedTouches) moveTo('t' + t.identifier, t.clientX, t.clientY);
  }, { passive: false });
  const tUp = (e) => {
    if (!acceptFamily('touch')) return;
    for (const t of e.changedTouches) up('t' + t.identifier, t.clientX, t.clientY);
  };
  d.listen(s, 'touchend', tUp);
  d.listen(s, 'touchcancel', tUp);
  // --- Mouse Events (dernier repli) ---
  let mouseDown = false;
  d.listen(s, 'mousedown', (e) => {
    if (!acceptFamily('mouse')) return;
    mouseDown = true;
    down('m', e.clientX, e.clientY);
  });
  d.listen(window, 'mousemove', (e) => {
    if (!mouseDown || !acceptFamily('mouse')) return;
    moveTo('m', e.clientX, e.clientY);
  });
  d.listen(window, 'mouseup', (e) => {
    if (!mouseDown || !acceptFamily('mouse')) return;
    mouseDown = false;
    up('m', e.clientX, e.clientY);
  });
  // --- Clavier ---
  d.listen(window, 'keydown', (e) => {
    const k = String(e.key || '').toLowerCase();
    const dir = KEYMAP[k];
    if (dir) {
      keys.add(dir);
      if (k.startsWith('arrow') && e.cancelable) e.preventDefault();
      return;
    }
    if (e.repeat) return;
    if (k === ' ' || k === 'spacebar') {
      if (e.cancelable) e.preventDefault();
      if (opts.onKey) opts.onKey(' ');
      return;
    }
    if ((k === 'escape' || k === 'enter') && opts.onKey) opts.onKey(k === 'escape' ? 'Escape' : 'Enter');
  });
  d.listen(window, 'keyup', (e) => {
    const dir = KEYMAP[String(e.key || '').toLowerCase()];
    if (dir) keys.delete(dir);
  });
  d.listen(window, 'blur', () => {
    keys.clear();
    cancelAll();
  });

  /** @param {number} dt */
  input.update = (dt) => {
    joy.update(dt);
    let kx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
    let ky = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    if (kx || ky) {
      const l = Math.hypot(kx, ky);
      kx /= l;
      ky /= l;
      input.move.x = kx;
      input.move.y = ky;
    } else {
      input.move.x = joy.vx;
      input.move.y = joy.vy;
    }
    if (!input.enabled) {
      input.move.x = 0;
      input.move.y = 0;
    }
  };
  input.cancelAll = cancelAll;
  input.keysDown = () => [...keys];
  input.dispose = () => d.dispose();
  return input;
}
