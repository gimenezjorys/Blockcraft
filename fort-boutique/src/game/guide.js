// Fort Boutique — la flèche d'objectif (v1.1, V2.1) : une seule cible à la fois, jamais le chemin. Logique pure :
// l'interface dessine la flèche dorée au-dessus de `g.guide.target` quand `g.guide.visible` est vrai.
// Cible recalculée toutes les 0,25 s, gardée au moins 1,5 s (pas de clignotement). Visible tout le temps pendant
// l'apprentissage (3 fois chaque action de base), puis seulement après 4 s sans action utile, lors d'un imprévu, ou
// 3 s quand un nouvel emplacement devient payable. Option : Auto / Toujours / Jamais.
import { GUIDE } from '../data/tutorial.js';
import { distToFurniture } from './state.js';

/** Actions de base comptées pour l'apprentissage (save.progress.mastery). */
export const MASTERY_KEYS = ['pick', 'stock', 'cash', 'pad'];
const EVENT_TO_MASTERY = { pickup: 'pick', drop: 'stock', kaching: 'cash', coins: 'cash', build_pop: 'pad' };
const USEFUL = new Set(['pickup', 'drop', 'kaching', 'coins', 'build_pop', 'pad_tick', 'order_give', 'thief_caught']);

/** Compteurs d'actions apprises (sauvegardés). */
export function mastery(save) {
  const p = save.progress;
  if (!p.mastery || typeof p.mastery !== 'object') p.mastery = {};
  return p.mastery;
}

/** L'apprentissage est-il fini ? (chaque action de base faite 3 fois) */
export function learnedBasics(save) {
  const m = mastery(save);
  return MASTERY_KEYS.every((k) => (m[k] || 0) >= GUIDE.masteryCount);
}

function createGuide() {
  return { target: null, scanT: 0, holdT: 0, idleT: 0, showT: 0, forceT: 0, padId: null, visible: false, reason: '' };
}

function nearest(g, list) {
  let best = null;
  let bd = 1e9;
  for (const f of list) {
    const d = distToFurniture(f, g.player.x, g.player.y);
    if (d < bd) {
      bd = d;
      best = f;
    }
  }
  return best;
}

const at = (f, kind) => ({ x: f.cx, y: f.cy, kind, ref: f });

/** Étagère d'un produit (produit déjà posé, ou étagère vide). */
const shelvesFor = (g, product) => g.furn.filter((f) => f.def.day.kind === 'shelf' && f.count < f.capacity && (!f.product || f.product === product));

/** La cible du jour, par ordre de priorité (V2.1). */
function dayTarget(g) {
  const d = g.day;
  const p = g.player;
  const coins = g.save.player.coins;
  // 1. Emplacement d'achat payable.
  if (d.pad && coins >= d.pad.price - d.pad.paid) return { x: d.pad.x + 0.5, y: d.pad.y + 0.5, kind: 'pad', ref: d.pad };
  // 2. Le marchand porte des articles : l'étagère la plus vide de ce produit (à égalité, la plus proche).
  if (p.stack.length) {
    let best = null;
    let bk = 2;
    for (const product of new Set(p.stack)) {
      for (const f of shelvesFor(g, product)) {
        const k = f.count / Math.max(1, f.capacity);
        if (k < bk - 1e-6 || (Math.abs(k - bk) < 1e-6 && best && distToFurniture(f, p.x, p.y) < distToFurniture(best, p.x, p.y))) {
          bk = k;
          best = f;
        }
      }
    }
    if (best) return at(best, 'shelf');
  }
  const cashier = !!(d.staffCashier && d.staffCashier.present);
  // 3. Un client attend à la caisse, sans caissier.
  if (g.register && d.queue.length && !cashier) return at(g.register, 'register');
  // 4. Étagère vide ou presque (< 25 %) dont le producteur a du stock : ce producteur.
  for (const sh of g.furn) {
    if (sh.def.day.kind !== 'shelf' || sh.count / Math.max(1, sh.capacity) >= GUIDE.lowShelf) continue;
    const prods = g.furn.filter((f) => f.def.day.kind === 'producer' && f.stock > 0 && (!sh.product || f.def.day.product === sh.product));
    const src = nearest(g, prods);
    if (src) return at(src, 'producer');
  }
  // 5. Tas de pièces sur le comptoir, sans caissier.
  if (g.register && !cashier && d.pile >= GUIDE.pileMin) return at(g.register, 'pile');
  // 6. Le producteur qui a le plus de stock.
  let top = null;
  for (const f of g.furn) if (f.def.day.kind === 'producer' && f.stock > 0 && (!top || f.stock > top.stock)) top = f;
  if (top) return at(top, 'producer');
  // 7. Rien n'est encore prêt (tout début du jour) : le producteur le plus proche, où les articles poussent.
  if (!p.stack.length) {
    const src = nearest(g, g.furn.filter((f) => f.def.day.kind === 'producer'));
    if (src) return at(src, 'producer');
  }
  return null;
}

/** La nuit, une seule cible : un voleur qui fuit avec un sac. */
function nightTarget(g) {
  const n = g.night;
  if (!n || n.ended) return null;
  for (const m of n.monsters.active) if (m.alive && m.thief && m.carry > 0) return { x: m.x, y: m.y, kind: 'thief', ref: m };
  return null;
}

/** Imprévu du jour : client qui attend devant une étagère vide, file de 3 clients ou plus. */
function dayIncident(g) {
  const d = g.day;
  if (d.queue.length >= GUIDE.queueAlert) return true;
  for (const c of d.customers) {
    const want = c.state === 'wait' ? c.wants[c.got.length] : null;
    if (want) {
      const has = g.furn.some((f) => f.def.day.kind === 'shelf' && f.product === want && f.count > 0);
      if (!has) return true;
    }
  }
  return false;
}

/**
 * Un pas de la flèche d'objectif.
 * @param {any} g
 * @param {number} dt
 */
export function stepGuide(g, dt) {
  const s = g.guide || (g.guide = createGuide());
  const m = mastery(g.save);
  let useful = false;
  for (let i = 0; i < g.events.length; i++) {
    const ty = g.events.items[i].type;
    const k = EVENT_TO_MASTERY[ty];
    if (k) m[k] = Math.min(99, (m[k] || 0) + 1);
    if (USEFUL.has(ty)) useful = true;
  }
  s.idleT = useful ? 0 : s.idleT + dt;
  s.showT = Math.max(0, s.showT - dt);
  s.forceT = Math.max(0, (s.forceT || 0) - dt);
  const name = g.phase.name;
  const day = (name === 'day' || name === 'closing') && g.day;
  const night = name === 'night' && g.night;
  if (!day && !night) {
    s.target = null;
    s.visible = false;
    return;
  }
  // Cible : recalculée toutes les 0,25 s ; gardée 1,5 s au moins, sauf si elle disparaît (voleur sorti, étagère pleine).
  s.scanT -= dt;
  s.holdT -= dt;
  if (night && s.target && s.target.kind === 'thief' && s.target.ref.alive && s.target.ref.carry > 0) {
    s.target.x = s.target.ref.x;
    s.target.y = s.target.ref.y;
  }
  if (s.scanT <= 0) {
    s.scanT = GUIDE.scanS;
    const next = day ? dayTarget(g) : nightTarget(g);
    const same = next && s.target && next.ref === s.target.ref;
    if (!next) {
      s.target = null;
    } else if (same) {
      s.target.x = next.x;
      s.target.y = next.y;
    } else if (!s.target || s.holdT <= 0 || next.kind === 'thief' || !stillValid(g, s.target)) {
      s.target = next;
      s.holdT = GUIDE.holdS;
    }
  }
  // Nouvel emplacement payable : 3 s de flèche.
  if (day && g.day.pad && g.save.player.coins >= g.day.pad.price - g.day.pad.paid && s.padId !== g.day.pad.id) {
    s.padId = g.day.pad.id;
    s.showT = GUIDE.newPadS;
  }
  const mode = g.save.settings.guideArrow || 'auto';
  let reason = '';
  if (s.forceT > 0) reason = 'tap';
  else if (mode === 'always') reason = 'always';
  else if (mode === 'auto') {
    if (!learnedBasics(g.save)) reason = 'learning';
    else if (night) reason = 'thief';
    else if (s.idleT >= GUIDE.idleS) reason = 'idle';
    else if (s.showT > 0) reason = 'pad';
    else if (dayIncident(g)) reason = 'incident';
  }
  s.visible = !!reason && !!s.target;
  s.reason = reason;
}

/** La cible gardée a-t-elle encore un sens ? */
function stillValid(g, t) {
  if (!t || !t.ref) return false;
  if (t.kind === 'pad') return g.day && g.day.pad === t.ref;
  if (t.kind === 'shelf') return t.ref.count < t.ref.capacity && g.player.stack.length > 0;
  if (t.kind === 'producer') return t.ref.stock > 0;
  if (t.kind === 'register') return g.day && g.day.queue.length > 0;
  if (t.kind === 'pile') return g.day && g.day.pile > 0;
  return true;
}
