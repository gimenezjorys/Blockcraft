// Fort Boutique — personnel (G11.3, niveau 10, par boutique). Commis (2 au plus) : porte 3 articles à 2,2 cases/s et
// remplit d'abord l'étagère la plus vide ; Caissier (1) : encaisse en 0,9 s. +1 article et +0,2 case/s, ou −0,1 s,
// par niveau (5 au plus). Coûts × Q. Le jour ils travaillent ; la nuit ils dorment dans un coin (« Zzz »).
import { STAFF } from '../data/merchant.js';
import { districtNumber } from '../data/balance.js';
import { isUnlocked } from './progression.js';
import { goToCell } from './day/customers.js';
import { putOnShelf } from './day/shelves.js';

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

/** Coûts et possibilités pour l'écran Améliorer (onglet Boutique). */
export function staffInfo(save, shopId) {
  const shop = save.shops[shopId];
  const q = districtNumber(shopId);
  const unlocked = isUnlocked(save, 'staff');
  const st = shop.staff;
  const next = (role, level) => (level >= STAFF[role].maxLevel ? null : STAFF[role].levels[level - 1] * q);
  return {
    unlocked,
    clerks: st.clerks.map((c) => ({ level: c.level, cost: next('clerk', c.level) })),
    cashier: st.cashier ? { level: st.cashier.level, cost: next('cashier', st.cashier.level) } : null,
    hireClerk: st.clerks.length < STAFF.clerk.max ? STAFF.clerk.hire * q : null,
    hireCashier: st.cashier ? null : STAFF.cashier.hire * q,
  };
}

/** Embauche (role : clerk | cashier). */
export function hireStaff(save, shopId, role) {
  const info = staffInfo(save, shopId);
  const cost = role === 'clerk' ? info.hireClerk : info.hireCashier;
  if (!info.unlocked || cost === null || save.player.coins < cost) return false;
  save.player.coins -= cost;
  const st = save.shops[shopId].staff;
  if (role === 'clerk') st.clerks.push({ level: 1 });
  else st.cashier = { level: 1 };
  return true;
}

/** Niveau suivant d'un employé (i : indice du commis). */
export function upgradeStaff(save, shopId, role, i = 0) {
  const info = staffInfo(save, shopId);
  const it = role === 'clerk' ? info.clerks[i] : info.cashier;
  if (!info.unlocked || !it || it.cost === null || save.player.coins < it.cost) return false;
  save.player.coins -= it.cost;
  const st = save.shops[shopId].staff;
  (role === 'clerk' ? st.clerks[i] : st.cashier).level++;
  return true;
}

/** Le personnel de cette boutique travaille-t-il ? (embauché, et fonction débloquée) */
function hired(g) {
  return isUnlocked(g.save, 'staff') ? g.shop.staff : { clerks: [], cashier: null };
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
  const door = g.grid.door;
  g.staff = st.clerks.map((c, i) => ({
    kind: 'clerk', i, level: c.level, ...clerkStats(c.level),
    x: door.x + 0.5, y: Math.min(g.grid.h - 0.5, door.y + 0.5), path: [], pathI: 0, moving: false, target: -1,
    state: 'idle', waitT: 0.5 + i * 0.7, hold: 0, product: null, from: -1, to: -1, sleep: false,
  }));
  const reg = g.register;
  if (st.cashier && reg) {
    const time = cashierTime(st.cashier.level);
    g.staff.push({ kind: 'cashier', level: st.cashier.level, x: reg.cx, y: reg.y - 0.2, state: 'work', sleep: false, cashTime: time });
    g.day.staffCashier = { present: true, cashTime: time };
  } else g.day.staffCashier = null;
}

/** Garde dans la sauvegarde ce que portent les commis (rechargement en pleine journée). */
function syncCarry(g) {
  g.shop.phase.staffCarry = g.staff.filter((s) => s.kind === 'clerk' && s.hold > 0 && s.from >= 0).map((s) => [s.from, s.hold]);
}

/** Étagère qui accepte ce produit, la plus vide d'abord. */
function emptiestShelf(g, product) {
  let best = null;
  let bestFill = 2;
  for (const f of g.furn) {
    if (f.def.day.kind !== 'shelf' || f.access < 0 || f.count >= f.capacity) continue;
    if (f.product && f.product !== product) continue;
    const fill = f.count / Math.max(1, f.capacity);
    if (fill < bestFill) {
      bestFill = fill;
      best = f;
    }
  }
  return best ? { shelf: best, fill: bestFill } : null;
}

/** Prochain travail : le producteur dont le produit a l'étagère la plus vide. */
function findJob(g) {
  let best = null;
  for (const f of g.furn) {
    if (f.def.day.kind !== 'producer' || f.stock <= 0 || f.access < 0) continue;
    const s = emptiestShelf(g, f.def.day.product);
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
    if (s.kind !== 'clerk' || s.sleep) continue;
    if (s.state === 'idle') {
      s.waitT -= dt;
      if (s.waitT > 0) continue;
      const job = findJob(g);
      if (!job) {
        s.waitT = 0.8;
        continue;
      }
      s.from = job.producer.idx;
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
      if (s.hold > 0) toShelf(g, s);
      else {
        s.state = 'idle';
        s.waitT = 0.2;
        s.from = -1;
      }
      syncCarry(g);
    }
  }
}

/** Vers l'étagère la plus vide du produit porté ; sinon, rapporte le reste au producteur. */
function toShelf(g, s) {
  const target = emptiestShelf(g, s.product);
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
      ...(st.cashier ? [{ kind: 'cashier', level: st.cashier.level }] : [])];
  }
  sleepStaff(g);
}
