// Fort Boutique — surprises de la journée (G7.7) : VIP (M4) ; Rush et Commande spéciale (M11).
import { CUSTOMER_TYPES } from '../../data/balance.js';
import { spawnCustomer } from './customers.js';

/** Programme les VIP du jour : 1 par jour au Q1 dès le jour 2, 2 par jour ensuite (G7.2). */
export function initDayEvents(g) {
  const d = g.day;
  const vip = CUSTOMER_TYPES.vip;
  const n = g.shop.day < vip.fromDay && g.shopId === 'q1' ? 0 : g.shopId === 'q1' ? vip.perDayQ1 : vip.perDay;
  d.vipTimes = [];
  for (let i = 0; i < n; i++) d.vipTimes.push(d.duration * g.rng.range(0.2, 0.8));
  d.vipTimes.sort((a, b) => a - b);
  // Reprise après rechargement : les VIP déjà venus ne reviennent pas (G7.2, un par jour au Q1).
  d.vipTimes.splice(0, Math.min(d.vipTimes.length, g.shop.phase.vipsSpawned || 0));
}

/** @param {any} g @param {number} dt */
export function stepDayEvents(g, dt) {
  const d = g.day;
  void dt;
  const elapsed = d.duration - d.timeLeft;
  while (d.vipTimes.length && elapsed >= d.vipTimes[0]) {
    d.vipTimes.shift();
    g.shop.phase.vipsSpawned = (g.shop.phase.vipsSpawned || 0) + 1;
    spawnCustomer(g, 'vip');
  }
}
