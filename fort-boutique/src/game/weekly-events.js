// Fort Boutique — événements de la semaine (G13.5, rotation `utcWeek mod 6`) et saisons (G13.6, date UTC).
// Effets lus par la nuit et la journée ; défi de la semaine suivi ici ; récompense déjà obtenue → 20 rubis. Logique pure.
import { WEEKLY_EVENTS, EVENT_DUPLICATE_RUBIES, SEASONS, SEASON_XP } from '../data/events.js';
import { PRODUCTS } from '../data/products.js';
import { districtDef } from '../data/districts.js';
import { now, utcWeek, utcDateParts, msUntilNextUtcWeek } from '../core/time.js';

/** Interrupteur : la simulation d'équilibrage (D2) mesure le jeu sans événement ni saison. */
export const EVENTS_SWITCH = { enabled: true };

/** Semaine sans événement (simulation). */
const NONE = { id: 'none', goal: { kind: 'none', n: Infinity }, reward: null };

/** Événement de la semaine UTC. */
export function currentEvent(t = now()) {
  if (!EVENTS_SWITCH.enabled) return NONE;
  const n = WEEKLY_EVENTS.length;
  return WEEKLY_EVENTS[((utcWeek(t) % n) + n) % n];
}

/** Saison en cours (ou null) selon la date UTC. */
export function currentSeason(t = now()) {
  if (!EVENTS_SWITCH.enabled) return null;
  const { month, day } = utcDateParts(t);
  const v = month * 100 + day;
  for (const s of SEASONS) {
    const a = s.from[0] * 100 + s.from[1];
    const b = s.to[0] * 100 + s.to[1];
    if (a <= b ? v >= a && v <= b : v >= a || v <= b) return s;
  }
  return null;
}

/** Multiplicateur d'XP du moment : événement (Fête de Mamie × 1,25) × saison (+10 %). */
export function xpBoost(t = now()) {
  const ev = currentEvent(t);
  return (ev.xpMult || 1) * (currentSeason(t) ? 1 + SEASON_XP : 1);
}

/** Effets de la nuit (fusionnés avec ceux du mode de jeu). */
export function eventNightMods(t = now()) {
  const ev = currentEvent(t);
  return {
    weightMult: ev.weightMult || null,
    speedMult: ev.speedMult || 1,
    lootMult: ev.lootMult || 1,
    lootType: ev.lootType || null,
    goldenChance: ev.goldenChance,
    xpMult: xpBoost(t),
    lantern: !!ev.lantern,
  };
}

/** Produit le moins cher du quartier (Marché aux petits prix). */
export function cheapestProduct(districtId) {
  const list = districtDef(districtId).products.slice();
  list.sort((a, b) => PRODUCTS[a].price - PRODUCTS[b].price || a.localeCompare(b));
  return list[0];
}

/** Effets de la journée : prix du produit le moins cher × 1,5 (Marché), XP. */
export function eventDayMods(districtId, t = now()) {
  const ev = currentEvent(t);
  return { cheap: ev.cheapMult ? cheapestProduct(districtId) : null, cheapMult: ev.cheapMult || 1, xpMult: xpBoost(t) };
}

/** Progression du défi de la semaine (remise à zéro à chaque semaine UTC). */
function progress(save, t) {
  const p = save.daily.eventProgress;
  const week = utcWeek(t);
  if (p.week !== week && !(p.week > week)) {
    p.week = week;
    p.value = 0;
    p.claimed = [];
  }
  return p;
}

/**
 * Fait avancer le défi de la semaine.
 * @param {any} save
 * @param {string} kind kill | sellCheap | nights2 | order
 * @param {number} amount
 * @param {string} [type] type de Grignotin pour « kill »
 */
export function trackEvent(save, kind, amount, type, t = now()) {
  if (!(amount > 0) || !save.daily) return;
  const ev = currentEvent(t);
  const g = ev.goal;
  if (g.kind !== kind || (g.type && g.type !== type)) return;
  const p = progress(save, t);
  if (p.week !== utcWeek(t)) return;
  p.value = Math.min(g.n, p.value + amount);
}

/** État du défi de la semaine pour la bannière du Matin. */
export function eventState(save, t = now()) {
  const ev = currentEvent(t);
  const p = progress(save, t);
  return { event: ev, value: p.value, goal: ev.goal.n, done: p.claimed.includes(ev.id), msLeft: msUntilNextUtcWeek(t), season: currentSeason(t) };
}

/**
 * Défi de la semaine réussi : le cosmétique (ou 20 rubis s'il est déjà à toi), une seule fois.
 * @returns {null | { cosmetic: string | null, rubies: number }}
 */
export function checkEvent(save, t = now()) {
  const ev = currentEvent(t);
  const p = progress(save, t);
  if (!ev.reward || p.value < ev.goal.n || p.claimed.includes(ev.id)) return null;
  p.claimed.push(ev.id);
  if (save.cosmetics.owned.includes(ev.reward)) {
    save.player.rubies += EVENT_DUPLICATE_RUBIES;
    return { cosmetic: null, rubies: EVENT_DUPLICATE_RUBIES };
  }
  save.cosmetics.owned.push(ev.reward);
  return { cosmetic: ev.reward, rubies: 0 };
}
