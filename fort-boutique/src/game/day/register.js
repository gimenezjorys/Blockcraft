// Fort Boutique — caisse (G7.3, G7.4) : file d'attente, encaissement en présence du marchand, tas de pièces.
import { CUSTOMERS, CUSTOMER_TYPES, PLAYER, RECIPES } from '../../data/balance.js';
import { PRODUCTS } from '../../data/products.js';
import { XP_GAINS, highLevelSalesBonus } from '../../data/xp.js';
import { pathFrom, neighbors } from '../pathfinding.js';
import { distToFurniture } from '../state.js';
import { dayStats } from '../stats.js';
import { addXp, xpFactor } from '../progression.js';
import { goToCell, leave } from './customers.js';
import { trackQuest } from '../quest-track.js';

/**
 * Prépare la file : case d'attente (voisine de la caisse la plus proche de la porte) et places en ligne.
 * @param {any} g
 */
export function initRegister(g) {
  const d = g.day;
  const reg = g.register;
  const { w, h } = g.grid;
  d.queueCell = -1;
  d.queueSlots = [];
  if (!reg) return;
  let best = -1;
  let bestD = 1e9;
  for (const j of neighbors(w, h, reg.y * w + reg.x)) {
    const dd = g.fields.fromDoor[j];
    if (g.grid.occ[j] < 0 && dd >= 0 && dd < bestD) {
      bestD = dd;
      best = j;
    }
  }
  d.queueCell = best;
  if (best < 0) return;
  // Places espacées de 0,6 case le long du chemin vers la porte.
  const cells = pathFrom(g.fields.toDoor, w, h, best);
  const pts = cells.map((i) => ({ x: (i % w) + 0.5, y: ((i / w) | 0) + 0.5 }));
  if (pts.length === 1) pts.push({ x: pts[0].x, y: Math.min(h - 0.5, pts[0].y + 1) });
  let seg = 0;
  let along = 0;
  const slots = [{ x: pts[0].x, y: pts[0].y }];
  while (slots.length < 12 && seg < pts.length - 1) {
    const a = pts[seg];
    const b = pts[seg + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    along += 0.6;
    while (along > len && seg < pts.length - 1) {
      along -= len;
      seg++;
      if (seg >= pts.length - 1) break;
    }
    if (seg >= pts.length - 1) break;
    const p0 = pts[seg];
    const p1 = pts[seg + 1];
    const l2 = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    slots.push({ x: p0.x + ((p1.x - p0.x) * along) / l2, y: p0.y + ((p1.y - p0.y) * along) / l2 });
  }
  d.queueSlots = slots;
  d.cashTime = dayStats(reg.def, reg.level).cashTime;
}

/** @param {any} g @param {any} c */
export function joinQueue(g, c) {
  const d = g.day;
  if (!d.queue.includes(c)) d.queue.push(c);
  if (d.queueCell >= 0) goToCell(g, c, d.queueCell);
}

/** @param {any} g @param {any} c */
export function leaveQueue(g, c) {
  const i = g.day.queue.indexOf(c);
  if (i >= 0) g.day.queue.splice(i, 1);
  c.paying = false;
}

/** Prix payé d'un article (G7.4) : prix de base × (1 + 0,15 × (niveau de recette − 1)). */
export function itemPrice(g, product) {
  const lvl = Math.max(1, Math.min(RECIPES.maxLevel, g.shop.recipes[product] || 1));
  return PRODUCTS[product].price * (1 + RECIPES.bonusPerLevel * (lvl - 1));
}

/**
 * Le caissier ou le marchand est-il assez près de la caisse ?
 * @param {any} g
 */
export function cashierPresent(g) {
  const reg = g.register;
  if (!reg) return false;
  if (distToFurniture(reg, g.player.x, g.player.y) <= PLAYER.cashRange) return true;
  return !!(g.day.staffCashier && g.day.staffCashier.present);
}

/** Encaisse un client (G7.4). */
export function pay(g, c) {
  const d = g.day;
  const t = CUSTOMER_TYPES[c.type];
  let amount = 0;
  for (const p of c.got) amount += itemPrice(g, p);
  amount *= t.payMult * (1 + highLevelSalesBonus(g.save.player.level)) * (d.salesMult || 1);
  amount = Math.round(amount);
  const fast = g.t - c.queueAt < CUSTOMERS.tipWindowS;
  let tip = 0;
  if (fast) {
    const rate = (c.type === 'hurried' ? CUSTOMERS.tipHurried : CUSTOMERS.tip) * (d.tipMult || 1);
    tip = Math.max(1, Math.round(amount * rate));
  }
  d.pile += amount + tip;
  d.takings += amount + tip;
  d.sales += amount;
  d.tips += tip;
  d.served++;
  d.sold += c.got.length;
  if (c.type === 'vip') d.vipServed++;
  syncDayPhase(g);
  const st = g.save.stats;
  st.served++;
  st.sold += c.got.length;
  if (c.type === 'vip') st.vipServed++;
  for (const p of c.got) {
    d.soldBy[p] = (d.soldBy[p] || 0) + 1;
    trackQuest(g.save, 'sell', 1, p);
  }
  trackQuest(g.save, 'serve');
  if (c.type === 'vip') trackQuest(g.save, 'vip');
  if (!g.shop.phase.firstSaleDone) g.shop.phase.firstSaleDone = true;
  const xq = xpFactor(g.shopId);
  addXp(g, (XP_GAINS.itemSold * c.got.length + XP_GAINS.customerServed) * xq * (d.xpMult || 1));
  g.events.push('kaching', g.register.cx, g.register.cy, amount + tip, fast ? 1 : 0);
  if (fast) g.events.push('happy', c.x, c.y, c.id);
  c.mood = fast ? 1 : 0;
  c.paidAmount = amount + tip;
}

/** @param {any} g @param {number} dt */
export function stepRegister(g, dt) {
  const d = g.day;
  const front = d.queue[0];
  if (front && front.state === 'queue' && cashierPresent(g)) {
    front.paying = true;
    d.cashT += dt;
    const need = d.staffCashier && d.staffCashier.present && distToFurniture(g.register, g.player.x, g.player.y) > PLAYER.cashRange
      ? d.staffCashier.cashTime
      : d.cashTime;
    if (d.cashT >= need) {
      d.cashT = 0;
      pay(g, front);
      leaveQueue(g, front);
      leave(g, front, false);
    }
  } else if (front) {
    front.paying = false;
  }
  collectPile(g, false);
}

/**
 * Ramasse le tas de pièces si le marchand passe à ≤ 0,8 case (ou de force à la fermeture : aucune perte).
 * @param {any} g
 * @param {boolean} force
 */
export function collectPile(g, force) {
  const d = g.day;
  if (d.pile <= 0 || !g.register) return 0;
  if (!force && distToFurniture(g.register, g.player.x, g.player.y) > PLAYER.coinPickupRange) return 0;
  const n = d.pile;
  d.pile = 0;
  g.save.player.coins += n;
  syncDayPhase(g);
  d.collected += n;
  g.events.push('coins', g.register.cx, g.register.cy, n, force ? 1 : 0);
  return n;
}

/**
 * Recopie dans la sauvegarde ce qui doit survivre à un rechargement en pleine journée (G5.2) :
 * recette, ventes, pourboires et tas de pièces encore sur la caisse (A0.2 : aucune pièce perdue).
 * @param {any} g
 */
export function syncDayPhase(g) {
  const d = g.day;
  const ph = g.shop.phase;
  ph.dayTakings = d.takings;
  ph.daySales = d.sales;
  ph.dayTips = d.tips;
  ph.dayPile = d.pile;
}
