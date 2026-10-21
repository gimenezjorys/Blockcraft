// Fort Boutique — clients (G7.1 à G7.3) : arrivée, chemin, choix, attente, patience, file, sortie.
import { CUSTOMERS, CUSTOMER_TYPES, DAY_AURAS } from '../../data/balance.js';
import { PRODUCTS } from '../../data/products.js';
import { attractOf } from '../../data/furniture.js';
import { bfs, nextStep } from '../pathfinding.js';
import { exposedProducts, takeFromShelf } from './shelves.js';
import { joinQueue, leaveQueue } from './register.js';

/**
 * Intervalle entre deux clients (G7.1).
 * @param {any} g
 */
export function arrivalInterval(g) {
  const base = CUSTOMERS.baseInterval[g.shopId] || 4.2;
  const k = g.shop.night;
  const s = g.shop.week;
  const raw = Math.max(CUSTOMERS.minInterval, base * Math.pow(CUSTOMERS.dayFactor, k - 1) * Math.pow(CUSTOMERS.weekFactor, s - 1));
  return raw / (1 + CUSTOMERS.attractK * attractiveness(g));
}

/** Somme des bonus de décor (G7.1). */
export function attractiveness(g) {
  let a = 0;
  for (const f of g.furn) a += attractOf(f.def);
  return a;
}

/** Clients présents au maximum : 3 + floor(cases / 8), plafond 30 (B5). */
export function maxCustomers(g) {
  return Math.min(30, CUSTOMERS.maxBase + Math.floor(g.grid.n / CUSTOMERS.cellsPerExtra));
}

function newCustomer(g, type) {
  const d = g.day;
  const c = d.free.pop() || {};
  const { w, h } = g.grid;
  c.id = ++d.nextId;
  c.type = type;
  c.look = g.rng.int(108);
  c.x = g.grid.door.x + 0.5;
  c.y = h + 0.4;
  c.path = c.path || [];
  c.path.length = 0;
  c.pathI = 0;
  c.state = 'enter';
  c.wants = c.wants || [];
  c.wants.length = 0;
  c.got = c.got || [];
  c.got.length = 0;
  c.shelfIdx = -1;
  c.patience = 0;
  c.patienceMax = CUSTOMER_TYPES[type].patience;
  c.t = 0;
  c.queueAt = 0;
  c.moving = true;
  c.walkT = 0;
  c.mood = 0;
  c.fx = 0;
  c.order = null;
  void w;
  return c;
}

/** Choisit le panier (G7.2, G7.3). */
function chooseBasket(g, c) {
  const exposed = exposedProducts(g);
  const t = CUSTOMER_TYPES[c.type];
  if (!exposed.length) return;
  if (t.priciest) {
    let best = exposed[0];
    for (const p of exposed) if (PRODUCTS[p].price > PRODUCTS[best].price) best = p;
    for (let i = 0; i < t.basket; i++) c.wants.push(best);
    return;
  }
  let n = t.basket;
  if (!n) {
    const r = g.rng.next();
    let acc = 0;
    n = 1;
    for (const [size, p] of CUSTOMERS.basket) {
      acc += p;
      if (r < acc) {
        n = size;
        break;
      }
    }
  }
  for (let i = 0; i < n; i++) c.wants.push(g.rng.pick(exposed));
}

/**
 * Fait entrer un client.
 * @param {any} g
 * @param {string} [forcedType]
 */
export function spawnCustomer(g, forcedType) {
  const d = g.day;
  let type = forcedType || 'villager';
  if (!forcedType) {
    const r = g.rng.next();
    const day = g.shop.day;
    const hurried = CUSTOMER_TYPES.hurried;
    const greedy = CUSTOMER_TYPES.greedy;
    if (day >= hurried.fromDay && r < hurried.share) type = 'hurried';
    else if (day >= greedy.fromDay && r < hurried.share + greedy.share) type = 'greedy';
  }
  const c = newCustomer(g, type);
  chooseBasket(g, c);
  if (!c.wants.length) {
    d.free.push(c);
    return null;
  }
  d.customers.push(c);
  g.events.push(type === 'vip' ? 'vip' : 'door_bell', c.x, c.y, c.id);
  goToCell(g, c, g.grid.door.y * g.grid.w + g.grid.door.x);
  return c;
}

/** Calcule le chemin vers une case (BFS depuis la cible). */
export function goToCell(g, c, target) {
  const { w, h, occ } = g.grid;
  const passable = (i) => occ[i] < 0;
  const field = bfs(w, h, [target], passable, g.day.scratch);
  c.path.length = 0;
  c.pathI = 0;
  let cx = Math.floor(c.x);
  let cy = Math.floor(c.y);
  if (cy >= h) cy = h - 1;
  cx = Math.max(0, Math.min(w - 1, cx));
  let i = cy * w + cx;
  if (field[i] < 0) {
    // Case de départ bloquée (meuble apparu) : on part de la case libre la plus proche.
    let best = target;
    let bestD = 1e9;
    for (let j = 0; j < w * h; j++) {
      if (field[j] < 0) continue;
      const dd = Math.abs((j % w) + 0.5 - c.x) + Math.abs(((j / w) | 0) + 0.5 - c.y);
      if (dd < bestD) {
        bestD = dd;
        best = j;
      }
    }
    i = best;
  }
  c.path.push(i);
  let guard = w * h;
  while (field[i] > 0 && guard-- > 0) {
    i = nextStep(field, w, h, i);
    if (i < 0) break;
    c.path.push(i);
  }
  c.target = target;
  c.moving = true;
}

/** Cherche l'étagère d'un produit : d'abord une étagère garnie, puis la plus proche. */
function pickShelf(g, c, product) {
  let best = null;
  let bestScore = 1e9;
  for (const f of g.furn) {
    if (f.def.day.kind !== 'shelf' || f.product !== product || f.access < 0) continue;
    const ax = f.access % g.grid.w;
    const ay = (f.access / g.grid.w) | 0;
    const d = Math.abs(ax + 0.5 - c.x) + Math.abs(ay + 0.5 - c.y);
    const score = d + (f.count > 0 ? 0 : 100);
    if (score < bestScore) {
      bestScore = score;
      best = f;
    }
  }
  return best;
}

function nextWant(g, c) {
  while (c.got.length < c.wants.length) {
    const product = c.wants[c.got.length];
    const shelf = pickShelf(g, c, product);
    if (shelf) {
      c.shelfIdx = shelf.idx;
      c.state = 'toShelf';
      goToCell(g, c, shelf.access);
      return;
    }
    // Produit plus exposé : on le raye de la liste.
    c.wants.splice(c.got.length, 1);
  }
  if (c.got.length) {
    c.state = 'toQueue';
    joinQueue(g, c);
  } else {
    leave(g, c, false);
  }
}

/** Le client s'en va (content ou déçu, sans autre pénalité, G7.3). */
export function leave(g, c, sad) {
  leaveQueue(g, c);
  if (sad) {
    c.mood = -1;
    g.day.lost++;
    g.events.push('grumpy', c.x, c.y, c.id);
  }
  c.state = 'leave';
  goToCell(g, c, g.grid.door.y * g.grid.w + g.grid.door.x);
}

/** Facteur de vitesse (machine à café à ≤ 2 cases, G9.3). */
function speedFactor(g, c) {
  let k = 1;
  for (const f of g.furn) {
    if (f.def.day.kind === 'coffee' && Math.hypot(f.cx - c.x, f.cy - c.y) <= DAY_AURAS.coffeeRadius) {
      k = 1 + DAY_AURAS.coffeeSpeed;
      break;
    }
  }
  return k;
}

/** Bonus de patience (ventilateur à ≤ 2 cases, G9.3). */
function patienceFactor(g, c) {
  for (const f of g.furn) {
    if (f.def.day.kind === 'fan' && Math.hypot(f.cx - c.x, f.cy - c.y) <= DAY_AURAS.fanRadius) return 1 + DAY_AURAS.fanPatience;
  }
  return 1;
}

function startWait(g, c) {
  c.patience = c.patienceMax * patienceFactor(g, c);
  c.patienceFull = c.patience;
}

/** Avance le long du chemin. Renvoie vrai à l'arrivée. */
function walk(g, c, dt) {
  const w = g.grid.w;
  if (c.pathI >= c.path.length) {
    c.moving = false;
    return true;
  }
  const i = c.path[c.pathI];
  const tx = (i % w) + 0.5;
  const ty = ((i / w) | 0) + 0.5;
  const dx = tx - c.x;
  const dy = ty - c.y;
  const d = Math.hypot(dx, dy);
  const step = CUSTOMERS.speed * speedFactor(g, c) * dt;
  c.moving = true;
  c.walkT += dt;
  if (d <= step) {
    c.x = tx;
    c.y = ty;
    c.pathI++;
    return c.pathI >= c.path.length;
  }
  c.x += (dx / d) * step;
  c.y += (dy / d) * step;
  return false;
}

/** @param {any} g @param {number} dt */
export function stepCustomers(g, dt) {
  const d = g.day;
  for (let k = d.customers.length - 1; k >= 0; k--) {
    const c = d.customers[k];
    c.t += dt;
    switch (c.state) {
      case 'enter':
        if (walk(g, c, dt)) nextWant(g, c);
        break;
      case 'toShelf':
        if (walk(g, c, dt)) {
          c.state = 'take';
          c.takeT = CUSTOMERS.takeTime;
        }
        break;
      case 'take': {
        c.takeT -= dt;
        if (c.takeT > 0) break;
        const f = g.furn[c.shelfIdx];
        const want = c.wants[c.got.length];
        if (f && f.product === want && takeFromShelf(f)) {
          c.got.push(want);
          g.events.push('take', f.cx, f.cy, c.id, 0, want);
          nextWant(g, c);
        } else if (f && f.product === want) {
          c.state = 'wait';
          startWait(g, c);
          g.events.push('want', c.x, c.y, c.id, 0, want);
        } else {
          nextWant(g, c);
        }
        break;
      }
      case 'wait': {
        c.patience -= dt;
        const want = c.wants[c.got.length];
        const here = g.furn[c.shelfIdx];
        if (here && here.product === want && here.count > 0) {
          c.state = 'take';
          c.takeT = CUSTOMERS.takeTime * 0.5;
          break;
        }
        const other = pickShelf(g, c, want);
        if (other && other.count > 0 && other.idx !== c.shelfIdx) {
          c.shelfIdx = other.idx;
          c.state = 'toShelf';
          goToCell(g, c, other.access);
          break;
        }
        if (c.patience <= 0) leave(g, c, true);
        break;
      }
      case 'toQueue':
      case 'queue':
        stepQueued(g, c, dt);
        break;
      case 'order':
        // Commande spéciale (G7.7) : il rejoint sa place près de la caisse ; special-order.js fait le reste.
        walk(g, c, dt);
        break;
      case 'leave':
        if (walk(g, c, dt)) {
          // Passe la porte puis disparaît.
          c.y += CUSTOMERS.speed * dt;
          c.moving = true;
          if (c.y > g.grid.h + 0.4) {
            d.customers.splice(k, 1);
            d.free.push(c);
          }
        }
        break;
      default:
    }
  }
}

/** File d'attente : rejoindre sa place puis attendre le marchand (la patience décompte, G7.3). */
function stepQueued(g, c, dt) {
  const d = g.day;
  const slot = d.queue.indexOf(c);
  if (slot < 0) return;
  const pos = d.queueSlots[Math.min(slot, d.queueSlots.length - 1)];
  const extra = Math.max(0, slot - d.queueSlots.length + 1) * 0.15;
  const tx = pos.x + extra;
  const ty = pos.y;
  const dx = tx - c.x;
  const dy = ty - c.y;
  const dist = Math.hypot(dx, dy);
  const step = CUSTOMERS.speed * dt;
  if (dist > 0.02) {
    if (c.state === 'toQueue' && c.pathI < c.path.length && dist > 1.2) {
      walk(g, c, dt);
    } else {
      c.x += (dx / dist) * Math.min(step, dist);
      c.y += (dy / dist) * Math.min(step, dist);
      c.moving = true;
      c.walkT += dt;
    }
  } else {
    c.moving = false;
  }
  if (c.state === 'toQueue' && dist <= 0.3) {
    c.state = 'queue';
    c.queueAt = g.t;
    startWait(g, c);
  }
  if (c.state === 'queue' && !c.paying) {
    c.patience -= dt;
    if (c.patience <= 0) leave(g, c, true);
  }
}

/** Les clients encore là à la fin de la fermeture partent sans pénalité (G5.1). */
export function dismissAll(g) {
  const d = g.day;
  for (const c of d.customers) d.free.push(c);
  d.customers.length = 0;
  d.queue.length = 0;
}
