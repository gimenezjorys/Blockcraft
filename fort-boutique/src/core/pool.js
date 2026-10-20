// Fort Boutique — réserves d'objets (B5) : rien ne s'alloue dans les boucles chaudes.

/**
 * Réserve d'objets avec liste active compacte.
 * Parcourir `active` à l'envers et appeler `releaseAt(i)` pour retirer pendant le parcours.
 * @template T
 */
export class Pool {
  /**
   * @param {() => T} create fabrique
   * @param {number} max plafond simultané (B5)
   * @param {number} [prealloc]
   */
  constructor(create, max, prealloc = 0) {
    this.create = create;
    this.max = max;
    /** @type {T[]} */
    this.free = [];
    /** @type {T[]} */
    this.active = [];
    this.refused = 0;
    for (let i = 0; i < prealloc; i++) this.free.push(create());
  }

  /** @returns {T | null} null si le plafond est atteint */
  acquire() {
    if (this.active.length >= this.max) {
      this.refused++;
      return null;
    }
    const o = this.free.length ? this.free.pop() : this.create();
    this.active.push(o);
    return o;
  }

  /** @param {number} i index dans active */
  releaseAt(i) {
    const arr = this.active;
    const o = arr[i];
    const last = arr.length - 1;
    arr[i] = arr[last];
    arr.length = last;
    this.free.push(o);
    return o;
  }

  /** @param {T} o */
  release(o) {
    const i = this.active.indexOf(o);
    if (i >= 0) this.releaseAt(i);
  }

  releaseAll() {
    while (this.active.length) this.free.push(this.active.pop());
  }

  get size() {
    return this.active.length;
  }
}
