// Fort Boutique — emplacements d'embauche (v1.1, V5.1) : un carré doré avec la silhouette du personnage, posé sur le
// poste du plan (derrière la caisse pour un caissier, au coin réserve pour un commis). Le marchand paie en restant
// dessus, comme pour un meuble ; l'employé prend son poste aussitôt. Un seul emplacement d'embauche à la fois.
import { HIRE_PADS, STAFF } from '../../data/merchant.js';
import { mQ } from '../../data/balance.js';
import { padFillSeconds } from './pads.js';
import { hireStaff, staffArrives, staffPosts, clerkCap, cashiers } from '../staff.js';

/** Prix d'un emplacement d'embauche dans cette boutique (× m_Q hors du Q1). */
export function hirePrice(shopId, def) {
  return Math.round(def.price * mQ(shopId));
}

/**
 * Prochain emplacement d'embauche disponible aujourd'hui, ou null.
 * @param {any} g
 */
export function nextHireDef(g) {
  if (g.challenge || g.endlessRun) return null;
  const shop = g.shop;
  const st = shop.staff;
  const q1 = g.shopId === 'q1';
  for (const def of HIRE_PADS) {
    const have = def.role === 'clerk' ? st.clerks.length : cashiers(shop).length;
    if (have !== def.n - 1) continue;
    if (shop.day < (q1 ? def.day : def.dayQ)) continue;
    if (def.minExpansion && (shop.expansion | 0) < def.minExpansion) continue;
    if (def.role === 'clerk' && (def.n > clerkCap(shop) || def.n > STAFF.clerk.max)) continue;
    if (def.role === 'cashier' && def.n > STAFF.cashier.max) continue;
    return def;
  }
  return null;
}

/** Case du poste : libre, sinon la case libre la plus proche sur la dernière ligne. */
function hireSpot(g, def) {
  const posts = staffPosts(g);
  const p = def.role === 'clerk' ? posts.clerk : def.n > 1 ? posts.cashier2 : posts.cashier;
  const { w, h, occ, door } = g.grid;
  const free = (x, y) => x >= 0 && y >= 0 && x < w && y < h && occ[y * w + x] < 0 && !(x === door.x && y === door.y)
    && !(g.day.pad && g.day.pad.x === x && g.day.pad.y === y);
  if (free(p.x, p.y)) return { x: p.x, y: p.y };
  for (let d = 1; d < w + h; d++) {
    for (let y = h - 1; y >= 0; y--) {
      for (let x = 0; x < w; x++) if (Math.abs(x - p.x) + Math.abs(y - p.y) === d && free(x, y)) return { x, y };
    }
  }
  return null;
}

/** @param {any} g @param {number} dt */
export function stepHirePads(g, dt) {
  const d = g.day;
  if (!d.hirePad) {
    const def = nextHireDef(g);
    if (!def) return;
    const spot = hireSpot(g, def);
    if (!spot) return;
    const price = hirePrice(g.shopId, def);
    const paid = Math.max(0, Math.min(price, g.shop.pads.paid[def.id] || 0));
    d.hirePad = { id: def.id, role: def.role, n: def.n, x: spot.x, y: spot.y, price, paid, acc: 0, rate: price / padFillSeconds(price), shown: 0 };
    g.events.push('pad_appear', spot.x + 0.5, spot.y + 0.5, price, 1, def.id);
    return;
  }
  const pad = d.hirePad;
  pad.shown += dt;
  const p = g.player;
  pad.on = Math.floor(p.x) === pad.x && Math.floor(p.y) === pad.y;
  if (!pad.on) {
    pad.acc = 0;
    return;
  }
  const coins = g.save.player.coins;
  if (coins <= 0) return;
  pad.acc += pad.rate * dt;
  let n = Math.floor(pad.acc);
  if (n <= 0) return;
  n = Math.min(n, pad.price - pad.paid, coins);
  pad.acc -= n;
  pad.paid += n;
  g.save.player.coins -= n;
  g.shop.pads.paid[pad.id] = pad.paid;
  g.events.push('pad_tick', pad.x + 0.5, pad.y + 0.5, pad.paid, pad.price);
  if (pad.paid >= pad.price) hire(g, pad);
}

/** L'employé arrive : il est embauché et prend son poste. */
function hire(g, pad) {
  delete g.shop.pads.paid[pad.id];
  g.day.hirePad = null;
  if (!hireStaff(g.save, g.shopId, pad.role)) return;
  const s = staffArrives(g, pad.role);
  g.save.stats.hired = (g.save.stats.hired || 0) + 1;
  g.events.push('hire_pop', s ? s.x : pad.x + 0.5, s ? s.y : pad.y + 0.5, 0, 0, pad.role);
  g.events.push('save');
}
