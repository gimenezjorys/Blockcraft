// Fort Boutique — calendrier de 7 jours (G15.1) : une réclamation par jour UTC, jours non consécutifs permis, le cycle
// recommence après J7. `calendarIndex` compte les réclamations (jour = index mod 7, tour = index div 7).
import { CALENDAR, CALENDAR_COSMETICS } from '../data/calendar.js';
import { Rng, seedFrom } from '../core/rng.js';
import { now, utcDay, msUntilNextUtcDay } from '../core/time.js';
import { isUnlocked } from './progression.js';
import { grantReward, planTargets } from './rewards.js';

/**
 * @param {any} save
 * @param {number} [t]
 */
export function calendarState(save, t = now()) {
  const c = save.daily;
  const today = utcDay(t);
  const index = ((c.calendarIndex % 7) + 7) % 7;
  const claimedToday = c.lastCalendarDay === today;
  // Horloge reculée sous la dernière réclamation : on attend d'y revenir (pas de double réclamation).
  const rollback = c.maxClaimDay > today;
  const unlocked = isUnlocked(save, 'calendar');
  return {
    unlocked,
    index,
    round: Math.floor(c.calendarIndex / 7),
    claimedToday,
    canClaim: unlocked && !claimedToday && !rollback,
    msLeft: msUntilNextUtcDay(t),
  };
}

/** J4 : 3 meubles possédés au choix (tirés à graine pour ce tour). */
export function calendarChoices(save) {
  const targets = planTargets(save);
  const rng = new Rng(seedFrom(save.seed, 'calendrier', save.daily.calendarIndex));
  return rng.shuffle(targets.slice(0, 6)).slice(0, CALENDAR[3].choice).sort();
}

/** Cosmétique du calendrier de ce tour (rotation de 8). */
export function calendarCosmetic(save) {
  const round = Math.floor(save.daily.calendarIndex / 7);
  return CALENDAR_COSMETICS[round % CALENDAR_COSMETICS.length];
}

/**
 * Réclame la récompense du jour.
 * @param {any} save
 * @param {number} [t]
 * @param {string} [choiceId] meuble choisi pour J4
 * @returns {null | { day: number, reward: any }}
 */
export function claimCalendar(save, t = now(), choiceId) {
  const st = calendarState(save, t);
  if (!st.canClaim) return null;
  const def = CALENDAR[st.index];
  const c = save.daily;
  const ctx = { seed: seedFrom(save.seed, 'calendrier', c.calendarIndex), planId: undefined, cosmetic: null };
  if (def.choice) {
    const choices = calendarChoices(save);
    ctx.planId = choices.includes(choiceId) ? choiceId : choices[0];
  }
  if (def.cosmetic) ctx.cosmetic = calendarCosmetic(save);
  const reward = grantReward(save, def, ctx);
  const today = utcDay(t);
  c.lastCalendarDay = today;
  c.maxClaimDay = Math.max(c.maxClaimDay, today);
  c.calendarIndex++;
  return { day: def.day, reward };
}
