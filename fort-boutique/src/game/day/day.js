// Fort Boutique — orchestration de la journée (G5.1, G7) : ouverture, ventes, barre de soleil, fermeture.
import { DAY, CUSTOMERS } from '../../data/balance.js';
import { initProducers, stepProducers } from './producers.js';
import { initShelves } from './shelves.js';
import { stepCarry } from './carry.js';
import { arrivalInterval, maxCustomers, spawnCustomer, stepCustomers, dismissAll } from './customers.js';
import { initRegister, stepRegister, collectPile } from './register.js';
import { stepPads } from './pads.js';
import { initDayEvents, stepDayEvents } from './day-events.js';
import { placePlayerAtStart } from '../state.js';
import { initStaff, stepStaff, sleepStaff } from '../staff.js';
import { initCat } from '../cat.js';
import { eventDayMods } from '../weekly-events.js';
import { franchiseSalesBonus } from '../franchise.js';
import { trackQuest } from '../quest-track.js';
import { streakCheck, streakBonus } from '../streak.js';

/**
 * Durée de la journée : 90 s (jour 1), 120 s (jour 2), puis 150 s ; +10 s avec l'Horloge de Mamie (G5.1).
 * Les journées courtes ne concernent que la toute première boutique (DECISIONS.md, M4).
 * @param {any} g
 */
export function dayDuration(g) {
  const idx = g.shopId === 'q1' ? Math.min(DAY.durations.length - 1, g.shop.day - 1) : DAY.durations.length - 1;
  let s = DAY.durations[Math.max(0, idx)];
  if (g.furn.some((f) => f.def.day.kind === 'clock')) s += DAY.clockBonusS;
  return s;
}

function freshDay(g, duration) {
  return {
    duration,
    timeLeft: duration,
    takings: 0,
    sales: 0,
    tips: 0,
    served: 0,
    sold: 0,
    soldBy: {},
    lost: 0,
    vipServed: 0,
    collected: 0,
    customers: [],
    free: [],
    queue: [],
    queueSlots: [],
    queueCell: -1,
    pile: 0,
    cashT: 0,
    cashTime: 0.6,
    spawnT: 2.5,
    nextId: 0,
    pad: null,
    closing: false,
    closingT: 0,
    scratch: new Int16Array(g.grid.n),
    firstCustomerPending: g.shopId === 'q1' && g.shop.day === 1 && g.save.stats.cycles === 0,
    vipTimes: [],
  };
}

/**
 * Ouvre la boutique (bouton OUVRIR) ou reprend une journée sauvegardée (G5.2).
 * @param {any} g
 * @param {{ resume?: boolean }} [opts]
 */
export function startDay(g, opts = {}) {
  const ph = g.shop.phase;
  const duration = dayDuration(g);
  g.day = freshDay(g, duration);
  if (opts.resume && ph.name === 'day' && ph.dayTimeLeftS > 0) {
    g.day.timeLeft = Math.min(duration, ph.dayTimeLeftS);
    g.day.takings = ph.dayTakings || 0;
    g.day.sales = ph.daySales || 0;
    g.day.tips = ph.dayTips || 0;
    g.day.pile = ph.dayPile || 0;
    g.day.firstCustomerPending = false;
  } else {
    ph.name = 'day';
    ph.dayTimeLeftS = duration;
    ph.dayTakings = 0;
    ph.daySales = 0;
    ph.dayTips = 0;
    ph.dayPile = 0;
    ph.vipsSpawned = 0;
    ph.rushDone = false;
    ph.ordersSpawned = 0;
    ph.order = null;
    ph.rush = null;
    ph.dawnClaimed = false;
  }
  // Flamme de la boutique (G15.2) : jours manqués d'abord (gels), puis +2 % de pièces par jour de série.
  streakCheck(g.save);
  // + franchise : +10 % de ventes par étoile (G13.4).
  g.day.salesMult = 1 + streakBonus(g.save) + franchiseSalesBonus(g.shop);
  // Événement de la semaine et saison (G13.5, G13.6).
  const em = eventDayMods(g.shopId);
  g.day.cheap = em.cheap;
  g.day.cheapMult = em.cheapMult;
  g.day.xpMult = (g.day.xpMult || 1) * em.xpMult;
  g.player.stack = Array.isArray(ph.carried) ? ph.carried.slice(0, 14) : [];
  initProducers(g);
  initShelves(g);
  initRegister(g);
  initDayEvents(g);
  initStaff(g);
  placePlayerAtStart(g);
  initCat(g);
  g.phase = { name: 'day', t: 0 };
  g.events.push('day_start', 0, 0, duration);
}

/** @param {any} g @param {number} dt */
export function stepDay(g, dt) {
  const d = g.day;
  stepProducers(g, dt);
  stepCarry(g, dt);
  stepStaff(g, dt);
  if (!d.closing) {
    d.timeLeft -= dt;
    g.shop.phase.dayTimeLeftS = Math.max(0, d.timeLeft);
    spawnLogic(g, dt);
    stepDayEvents(g, dt);
    if (d.timeLeft <= 0) beginClosing(g);
  } else {
    d.closingT += dt;
  }
  stepCustomers(g, dt);
  stepRegister(g, dt);
  stepPads(g, dt);
}

function spawnLogic(g, dt) {
  const d = g.day;
  if (d.firstCustomerPending) {
    // Tout premier jour : le premier client entre dès qu'une étagère a un article (au plus tard après 10 s).
    const stocked = g.furn.some((f) => f.def.day.kind === 'shelf' && f.count > 0);
    const elapsed = d.duration - d.timeLeft;
    if (stocked || elapsed >= CUSTOMERS.firstCustomerMaxWaitS) {
      if (spawnCustomer(g)) {
        d.firstCustomerPending = false;
        d.spawnT = arrivalInterval(g);
      }
    }
    return;
  }
  d.spawnT -= dt;
  if (d.spawnT > 0) return;
  if (d.customers.length >= maxCustomers(g)) {
    d.spawnT = 0.5;
    return;
  }
  spawnCustomer(g);
  d.spawnT = arrivalInterval(g) * g.rng.range(0.85, 1.15);
}

/** Le soleil touche l'horizon : « Fermé », plus aucun client n'entre, 6 s de grâce (G7.8). */
export function beginClosing(g) {
  const d = g.day;
  d.closing = true;
  d.closingT = 0;
  d.timeLeft = 0;
  d.rush = null;
  d.tipMult = 1;
  g.shop.phase.rush = null;
  g.phase = { name: 'closing', t: 0 };
  g.events.push('close_shop');
}

/** Fin de la fermeture : les clients restants partent, les tas oubliés sont ramassés (aucune perte, G7.4). */
export function endDay(g) {
  const d = g.day;
  dismissAll(g);
  collectPile(g, true);
  // Le personnel range ce qu'il porte et va dormir (G11.3).
  sleepStaff(g);
  const shop = g.shop;
  shop.lastDayTakings = d.takings;
  shop.lastDayDurationS = d.duration;
  shop.phase.dayTimeLeftS = 0;
  shop.phase.dayTakings = d.takings;
  trackQuest(g.save, 'takings', d.takings);
  return {
    takings: d.takings,
    sales: d.sales,
    tips: d.tips,
    served: d.served,
    sold: d.sold,
    soldBy: d.soldBy,
    lost: d.lost,
    vipServed: d.vipServed,
    duration: d.duration,
  };
}

export const CLOSING_S = DAY.closingS;
