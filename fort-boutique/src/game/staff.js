// Fort Boutique — personnel (G11.3 ; v1.1, V5 : embauché dans la boutique, par boutique). Commis (1 pour 2 producteurs,
// 4 au plus) : porte 3 articles à 2,2 cases/s et remplit l'étagère la plus vide, sans jamais viser celle d'un autre
// commis ; Caissiers (2 au plus) : encaissent en 0,9 s, les pièces vont droit au porte-monnaie. +1 article et
// +0,2 case/s, ou −0,1 s (0,4 s au moins), par niveau (5 au plus). Coûts × m_Q. La nuit, ils dorment dans un coin.
import { STAFF } from '../data/merchant.js';
import { mQ } from '../data/balance.js';
import { goToCell } from './day/customers.js';
import { putOnShelf } from './day/shelves.js';
import { planSlots, shopPlanId } from './plans.js';
import { FURNITURE } from '../data/furniture.js';

/** Commis : articles portés et vitesse. */
export function clerkStats(level) {
  const c = STAFF.clerk;
  return { carry: c.carry + c.carryPerLevel * (level - 1), speed: c.speed + c.speedPerLevel * (level - 1) };
}

/** Caissier : temps d'encaissement. */
export function cashierTime(level) {
  const c = STAFF.cashier;
  return Math.max(c.cashTimeMin, Math.round((c.cashTime - c.cashTimePerLevel * (level - 1)) * 100) / 100);
}

/** Producteurs posés dans une boutique. */
export function producerCount(shop) {
  return shop.layout.filter((it) => FURNITURE[it.id] && FURNITURE[it.id].day && FURNITURE[it.id].day.kind === 'producer').length;
}

/** Commis possibles : 1 pour 2 producteurs (arrondi au-dessus), entre 1 et 4. */
export function clerkCap(shop) {
  return Math.max(1, Math.min(STAFF.clerk.max, Math.ceil(producerCount(shop) / STAFF.clerk.perProducers)));
}

/** Caissiers embauchés (0 à 2). */
export function cashiers(shop) {
  const st = shop.staff || {};
  return [st.cashier, st.cashier2].filter(Boolean);
}

/** Boutique automatisée (V5.3) : au moins un caissier et assez de commis (1 pour 2 producteurs). */
export function isAutomated(shop) {
  const st = shop && shop.staff;
  if (!st || !st.cashier) return false;
  return st.clerks.length >= Math.max(1, Math.ceil(producerCount(shop) / STAFF.clerk.perProducers));
}

/** Coûts des améliorations pour l'écran Améliorer (onglet Personnel) ; l'embauche se fait dans la boutique. */
export function staffInfo(save, shopId) {
  const shop = save.shops[shopId];
  const q = mQ(shopId);
  const st = shop.staff;
  const next = (role, level) => (level >= STAFF[role].maxLevel ? null : Math.round(STAFF[role].levels[level - 1] * q));
  return {
    unlocked: true,
    clerks: st.clerks.map((c) => ({ level: c.level, cost: next('clerk', c.level) })),
    cashier: st.cashier ? { level: st.cashier.level, cost: next('cashier', st.cashier.level) } : null,
    cashier2: st.cashier2 ? { level: st.cashier2.level, cost: next('cashier', st.cashier2.level) } : null,
    canHireMore: st.clerks.length < clerkCap(shop) || cashiers(shop).length < STAFF.cashier.max,
  };
}

/** Embauche directe (emplacement d'embauche payé ; role : clerk | cashier). */
export function hireStaff(save, shopId, role) {
  const shop = save.shops[shopId];
  const st = shop.staff;
  if (role === 'clerk') {
    if (st.clerks.length >= STAFF.clerk.max) return false;
    st.clerks.push({ level: 1 });
  } else if (!st.cashier) st.cashier = { level: 1 };
  else if (!st.cashier2) st.cashier2 = { level: 1 };
  else return false;
  return true;
}

/** Niveau suivant d'un employé (role : clerk | cashier | cashier2 ; i : indice du commis). */
export function upgradeStaff(save, shopId, role, i = 0) {
  const info = staffInfo(save, shopId);
  const it = role === 'clerk' ? info.clerks[i] : info[role];
  if (!it || it.cost === null || save.player.coins < it.cost) return false;
  save.player.coins -= it.cost;
  const st = save.shops[shopId].staff;
  (role === 'clerk' ? st.clerks[i] : st[role]).level++;
  return true;
}

/** Le personnel embauché dans cette boutique. */
function hired(g) {
  return g.shop.staff;
}

/** Postes du personnel (plan) : caissier derrière la caisse, commis au coin réserve. */
export function staffPosts(g) {
  const P = planSlots(g.shopId, g.shop.expansion, shopPlanId(g.shop));
  const [cx, cy] = P.staff.cashier;
  const [kx, ky] = P.staff.clerk;
  const reg = g.register;
  // La caisse peut avoir été déplacée (aménagement libre) : le caissier se met alors juste sous elle.
  const cash = reg && !(reg.x === cx && reg.y === cy - 1) ? { x: reg.x, y: Math.min(g.grid.h - 1, reg.y + 1) } : { x: cx, y: cy };
  return { cashier: cash, cashier2: { x: Math.min(g.grid.w - 1, cash.x + 1), y: cash.y }, clerk: { x: kx, y: ky } };
}

/**
 * Début du jour : les commis entrent par la porte, le caissier se place derrière la caisse. Les articles qu'un commis
 * portait au moment d'un rechargement retournent à leur producteur (rien ne se perd).
 * @param {any} g
 */
export function initStaff(g) {
  const st = hired(g);
  const ph = g.shop.phase;
  if (Array.isArray(ph.staffCarry)) {
    for (const [idx, n] of ph.staffCarry) {
      const f = g.furn[idx];
      if (f && f.def.day.kind === 'producer' && n > 0) {
        f.stock += n;
        f.item.stock = f.stock;
      }
    }
  }
  ph.staffCarry = [];
  const posts = staffPosts(g);
  const apron = g.district && g.district.accent;
  g.staff = st.clerks.map((c, i) => makeClerk(g, c, i, posts, apron));
  const reg = g.register;
  const cs = [st.cashier, st.cashier2].filter(Boolean);
  if (cs.length && reg) {
    const times = cs.map((c) => cashierTime(c.level));
    cs.forEach((c, k) => {
      const post = k === 0 ? posts.cashier : posts.cashier2;
      g.staff.push({ kind: 'cashier', k, level: c.level, x: post.x + 0.5, y: post.y + 0.5, state: 'work', sleep: false, cashTime: times[k], workT: 0, apron });
    });
    g.day.staffCashier = { present: true, cashTime: times[0], lanes: times };
  } else g.day.staffCashier = null;
}

function makeClerk(g, c, i, posts, apron) {
  const post = posts || staffPosts(g);
  return {
    kind: 'clerk', i, level: c.level, ...clerkStats(c.level),
    x: post.clerk.x + 0.5, y: post.clerk.y + 0.5, path: [], pathI: 0, moving: false, target: -1,
    state: 'idle', waitT: 0.5 + i * 0.7, hold: 0, product: null, from: -1, to: -1, sleep: false, idleT: 0, zzz: false,
    apron: apron || (g.district && g.district.accent),
  };
}

/**
 * Nouvel employé en pleine journée (emplacement d'embauche payé) : il prend son poste tout de suite.
 * @param {any} g
 * @param {'clerk' | 'cashier'} role
 */
export function staffArrives(g, role) {
  if (!g.staff) g.staff = [];
  const st = hired(g);
  if (role === 'clerk') {
    const i = st.clerks.length - 1;
    const c = makeClerk(g, st.clerks[i], i);
    g.staff.push(c);
    return c;
  }
  // Caissiers : on recompose la file des caisses.
  g.staff = g.staff.filter((s) => s.kind !== 'cashier');
  const posts = staffPosts(g);
  const cs = cashiers(g.shop);
  const times = cs.map((c) => cashierTime(c.level));
  cs.forEach((c, k) => {
    const post = k === 0 ? posts.cashier : posts.cashier2;
    g.staff.push({ kind: 'cashier', k, level: c.level, x: post.x + 0.5, y: post.y + 0.5, state: 'work', sleep: false, cashTime: times[k], workT: 0, apron: g.district && g.district.accent });
  });
  if (g.day) g.day.staffCashier = { present: true, cashTime: times[0], lanes: times };
  return g.staff[g.staff.length - 1];
}

/** Garde dans la sauvegarde ce que portent les commis (rechargement en pleine journée). */
function syncCarry(g) {
  g.shop.phase.staffCarry = g.staff.filter((s) => s.kind === 'clerk' && s.hold > 0 && s.from >= 0).map((s) => [s.from, s.hold]);
}

/** Étagères visées par les autres commis (V5.2 : deux commis ne visent jamais la même étagère). */
function reserved(g, self) {
  const out = new Set();
  for (const s of g.staff) if (s !== self && s.kind === 'clerk' && s.to >= 0 && (s.state === 'toProducer' || s.state === 'toShelf')) out.add(s.to);
  return out;
}

/** Produits fabriqués ici qui n'ont encore aucune étagère : les étagères vides leur sont gardées (variété = recette). */
function productsWithoutShelf(g) {
  const shown = new Set();
  for (const f of g.furn) if (f.def.day.kind === 'shelf' && f.product) shown.add(f.product);
  const out = new Set();
  for (const f of g.furn) if (f.def.day.kind === 'producer' && !shown.has(f.def.day.product)) out.add(f.def.day.product);
  return out;
}

/** Étagère qui accepte ce produit, la plus vide d'abord (hors étagères réservées). */
function emptiestShelf(g, product, self = null) {
  let best = null;
  let bestFill = 2;
  const taken = self ? reserved(g, self) : null;
  const missing = self ? productsWithoutShelf(g) : null;
  for (const f of g.furn) {
    if (f.def.day.kind !== 'shelf' || f.access < 0 || f.count >= f.capacity) continue;
    if (taken && taken.has(f.idx)) continue;
    if (f.product && f.product !== product) continue;
    if (!f.product && missing && missing.size && !missing.has(product)) continue;
    const fill = f.count / Math.max(1, f.capacity);
    if (fill < bestFill) {
      bestFill = fill;
      best = f;
    }
  }
  return best ? { shelf: best, fill: bestFill } : null;
}

/** Prochain travail : le producteur dont le produit a l'étagère la plus vide (non réservée). */
function findJob(g, self) {
  let best = null;
  for (const f of g.furn) {
    if (f.def.day.kind !== 'producer' || f.stock <= 0 || f.access < 0) continue;
    const s = emptiestShelf(g, f.def.day.product, self);
    if (s && (!best || s.fill < best.fill)) best = { producer: f, shelf: s.shelf, fill: s.fill };
  }
  return best;
}

function walk(g, s, dt) {
  const w = g.grid.w;
  if (s.pathI >= s.path.length) {
    s.moving = false;
    return true;
  }
  const i = s.path[s.pathI];
  const tx = (i % w) + 0.5;
  const ty = ((i / w) | 0) + 0.5;
  const dx = tx - s.x;
  const dy = ty - s.y;
  const d = Math.hypot(dx, dy);
  const step = s.speed * dt;
  s.moving = true;
  if (d <= step) {
    s.x = tx;
    s.y = ty;
    s.pathI++;
    return s.pathI >= s.path.length;
  }
  s.x += (dx / d) * step;
  s.y += (dy / d) * step;
  return false;
}

/** @param {any} g @param {number} dt */
export function stepStaff(g, dt) {
  if (!g.staff) return;
  for (const s of g.staff) {
    if (s.kind === 'cashier') {
      s.workT = Math.max(0, (s.workT || 0) - dt);
      continue;
    }
    if (s.kind !== 'clerk' || s.sleep) continue;
    if (s.state === 'idle') {
      // Rien à faire depuis 2 s : petite bulle « Zzz » (V5.2).
      s.idleT = (s.idleT || 0) + dt;
      s.zzz = s.idleT > 2;
      s.waitT -= dt;
      if (s.waitT > 0) continue;
      const job = findJob(g, s);
      if (!job) {
        // Il attend sur place (près des producteurs) : il repartira tout de suite au prochain article prêt.
        s.waitT = 0.4;
        continue;
      }
      s.idleT = 0;
      s.zzz = false;
      s.from = job.producer.idx;
      s.to = job.shelf.idx;
      s.state = 'toProducer';
      goToCell(g, s, job.producer.access);
    } else if (s.state === 'toProducer') {
      if (!walk(g, s, dt)) continue;
      const f = g.furn[s.from];
      const n = f ? Math.min(s.carry, f.stock) : 0;
      if (n <= 0) {
        s.state = 'idle';
        s.waitT = 0.3;
        continue;
      }
      f.stock -= n;
      f.item.stock = f.stock;
      s.hold = n;
      s.product = f.def.day.product;
      g.events.push('staff_pick', s.x, s.y, n, 0, s.product);
      syncCarry(g);
      toShelf(g, s);
    } else if (s.state === 'toShelf') {
      if (!walk(g, s, dt)) continue;
      const f = g.furn[s.to];
      while (s.hold > 0 && f && putOnShelf(f, s.product)) s.hold--;
      if (f) g.events.push('staff_drop', f.cx, f.cy, f.count, 0, s.product);
      if (s.hold > 0) {
        s.to = -1;
        toShelf(g, s);
      } else {
        s.state = 'idle';
        s.waitT = 0.2;
        s.from = -1;
        s.to = -1;
      }
      syncCarry(g);
    }
  }
}

/** Vers l'étagère la plus vide du produit porté ; sinon, rapporte le reste au producteur. */
function toShelf(g, s) {
  const mine = s.to >= 0 ? g.furn[s.to] : null;
  const keep = mine && mine.count < mine.capacity && (!mine.product || mine.product === s.product) ? { shelf: mine } : null;
  const target = keep || emptiestShelf(g, s.product, s);
  if (target) {
    s.to = target.shelf.idx;
    s.state = 'toShelf';
    goToCell(g, s, target.shelf.access);
    return;
  }
  const f = g.furn[s.from];
  if (f) {
    f.stock += s.hold;
    f.item.stock = f.stock;
  }
  s.hold = 0;
  s.state = 'idle';
  s.waitT = 1;
}

/**
 * Fin du jour : ce que portent encore les commis retourne au producteur ; la nuit, tout le monde dort dans un coin.
 * @param {any} g
 */
export function sleepStaff(g) {
  if (!g.staff) return;
  const { w } = g.grid;
  let k = 0;
  for (const s of g.staff) {
    if (s.kind === 'clerk' && s.hold > 0) {
      const f = g.furn[s.from];
      if (f) {
        f.stock += s.hold;
        f.item.stock = f.stock;
      }
      s.hold = 0;
    }
    s.sleep = true;
    s.state = 'sleep';
    s.moving = false;
    // Coin du haut à droite, en dehors des chemins (le personnel ne bloque rien : il n'occupe aucune case).
    s.x = w - 0.35 - 0.45 * k++;
    s.y = 0.35;
  }
  g.shop.phase.staffCarry = [];
  if (g.day) g.day.staffCashier = null;
}

/** Nuit (aussi après un rechargement) : le personnel embauché dort dans son coin. */
export function staffToBed(g) {
  if (!g.staff) {
    const st = hired(g);
    g.staff = [...st.clerks.map((c, i) => ({ kind: 'clerk', i, level: c.level, hold: 0, from: -1 })),
      ...cashiers(g.shop).map((c, k) => ({ kind: 'cashier', k, level: c.level }))];
  }
  sleepStaff(g);
}
