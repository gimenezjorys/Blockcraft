// Fort Boutique — emplacements d'achat de l'Épicerie (G6.7) : apparaissent un par un, le marchand paie en restant dessus.
import { PADS } from '../../data/balance.js';
import { rebuildShop, ejectPlayer } from '../state.js';
import { initProducers } from './producers.js';
import { initShelves } from './shelves.js';
import { initRegister } from './register.js';
import { goToCell } from './customers.js';
import { validateLayout } from '../shop.js';
import { orderSpot } from './special-order.js';

/** Durée de remplissage d'un emplacement (DECISIONS.md, M4). */
export function padFillSeconds(price) {
  return Math.min(PADS.maxFillS, Math.max(PADS.minFillS, price / PADS.pricePerSecond));
}

/**
 * Prochain emplacement à afficher, dans l'ordre strict (null si le suivant n'est pas encore disponible).
 * @param {any} g
 */
export function nextPadDef(g) {
  const pads = g.district.pads || [];
  const done = g.shop.pads.done;
  for (const p of pads) {
    if (done.includes(p.id)) continue;
    const w = p.when || {};
    if (w.firstSale && !g.shop.phase.firstSaleDone) return null;
    if (w.after && !done.includes(w.after)) return null;
    if (w.minDay && g.shop.day < w.minDay) return null;
    if (w.minLevel && g.save.player.level < w.minLevel) return null;
    return p;
  }
  return null;
}

/** Tous les emplacements tutoriel sont-ils construits ? (le catalogue s'ouvre ensuite, G6.7) */
export function padsFinished(g) {
  return padsRemaining(g) === 0;
}

/** Nombre d'emplacements d'achat du tutoriel encore à payer. */
export function padsRemaining(g) {
  const pads = g.district.pads || [];
  return pads.filter((p) => !g.shop.pads.done.includes(p.id)).length;
}

/**
 * Case où poser l'emplacement : celle de G6.7 (décalée d'une ligne par agrandissement), ou, si elle est prise
 * (meuble déplacé dans l'éditeur, P1), la case libre valide la plus proche. Jamais une case qui bloquerait un chemin.
 * @param {any} g
 * @param {any} def
 * @returns {{ x: number, y: number } | null}
 */
export function padSpot(g, def) {
  const shop = g.shop;
  const { w, h } = g.grid;
  const x0 = def.x;
  const y0 = def.y + (shop.expansion | 0);
  const ok = (x, y) => validateLayout(g.shopId, shop.expansion, shop.layout.concat([{ id: def.furniture, x, y, rot: 0 }])).ok;
  if (x0 < w && y0 < h && ok(x0, y0)) return { x: x0, y: y0 };
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push({ x, y, d: Math.abs(x - x0) + Math.abs(y - y0) });
  cells.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  for (const c of cells) if (ok(c.x, c.y)) return { x: c.x, y: c.y };
  return null;
}

function activate(g, def) {
  const spot = padSpot(g, def);
  if (!spot) return;
  const paid = Math.max(0, Math.min(def.price, g.shop.pads.paid[def.id] || 0));
  g.day.pad = { id: def.id, furniture: def.furniture, x: spot.x, y: spot.y, price: def.price, paid, acc: 0, rate: def.price / padFillSeconds(def.price), shown: 0 };
  g.shop.pads.active = def.id;
  g.events.push('pad_appear', spot.x + 0.5, spot.y + 0.5, def.price, 0, def.id);
}

/** @param {any} g @param {number} dt */
export function stepPads(g, dt) {
  const d = g.day;
  if (!d.pad) {
    const def = nextPadDef(g);
    if (def) activate(g, def);
    return;
  }
  const pad = d.pad;
  pad.shown += dt;
  const p = g.player;
  const on = Math.floor(p.x) === pad.x && Math.floor(p.y) === pad.y;
  pad.on = on;
  if (!on) {
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
  if (pad.paid >= pad.price) build(g, pad);
}

/** Le meuble tombe du ciel sur l'emplacement payé (G20.6). */
function build(g, pad) {
  const shop = g.shop;
  shop.layout.push({ id: pad.furniture, x: pad.x, y: pad.y, rot: 0 });
  shop.pads.done.push(pad.id);
  delete shop.pads.paid[pad.id];
  shop.pads.active = null;
  g.day.pad = null;
  refreshAfterLayoutChange(g);
  const f = g.furn[g.furn.length - 1];
  f.jump = 1;
  g.save.stats.padsBuilt = (g.save.stats.padsBuilt || 0) + 1;
  g.events.push('build_pop', f.cx, f.cy, f.idx, 0, f.id);
  g.events.push('save');
}

/** Après un changement de disposition en cours de journée : grille, champs, clients et file. */
export function refreshAfterLayoutChange(g) {
  rebuildShop(g);
  ejectPlayer(g);
  initProducers(g);
  initShelves(g);
  if (!g.day) return;
  initRegister(g);
  for (const c of g.day.customers) {
    if (c.state === 'leave') goToCell(g, c, g.grid.door.y * g.grid.w + g.grid.door.x);
    else if (c.state === 'toShelf' && g.furn[c.shelfIdx]) goToCell(g, c, g.furn[c.shelfIdx].access);
    else if (c.state === 'toQueue' && g.day.queueCell >= 0) goToCell(g, c, g.day.queueCell);
    else if (c.state === 'enter') goToCell(g, c, g.grid.door.y * g.grid.w + g.grid.door.x);
    else if (c.state === 'order') goToCell(g, c, orderSpot(g));
  }
}
