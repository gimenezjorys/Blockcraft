// Fort Boutique — générateur aléatoire à graine (sfc32), avec sous-générateurs indépendants.
// Seule source d'aléatoire de la logique (A6) : Math.random est interdit dans game/, data/ et core/.

/**
 * Hache une chaîne en entier 32 bits non signé (FNV-1a + mélange final).
 * @param {string} str
 * @returns {number}
 */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return mix32(h);
}

/**
 * Mélange avalanche d'un entier 32 bits.
 * @param {number} x
 */
export function mix32(x) {
  x = x >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

/**
 * Combine plusieurs valeurs en une graine 32 bits.
 * @param {...(number|string)} parts
 */
export function seedFrom(...parts) {
  let h = 0x9e3779b9;
  for (const p of parts) {
    const v = typeof p === 'number' ? mix32(Math.floor(p) ^ Math.floor(p / 4294967296)) : hashString(String(p));
    h = mix32(h ^ v ^ (h << 6) ^ (h >>> 2));
  }
  return h >>> 0;
}

function splitmix32(a) {
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return t >>> 0;
  };
}

/** Générateur sfc32 déterministe. */
export class Rng {
  /** @param {number} seed entier 32 bits */
  constructor(seed) {
    this.seed = seed >>> 0;
    const sm = splitmix32(this.seed);
    this.a = sm();
    this.b = sm();
    this.c = sm();
    this.d = sm();
    for (let i = 0; i < 12; i++) this.nextU32();
  }

  /** @returns {number} entier 32 bits non signé */
  nextU32() {
    let { a, b, c, d } = this;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    this.a = a; this.b = b; this.c = c; this.d = d;
    return t >>> 0;
  }

  /** @returns {number} réel dans [0, 1) */
  next() {
    return this.nextU32() / 4294967296;
  }

  /** @param {number} n @returns {number} entier dans [0, n) */
  int(n) {
    return Math.floor(this.next() * n);
  }

  /** @returns {number} entier dans [lo, hi] (bornes incluses) */
  intRange(lo, hi) {
    return lo + this.int(hi - lo + 1);
  }

  /** @returns {number} réel dans [lo, hi) */
  range(lo, hi) {
    return lo + this.next() * (hi - lo);
  }

  /** @param {number} p probabilité */
  chance(p) {
    return this.next() < p;
  }

  /** @template T @param {T[]} arr @returns {T} */
  pick(arr) {
    return arr[this.int(arr.length)];
  }

  /**
   * Tirage pondéré.
   * @template T
   * @param {T[]} items
   * @param {(item: T) => number} weight
   * @returns {T | undefined}
   */
  weighted(items, weight) {
    let total = 0;
    for (const it of items) total += Math.max(0, weight(it));
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (const it of items) {
      r -= Math.max(0, weight(it));
      if (r < 0) return it;
    }
    return items[items.length - 1];
  }

  /** Mélange de Fisher-Yates (en place). @template T @param {T[]} arr */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /** Loi normale (Box-Muller). */
  normal(mean = 0, sd = 1) {
    const u = 1 - this.next();
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /**
   * Sous-générateur indépendant, dérivé de la graine d'origine et d'une étiquette.
   * Ne consomme pas de tirage du générateur parent.
   * @param {string | number} label
   * @returns {Rng}
   */
  fork(label) {
    return new Rng(seedFrom(this.seed, label));
  }

  /** @returns {number[]} état complet (pour sauvegarder un tirage en cours) */
  getState() {
    return [this.a, this.b, this.c, this.d];
  }

  /** @param {number[]} s */
  setState(s) {
    [this.a, this.b, this.c, this.d] = s.map((v) => v | 0);
  }
}

/**
 * Raccourci.
 * @param {number} seed
 */
export function createRng(seed) {
  return new Rng(seed);
}
