// Polyfill tactile minimal conforme (D1.3) + gestes en VRAIS événements DOM.

/**
 * Ajoute window.Touch si jsdom ne le fournit pas.
 * @param {Window} window
 */
export function installTouch(window) {
  if (typeof window.Touch === 'function') return;
  class Touch {
    constructor(init) {
      this.identifier = init.identifier;
      this.target = init.target;
      this.clientX = init.clientX || 0;
      this.clientY = init.clientY || 0;
      this.pageX = init.pageX ?? this.clientX;
      this.pageY = init.pageY ?? this.clientY;
      this.screenX = init.screenX ?? this.clientX;
      this.screenY = init.screenY ?? this.clientY;
      this.radiusX = init.radiusX || 1;
      this.radiusY = init.radiusY || 1;
      this.force = init.force ?? 1;
    }
  }
  window.Touch = Touch;
}

/**
 * Pilote de gestes : maintient les doigts actifs comme un vrai navigateur.
 */
export class Fingers {
  /** @param {Window} window */
  constructor(window) {
    this.w = window;
    /** @type {Map<number, any>} */
    this.active = new Map();
  }
  _touch(id, target, x, y) {
    return new this.w.Touch({ identifier: id, target, clientX: x, clientY: y });
  }
  _fire(type, target, changed) {
    const touches = [...this.active.values()];
    const ev = new this.w.TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches,
      targetTouches: touches.filter((t) => t.target === target),
      changedTouches: changed,
    });
    target.dispatchEvent(ev);
    return ev;
  }
  start(id, target, x, y) {
    const t = this._touch(id, target, x, y);
    this.active.set(id, t);
    return this._fire('touchstart', target, [t]);
  }
  move(id, x, y) {
    const old = this.active.get(id);
    const t = this._touch(id, old.target, x, y);
    this.active.set(id, t);
    return this._fire('touchmove', old.target, [t]);
  }
  end(id) {
    const old = this.active.get(id);
    this.active.delete(id);
    return this._fire('touchend', old.target, [old]);
  }
  /** Un tap complet. */
  tap(target, x = 10, y = 10, id = 99) {
    this.start(id, target, x, y);
    this.end(id);
  }
}

/** Gestes à la souris (MouseEvent). */
export function mouse(window, type, target, x, y, buttons = 1) {
  const ev = new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons, button: 0 });
  target.dispatchEvent(ev);
  return ev;
}

/** Gestes au pointeur (PointerEvent). */
export function pointer(window, type, target, x, y, id = 1, pointerType = 'touch') {
  const ev = new window.PointerEvent(type, {
    bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: id, pointerType, isPrimary: id === 1, buttons: 1,
  });
  target.dispatchEvent(ev);
  return ev;
}

/** Touche clavier (KeyboardEvent). */
export function key(window, type, k, target = window.document) {
  const code = { ' ': 'Space', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', Escape: 'Escape', Enter: 'Enter' }[k] || `Key${k.toUpperCase()}`;
  const ev = new window.KeyboardEvent(type, { key: k, code, bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
}

/** Tap sur un élément DOM : touchstart + touchend au centre logique fourni. */
export function tapEl(window, el, x = 180, y = 320) {
  const f = new Fingers(window);
  f.tap(el, x, y, 77);
}
