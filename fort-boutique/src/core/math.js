// Fort Boutique — petits utilitaires mathématiques.

/** @param {number} v @param {number} lo @param {number} hi */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
/** @param {number} a @param {number} b @param {number} t */
export const lerp = (a, b, t) => a + (b - a) * t;
/** Distance au carré. */
export const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
/** Distance. */
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
/** Rapproche v de target d'au plus step. */
export const approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
/** Arrondi à n décimales. */
export const round = (v, n = 0) => {
  const k = 10 ** n;
  return Math.round(v * k) / k;
};

/**
 * Distance d'un point à un rectangle (0 à l'intérieur).
 * @param {number} px @param {number} py
 * @param {number} x @param {number} y coin haut-gauche
 * @param {number} w @param {number} h
 */
export function distToRect(px, py, x, y, w, h) {
  const dx = Math.max(x - px, 0, px - (x + w));
  const dy = Math.max(y - py, 0, py - (y + h));
  return Math.sqrt(dx * dx + dy * dy);
}

/** Courbe « retour élastique ». */
export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Courbe douce. */
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

/** Point d'une courbe de Bézier quadratique. */
export function quadBezier(a, c, b, t) {
  const u = 1 - t;
  return u * u * a + 2 * u * t * c + t * t * b;
}

/** Plus grand arrondi supérieur sûr (évite 2.0000001 -> 3). */
export const ceilSafe = (v) => Math.ceil(v - 1e-9);
