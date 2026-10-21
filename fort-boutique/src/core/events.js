// Fort Boutique — bus d'événements, file d'événements réutilisés, écouteurs DOM traçables (B5).

let liveListeners = 0;

/**
 * Ajoute un écouteur DOM traçable. Toujours passer par ici (test de fuite B5).
 * @param {EventTarget} target
 * @param {string} type
 * @param {(e: Event) => void} fn
 * @param {AddEventListenerOptions | boolean} [opts]
 * @returns {() => void} fonction de libération (idempotente)
 */
export function listen(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  liveListeners++;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    target.removeEventListener(type, fn, opts);
    liveListeners--;
  };
}

/** @returns {number} nombre d'écouteurs DOM actifs. */
export function activeListenerCount() {
  return liveListeners;
}

/** Groupe de libérations (un par écran monté). */
export class Disposer {
  constructor() {
    /** @type {Array<() => void>} */
    this.fns = [];
  }
  /** @param {() => void} fn */
  add(fn) {
    this.fns.push(fn);
    return fn;
  }
  /** Écoute et retient la libération. */
  listen(target, type, fn, opts) {
    return this.add(listen(target, type, fn, opts));
  }
  dispose() {
    const fns = this.fns;
    this.fns = [];
    for (let i = fns.length - 1; i >= 0; i--) fns[i]();
  }
}

/** Petit émetteur synchrone (hors boucle chaude). */
export class Emitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.map = new Map();
  }
  on(type, fn) {
    if (!this.map.has(type)) this.map.set(type, new Set());
    this.map.get(type).add(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) {
    const s = this.map.get(type);
    if (s) s.delete(fn);
  }
  emit(type, payload) {
    const s = this.map.get(type);
    if (!s) return;
    for (const fn of [...s]) fn(payload);
  }
}

/**
 * File d'événements de la simulation vers le rendu et l'audio.
 * Les enregistrements sont réutilisés : aucune allocation par événement.
 */
export class EventQueue {
  /** @param {number} [capacity] */
  constructor(capacity = 512) {
    this.items = [];
    for (let i = 0; i < capacity; i++) this.items.push({ type: '', x: 0, y: 0, a: 0, b: 0, s: '' });
    this.length = 0;
    this.dropped = 0;
  }
  /**
   * @param {string} type
   * @param {number} [x]
   * @param {number} [y]
   * @param {number} [a]
   * @param {number} [b]
   * @param {string} [s]
   */
  push(type, x = 0, y = 0, a = 0, b = 0, s = '') {
    if (this.length >= this.items.length) {
      this.dropped++;
      return;
    }
    const e = this.items[this.length++];
    e.type = type; e.x = x; e.y = y; e.a = a; e.b = b; e.s = s;
  }
  clear() {
    this.length = 0;
  }
}
