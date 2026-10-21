// Fort Boutique — Commande spéciale (G7.7) : dès le jour 3, une par jour au plus. Un client avec un parchemin attend
// près de la caisse et demande 4 à 6 exemplaires d'un produit exposé, à livrer en 50 s. Réussite : +30 % de leur valeur
// et un coffre en bois à l'aube. Échec : il repart en souriant, sans pénalité.
import { SPECIAL_ORDER as SO } from '../../data/tutorial.js';
import { XP_GAINS } from '../../data/xp.js';
import { exposedProducts } from './shelves.js';
import { spawnCustomer, goToCell, leave } from './customers.js';
import { itemPrice, syncDayPhase } from './register.js';
import { addXp, xpFactor } from '../progression.js';
import { neighbors } from '../pathfinding.js';

/** Programme la commande du jour (aucune si déjà venue aujourd'hui, même après un rechargement). */
export function initSpecialOrder(g) {
  const d = g.day;
  d.order = null;
  d.orderAt = -1;
  if (g.shop.day < SO.fromDay || (g.shop.phase.ordersSpawned || 0) > 0) return;
  d.orderAt = d.duration * g.rng.range(SO.window[0], SO.window[1]);
}

/** Case d'attente : voisine de la caisse, hors de la file ; sinon la plus proche libre. */
export function orderSpot(g) {
  const d = g.day;
  const reg = g.register;
  const { w, h, occ } = g.grid;
  if (!reg) return -1;
  const taken = new Set([d.queueCell]);
  for (const s of d.queueSlots) taken.add(Math.floor(s.y) * w + Math.floor(s.x));
  const near = neighbors(w, h, reg.y * w + reg.x).filter((j) => occ[j] < 0 && g.fields.fromDoor[j] >= 0);
  const free = near.find((j) => !taken.has(j));
  if (free !== undefined) return free;
  let best = -1;
  let bd = 1e9;
  for (let j = 0; j < w * h; j++) {
    if (occ[j] >= 0 || taken.has(j) || g.fields.fromDoor[j] < 0) continue;
    const dd = Math.abs((j % w) - reg.x) + Math.abs(((j / w) | 0) - reg.y);
    if (dd < bd) {
      bd = dd;
      best = j;
    }
  }
  return best >= 0 ? best : d.queueCell;
}

/** Produits demandables : exposés ET fabriqués dans la boutique (la commande doit être faisable). */
function orderable(g) {
  const made = new Set(g.furn.filter((f) => f.def.day.kind === 'producer').map((f) => f.def.day.product));
  return exposedProducts(g).filter((p) => made.has(p));
}

function start(g) {
  const d = g.day;
  const products = orderable(g);
  const spot = orderSpot(g);
  if (!products.length || spot < 0) return;
  const c = spawnCustomer(g, 'order');
  if (!c) return;
  const product = products[g.rng.int(products.length)];
  const need = g.rng.intRange(SO.count[0], SO.count[1]);
  c.wants.length = 0;
  c.state = 'order';
  goToCell(g, c, spot);
  d.order = { c, product, need, got: 0, timeLeft: SO.deliverS, waiting: false, giveT: 0, state: 'walk' };
  g.shop.phase.ordersSpawned = (g.shop.phase.ordersSpawned || 0) + 1;
  g.events.push('order_in', c.x, c.y, need, 0, product);
}

function finish(g, ok) {
  const d = g.day;
  const o = d.order;
  o.state = ok ? 'done' : 'failed';
  const c = o.c;
  if (ok) {
    const amount = Math.round(o.need * itemPrice(g, o.product) * (1 + SO.bonus));
    d.pile += amount;
    d.takings += amount;
    d.sales += amount;
    d.served++;
    d.sold += o.need;
    d.soldBy[o.product] = (d.soldBy[o.product] || 0) + o.need;
    syncDayPhase(g);
    const st = g.save.stats;
    st.served++;
    st.sold += o.need;
    st.ordersDone = (st.ordersDone || 0) + 1;
    addXp(g, (XP_GAINS.itemSold * o.need + XP_GAINS.customerServed) * xpFactor(g.shopId));
    // Le coffre en bois est gardé dans la journée sauvegardée : il attend l'aube, même après un rechargement.
    g.shop.phase.orderChests = (g.shop.phase.orderChests || 0) + 1;
    g.events.push('order_done', c.x, c.y, amount, 0, o.product);
    g.events.push('kaching', g.register.cx, g.register.cy, amount, 1);
  } else {
    g.events.push('order_fail', c.x, c.y, o.got, o.need, o.product);
  }
  // Dans les deux cas, il repart content (G7.7 : aucune pénalité).
  leave(g, c, false);
  c.mood = 1;
  d.order = null;
}

/**
 * Produit que le client de la Commande prend en ce moment au marchand (à portée, il en manque), sinon null :
 * il passe avant les étagères voisines (P2, Léa : la dépose sur l'étagère d'à côté vidait la pile).
 * @param {any} g
 */
export function orderReceiving(g) {
  const o = g.day && g.day.order;
  if (!o || !o.waiting || o.got >= o.need) return null;
  const p = g.player;
  return Math.hypot(p.x - o.c.x, p.y - o.c.y) <= SO.giveRange && p.stack.includes(o.product) ? o.product : null;
}

/** @param {any} g @param {number} dt */
export function stepSpecialOrder(g, dt) {
  const d = g.day;
  if (!d.order) {
    if (d.orderAt >= 0 && !d.closing && d.duration - d.timeLeft >= d.orderAt) {
      d.orderAt = -1;
      start(g);
    }
    return;
  }
  const o = d.order;
  const c = o.c;
  if (d.closing) {
    finish(g, false);
    return;
  }
  if (!o.waiting && !c.moving) o.waiting = true;
  if (!o.waiting) return;
  o.timeLeft -= dt;
  // Le marchand donne les articles en passant près de lui (comme sur une étagère).
  const p = g.player;
  if (Math.hypot(p.x - c.x, p.y - c.y) <= SO.giveRange && p.stack.includes(o.product)) {
    o.giveT += dt;
    while (o.giveT >= 1 / SO.giveRate && o.got < o.need) {
      const i = p.stack.lastIndexOf(o.product);
      if (i < 0) break;
      o.giveT -= 1 / SO.giveRate;
      p.stack.splice(i, 1);
      g.shop.phase.carried = p.stack.slice();
      o.got++;
      g.events.push('order_give', c.x, c.y, o.got, o.need, o.product);
    }
  } else {
    o.giveT = Math.min(o.giveT, 1 / SO.giveRate);
  }
  if (o.got >= o.need) finish(g, true);
  else if (o.timeLeft <= 0) finish(g, false);
}
