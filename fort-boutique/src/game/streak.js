// Fort Boutique — la série (flamme de la boutique, G15.2) : +1 par jour UTC où une nuit est terminée, gels consommés
// automatiquement pour un jour manqué, rallumage pendant 48 h. Jamais de message culpabilisant (côté interface).
import { STREAK } from '../data/calendar.js';
import { now, utcDay, utcWeek } from '../core/time.js';

const HOUR_MS = 3600 * 1000;

/**
 * Jours manqués : un gel par jour (s'il y en a assez), sinon la flamme s'éteint (on garde de quoi la rallumer).
 * @param {any} save
 * @param {number} [t]
 * @returns {{ frozen: number, broken: boolean }}
 */
export function streakCheck(save, t = now()) {
  const s = save.daily.streak;
  const today = utcDay(t);
  const out = { frozen: 0, broken: false };
  if (s.count <= 0 || s.lastDay < 0 || today - s.lastDay <= 1) return out;
  const missed = today - s.lastDay - 1;
  if (s.freezes >= missed) {
    s.freezes -= missed;
    s.lastDay = today - 1;
    out.frozen = missed;
    return out;
  }
  s.brokenCount = s.count;
  s.brokenAt = t;
  s.count = 0;
  out.broken = true;
  return out;
}

/**
 * Une nuit vient d'être terminée : la série avance une fois par jour UTC.
 * @returns {{ count: number, rubies: number, freeze: boolean } | null} null si déjà comptée aujourd'hui
 */
export function recordNight(save, t = now()) {
  const s = save.daily.streak;
  const today = utcDay(t);
  if (s.lastDay === today || s.lastDay > today) return null;
  streakCheck(save, t);
  const prevBest = s.best;
  s.count = s.lastDay === today - 1 ? s.count + 1 : 1;
  s.lastDay = today;
  s.best = Math.max(s.best, s.count);
  // Paliers : rubis une seule fois (seulement quand la série dépasse le meilleur record).
  let rubies = 0;
  for (const [days, r] of STREAK.milestones) if (s.count === days && s.count > prevBest) rubies += r;
  save.player.rubies += rubies;
  let freeze = false;
  if (s.count % STREAK.freezeEvery === 0 && s.freezes < STREAK.freezesMax) {
    s.freezes++;
    freeze = true;
  }
  return { count: s.count, rubies, freeze };
}

/** Bonus de pièces de la série : +2 % par jour, au plus +20 % (flamme encore allumée). */
export function streakBonus(save, t = now()) {
  const s = save.daily.streak;
  if (s.count <= 0 || utcDay(t) - s.lastDay > 1 + s.freezes) return 0;
  return Math.min(STREAK.bonusMax, STREAK.bonusPerDay * s.count);
}

/** Couleur de la flamme : bleue à 30 jours, dorée à 100. */
export function flameColor(count) {
  if (count >= 100) return 'gold';
  if (count >= 30) return 'blue';
  return 'orange';
}

/** Rallumage possible ? (48 h après l'extinction ; la pub une fois par semaine, en M15). */
export function relightInfo(save, t = now()) {
  const s = save.daily.streak;
  const open = s.count <= s.brokenCount && s.brokenCount > 0 && s.brokenAt > 0 && t - s.brokenAt <= STREAK.relightHours * HOUR_MS;
  return { open, rubies: STREAK.relightRubies, ad: open && s.restoredWeek !== utcWeek(t), count: s.brokenCount };
}

/**
 * Rallume la flamme (20 rubis, ou une pub par semaine).
 * @returns {boolean}
 */
export function relightStreak(save, t = now(), { ad = false } = {}) {
  const info = relightInfo(save, t);
  if (!info.open) return false;
  const s = save.daily.streak;
  if (ad) {
    if (!info.ad) return false;
    s.restoredWeek = utcWeek(t);
  } else {
    if (save.player.rubies < info.rubies) return false;
    save.player.rubies -= info.rubies;
  }
  const today = utcDay(t);
  // Une nuit déjà jouée depuis l'extinction compte en plus.
  if (s.lastDay === today && s.count > 0) s.count = s.brokenCount + s.count;
  else {
    s.count = s.brokenCount;
    s.lastDay = today - 1;
  }
  s.best = Math.max(s.best, s.count);
  s.brokenCount = 0;
  s.brokenAt = -1;
  return true;
}
