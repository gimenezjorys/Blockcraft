// Fort Boutique — indices des 10 premières minutes (G19), sans aucune phrase. Logique pure.
// Deux sortes d'aide :
//  - le « guide » du tout premier jour (G19 0:06 à 0:40) : la flèche dorée montre tout de suite la prochaine étape
//    (cagette, étagère, caisse, emplacement), comme dans le tableau de G19 ;
//  - les « indices » : main fantôme, halo, flèche ou traînée rouge, seulement après 4 s sans l'action attendue (3 s pour un
//    voleur). Ils disparaissent dès que le joueur agit et ne bloquent jamais rien (il peut tout faire dans le désordre).
// Le moteur n'en dépend pas : g.hints ne sert qu'au dessin.
import { HINTS } from '../data/tutorial.js';
import { bfs, nextStep } from './pathfinding.js';
import { distToFurniture } from './state.js';
import { hasShelfFor } from './day/carry.js';

/** Indices encore actifs pour cette sauvegarde ? (3 premiers cycles) */
export function hintsActive(save) {
  return save.stats.cycles < HINTS.untilCycle;
}

/** Gestes déjà appris (sauvegardés : un indice appris ne revient pas après un rechargement). */
export function learned(save) {
  if (!save.progress.learned || typeof save.progress.learned !== 'object') save.progress.learned = {};
  return save.progress.learned;
}

/** État des indices d'une partie (non sauvegardé). */
export function createHints() {
  return {
    idleT: 0,
    thiefT: 0,
    thiefDist: 0,
    forcedT: 0,
    /** Ce qui est dessiné : main (geste), flèche (chemin), halo (objet). */
    hand: null,
    arrow: null,
    halo: null,
    /** Pour la mesure du playtest : un indice visible (main, halo ou traînée). */
    shown: false,
    scratch: null,
    pathKey: -1,
    path: [],
  };
}

/** Le joueur demande où aller (tap sur l'étiquette d'objectif). */
export function forceArrow(g) {
  const h = g.hints || (g.hints = createHints());
  h.forcedT = HINTS.forcedArrowS;
}

const cellOf = (g, x, y) => Math.max(0, Math.min(g.grid.h - 1, Math.floor(y))) * g.grid.w + Math.max(0, Math.min(g.grid.w - 1, Math.floor(x)));

/** Case libre où se tenir pour atteindre un meuble (case d'accès, sinon une voisine libre). */
function standCell(g, f) {
  if (f.access >= 0) return f.access;
  const { w, h, occ } = g.grid;
  for (let y = f.y - 1; y <= f.y + f.h; y++) {
    for (let x = f.x - 1; x <= f.x + f.w; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const inside = x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h;
      if (!inside && occ[y * w + x] < 0) return y * w + x;
    }
  }
  return -1;
}

/** Chemin (centres de cases) du marchand vers une case, au plus HINTS.arrowCells cases. */
function pathTo(g, h, target) {
  const key = target * 4096 + cellOf(g, g.player.x, g.player.y);
  if (key === h.pathKey) return h.path;
  h.pathKey = key;
  const { w, h: gh, occ, n } = g.grid;
  if (!h.scratch || h.scratch.length !== n) h.scratch = new Int16Array(n);
  const field = bfs(w, gh, [target], (i) => occ[i] < 0, h.scratch);
  const out = [];
  let i = cellOf(g, g.player.x, g.player.y);
  let guard = n;
  if (field[i] < 0) {
    h.path = [{ x: (target % w) + 0.5, y: ((target / w) | 0) + 0.5 }];
    return h.path;
  }
  while (field[i] > 0 && guard-- > 0 && out.length < HINTS.arrowCells) {
    i = nextStep(field, w, gh, i);
    if (i < 0) break;
    out.push({ x: (i % w) + 0.5, y: ((i / w) | 0) + 0.5 });
  }
  h.path = out;
  return out;
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

/** Étape du guide du premier jour (G19 0:06 à 0:40), ou null quand tout est appris. */
function guideTarget(g, L) {
  const d = g.day;
  const p = g.player;
  if (!L.pick && !p.stack.length) {
    // G19 0:06 : la flèche montre la Cagette A tout de suite, pendant que les pommes poussent.
    const prods = g.furn.filter((x) => x.def.day.kind === 'producer' && hasShelfFor(g, x.def.day.product));
    const f = nearest(g, prods.filter((x) => x.stock > 0)) || nearest(g, prods);
    if (f) return { cell: standCell(g, f), f };
  }
  if (!L.stock && p.stack.length) {
    const f = nearest(g, g.furn.filter((x) => x.def.day.kind === 'shelf' && x.count < x.capacity && (!x.product || p.stack.includes(x.product))));
    if (f) return { cell: standCell(g, f), f };
  }
  if (!L.cash && d.queue.length && g.register) return { cell: standCell(g, g.register), f: g.register, halo: true };
  if (!L.pad && d.pad && g.save.player.coins >= d.pad.price - d.pad.paid) return { cell: d.pad.y * g.grid.w + d.pad.x, pad: true };
  return null;
}

/** Action la plus utile quand le joueur ne fait rien (indice après 4 s). */
function usefulTarget(g) {
  const d = g.day;
  const p = g.player;
  const reg = g.register;
  // Commande spéciale en cours (minuteur) : le client du parchemin, ou d'abord le producteur de ce qu'il demande.
  const o = d.order;
  if (o && o.waiting && o.got < o.need) {
    if (p.stack.includes(o.product)) return { cell: cellOf(g, o.c.x, o.c.y), f: { cx: o.c.x, cy: o.c.y }, halo: true };
    const src = nearest(g, g.furn.filter((x) => x.def.day.kind === 'producer' && x.def.day.product === o.product && x.stock > 0));
    if (src) return { cell: standCell(g, src), f: src };
  }
  if (reg && (d.queue.length || d.pile > 0) && distToFurniture(reg, p.x, p.y) > 1.2) return { cell: standCell(g, reg), f: reg, halo: true };
  if (d.pad && g.save.player.coins >= d.pad.price - d.pad.paid) return { cell: d.pad.y * g.grid.w + d.pad.x, pad: true };
  if (p.stack.length) {
    const f = nearest(g, g.furn.filter((x) => x.def.day.kind === 'shelf' && x.count < x.capacity && (!x.product || p.stack.includes(x.product))));
    if (f) return { cell: standCell(g, f), f };
  }
  const empty = g.furn.some((x) => x.def.day.kind === 'shelf' && x.count < x.capacity);
  if (empty) {
    const f = nearest(g, g.furn.filter((x) => x.def.day.kind === 'producer' && x.stock > 0 && hasShelfFor(g, x.def.day.product)));
    if (f) return { cell: standCell(g, f), f };
  }
  return null;
}

function setArrow(g, h, target, color) {
  if (!target || target.cell < 0) return;
  const path = pathTo(g, h, target.cell);
  h.arrow = { path, color, tx: (target.cell % g.grid.w) + 0.5, ty: ((target.cell / g.grid.w) | 0) + 0.5 };
  if (target.halo && target.f) h.halo = { x: target.f.cx, y: target.f.cy, r: 0.75 };
}

function setHand(g, h, target) {
  const tx = target ? (target.cell % g.grid.w) + 0.5 : g.player.x;
  const ty = target ? ((target.cell / g.grid.w) | 0) + 0.5 : g.player.y + 1;
  const dx = tx - g.player.x;
  const dy = ty - g.player.y;
  const len = Math.hypot(dx, dy) || 1;
  h.hand = { dx: dx / len, dy: dy / len };
}

function stepDayHints(g, h, L, active) {
  // Tap sur l'étiquette : la flèche montre l'emplacement au sol, sinon ce qui est utile maintenant (jamais un « non »).
  if (h.forcedT > 0) {
    const target = g.day.pad ? { cell: g.day.pad.y * g.grid.w + g.day.pad.x } : guideTarget(g, L) || usefulTarget(g);
    if (target) {
      setArrow(g, h, target, 'gold');
      return;
    }
  }
  if (!active) return;
  const firstDay = g.save.stats.cycles === 0;
  const guide = firstDay ? guideTarget(g, L) : null;
  if (!L.move) {
    // G19 0:06 : la main fantôme montre le geste tout de suite, la flèche montre où aller.
    const target = guide || usefulTarget(g);
    setHand(g, h, target);
    setArrow(g, h, target, 'gold');
    return;
  }
  if (guide) {
    setArrow(g, h, guide, 'gold');
    if (h.idleT >= HINTS.delayS) setHand(g, h, guide);
    return;
  }
  if (h.idleT >= HINTS.delayS) {
    const u = usefulTarget(g);
    if (u) {
      setArrow(g, h, u, 'gold');
      setHand(g, h, u);
    }
  }
}

function stepNightHints(g, h, L, active, dt) {
  const n = g.night;
  if (!n || n.ended || !active) return;
  const p = g.player;
  // Voleur en fuite : traînée rouge après 3 s sans réaction (G19 2:08).
  let thief = null;
  for (const m of n.monsters.active) {
    if (m.alive && m.thief && m.carry > 0) {
      thief = m;
      break;
    }
  }
  if (thief && !L.thief) {
    // Réagir, c'est se rapprocher du voleur au joystick (un voleur qui passe à côté d'un marchand immobile ne compte pas).
    const dist = Math.hypot(p.x - thief.x, p.y - thief.y);
    const moving = Math.hypot(g.input.x, g.input.y) > 0.15;
    const reacting = moving && (dist < HINTS.thiefReactRange || dist < h.thiefDist - 1e-4);
    h.thiefDist = dist;
    h.thiefT = reacting ? 0 : h.thiefT + dt;
    if (h.thiefT >= HINTS.thiefDelayS) {
      h.arrow = { path: pathTo(g, h, cellOf(g, thief.x, thief.y)), color: 'red', tx: thief.x, ty: thief.y };
      setHand(g, h, { cell: cellOf(g, thief.x, thief.y) });
    }
    return;
  }
  h.thiefT = 0;
  // Aura du marchand (G19 1:49) : main fantôme s'il reste immobile 4 s loin des meubles pendant une vague.
  let alive = null;
  for (const m of n.monsters.active) if (m.alive && !m.entering) alive = alive || m;
  if (!alive) return;
  const towers = g.furn.filter((f) => !f.broken && f.maxHp > 0);
  if (!towers.length) return;
  // Le meuble le plus proche du Grignotin de tête : c'est là que l'aura sert.
  let best = towers[0];
  let bd = 1e9;
  for (const f of towers) {
    const dd = Math.hypot(f.cx - alive.x, f.cy - alive.y);
    if (dd < bd) {
      bd = dd;
      best = f;
    }
  }
  const there = distToFurniture(best, p.x, p.y) <= n.auraRadius;
  // Appris quand le marchand y va de lui-même (rester planté près d'un meuble ne compte pas).
  if (there && Math.hypot(g.input.x, g.input.y) > 0.15) L.aura = true;
  if (!L.aura && !there && h.idleT >= HINTS.delayS) {
    const target = { cell: standCell(g, best), f: best, halo: true };
    setArrow(g, h, target, 'gold');
    setHand(g, h, target);
  }
}

/**
 * Un pas : apprend les gestes faits (événements de ce pas), puis choisit l'aide à dessiner.
 * @param {any} g
 * @param {number} dt
 */
export function stepHints(g, dt) {
  const h = g.hints || (g.hints = createHints());
  const L = learned(g.save);
  for (let i = 0; i < g.events.length; i++) {
    const e = g.events.items[i];
    const ty = e.type;
    if (ty === 'pickup') L.pick = true;
    else if (ty === 'drop') L.stock = true;
    else if (ty === 'kaching') L.cash = true;
    else if (ty === 'build_pop') L.pad = true;
    // Appris seulement si le marchand était là (un voleur abattu par un meuble n'apprend rien au joueur).
    else if (ty === 'thief_caught' && Math.hypot(g.player.x - e.x, g.player.y - e.y) <= HINTS.thiefReactRange + 0.4) L.thief = true;
  }
  const moving = Math.hypot(g.input.x, g.input.y) > 0.15;
  if (moving) {
    if (g.phase.name === 'day' || g.phase.name === 'night') L.move = true;
    h.idleT = 0;
  } else h.idleT += dt;
  h.forcedT = Math.max(0, h.forcedT - dt);
  h.hand = null;
  h.arrow = null;
  h.halo = null;
  const name = g.phase.name;
  const active = hintsActive(g.save);
  if ((name === 'day' || name === 'closing') && g.day) stepDayHints(g, h, L, active);
  else if (name === 'night') stepNightHints(g, h, L, active, dt);
  else h.idleT = 0;
  h.shown = !!(h.hand || h.halo || (h.arrow && h.arrow.color === 'red'));
}
