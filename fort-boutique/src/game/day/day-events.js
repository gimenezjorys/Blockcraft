// Fort Boutique — surprises de la journée (G7.7) : VIP (M4), Rush et Commande spéciale (M11).
import { CUSTOMER_TYPES } from '../../data/balance.js';
import { RUSH } from '../../data/tutorial.js';
import { spawnCustomer } from './customers.js';
import { initSpecialOrder, stepSpecialOrder } from './special-order.js';
import { trackQuest } from '../quest-track.js';

/** Programme les surprises du jour : VIP (1 par jour au Q1 dès le jour 2, 2 ensuite, G7.2), Rush, Commande. */
export function initDayEvents(g) {
  const d = g.day;
  const ph = g.shop.phase;
  const vip = CUSTOMER_TYPES.vip;
  const n = g.shop.day < vip.fromDay && g.shopId === 'q1' ? 0 : g.shopId === 'q1' ? vip.perDayQ1 : vip.perDay;
  d.vipTimes = [];
  for (let i = 0; i < n; i++) d.vipTimes.push(d.duration * g.rng.range(0.2, 0.8));
  d.vipTimes.sort((a, b) => a - b);
  // Reprise après rechargement : les VIP déjà venus ne reviennent pas (G7.2, un par jour au Q1).
  d.vipTimes.splice(0, Math.min(d.vipTimes.length, ph.vipsSpawned || 0));
  // Rush : une fois par jour dès le jour 2, entre 35 % et 70 % de la journée (pas deux fois après un rechargement).
  d.rushAt = g.shop.day >= RUSH.fromDay && !ph.rushDone ? d.duration * g.rng.range(RUSH.window[0], RUSH.window[1]) : -1;
  d.rush = null;
  d.tipMult = 1;
  // Rechargement en plein Rush : il reprend (clients restants, pourboires × 1,5 pour le temps qui restait) (P2, Sam).
  const r = ph.rush;
  if (r && typeof r === 'object' && Number(r.tipT) > 0 && Number(r.tipT) <= RUSH.tipS) {
    const left = Math.max(0, Math.min(RUSH.customers, Math.round(Number(r.left) || 0)));
    d.rush = { left, spawnT: 0, tipT: Number(r.tipT), bad: !!r.bad };
    d.tipMult = RUSH.tipMult;
  } else ph.rush = null;
  initSpecialOrder(g);
}

/** @param {any} g @param {number} dt */
export function stepDayEvents(g, dt) {
  const d = g.day;
  const elapsed = d.duration - d.timeLeft;
  while (d.vipTimes.length && elapsed >= d.vipTimes[0]) {
    d.vipTimes.shift();
    g.shop.phase.vipsSpawned = (g.shop.phase.vipsSpawned || 0) + 1;
    spawnCustomer(g, 'vip');
  }
  stepRush(g, dt, elapsed);
  stepSpecialOrder(g, dt);
}

/** Rush : bannière « RUSH! », 5 clients en 4 s, pourboires × 1,5 pendant 20 s (G7.7). */
function stepRush(g, dt, elapsed) {
  const d = g.day;
  if (!d.rush && d.rushAt >= 0 && elapsed >= d.rushAt) {
    d.rushAt = -1;
    g.shop.phase.rushDone = true;
    d.rush = { left: RUSH.customers, spawnT: 0, tipT: RUSH.tipS, bad: false };
    g.shop.phase.rush = { left: RUSH.customers, tipT: RUSH.tipS, bad: false };
    g.events.push('rush', 0, 0, RUSH.customers, RUSH.tipS);
  }
  const r = d.rush;
  if (!r) return;
  // Les 5 clients entrent à intervalles réguliers sur 4 s (au-delà du plafond habituel : c'est le coup de feu).
  r.spawnT -= dt;
  while (r.left > 0 && r.spawnT <= 0) {
    spawnCustomer(g);
    r.left--;
    r.spawnT += RUSH.spreadS / Math.max(1, RUSH.customers - 1);
  }
  r.tipT -= dt;
  d.tipMult = r.tipT > 0 ? RUSH.tipMult : 1;
  const saved = g.shop.phase.rush;
  if (saved) {
    saved.left = r.left;
    saved.tipT = Math.max(0, r.tipT);
  }
  if (r.tipT <= 0 && r.left <= 0) {
    // Quête « finir un Rush sans client fâché » (G14.1).
    if (!r.bad) trackQuest(g.save, 'rush');
    d.rush = null;
    g.shop.phase.rush = null;
  }
}
