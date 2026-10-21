// Fort Boutique — horloge UTC injectable (B7, A0.7).
// Seul fichier de src/ autorisé à lire Date.now() et à construire des dates.

/** Millisecondes dans un jour. */
export const DAY_MS = 86400000;

let clockOverride = null;
let perfOverride = null;

/**
 * Remplace l'horloge murale (tests, debug « avancer d'un jour »).
 * @param {(() => number) | null} fn fonction qui renvoie des millisecondes, ou null pour l'horloge réelle
 */
export function setClock(fn) {
  clockOverride = typeof fn === 'function' ? fn : null;
}

/**
 * Remplace l'horloge monotone (tests).
 * @param {(() => number) | null} fn
 */
export function setPerfClock(fn) {
  perfOverride = typeof fn === 'function' ? fn : null;
}

/** @returns {number} millisecondes depuis l'époque Unix (UTC). */
export function now() {
  return clockOverride ? clockOverride() : Date.now();
}

/** @returns {number} horloge monotone en millisecondes (mesure de durées). */
export function perfNow() {
  if (perfOverride) return perfOverride();
  if (typeof performance !== 'undefined' && performance.now) return performance.now();
  return Date.now();
}

/**
 * Numéro du jour UTC.
 * @param {number} [ms]
 * @returns {number}
 */
export function utcDay(ms = now()) {
  return Math.floor(ms / DAY_MS);
}

/**
 * Numéro de la semaine UTC (du lundi au dimanche). Le 1er janvier 1970 était un jeudi.
 * @param {number} [ms]
 * @returns {number}
 */
export function utcWeek(ms = now()) {
  return Math.floor((utcDay(ms) + 3) / 7);
}

/** Jour de la semaine UTC : 0 = lundi … 6 = dimanche. */
export function utcWeekday(ms = now()) {
  return (((utcDay(ms) + 3) % 7) + 7) % 7;
}

/**
 * Millisecondes avant le prochain jour UTC.
 * @param {number} [ms]
 */
export function msUntilNextUtcDay(ms = now()) {
  return (utcDay(ms) + 1) * DAY_MS - ms;
}

/** Millisecondes avant la prochaine semaine UTC (lundi 00:00). */
export function msUntilNextUtcWeek(ms = now()) {
  const nextWeekDay = (utcWeek(ms) + 1) * 7 - 3;
  return nextWeekDay * DAY_MS - ms;
}

/**
 * Date UTC décomposée.
 * @param {number} [ms]
 * @returns {{ year: number, month: number, day: number }} month de 1 à 12
 */
export function utcDateParts(ms = now()) {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Décompose une durée pour l'affichage relatif (« dans 5 h 12 min »).
 * @param {number} ms
 * @returns {{ d: number, h: number, m: number, s: number }}
 */
export function durationParts(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}
