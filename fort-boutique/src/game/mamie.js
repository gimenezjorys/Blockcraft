// Fort Boutique — Objectifs de Mamie (v1.1, V2.3), logique pure : objectif en cours, mesure absolue, validation.
// L'index de l'objectif en cours est gardé par boutique (save.progress.mamieObjective[shopId]). Pas d'objectif
// pendant le Défi du jour ni la Nuit sans fin (parties à part).
import { MAMIE } from '../data/mamie.js';
import { furnState } from './state.js';
import { grantReward } from './rewards.js';
import { seedFrom } from '../core/rng.js';

/** Liste de la boutique. */
export const mamieList = (shopId) => MAMIE[shopId] || [];

function indexMap(save) {
  const p = save.progress;
  if (!p.mamieObjective || typeof p.mamieObjective !== 'object' || Array.isArray(p.mamieObjective)) p.mamieObjective = {};
  return p.mamieObjective;
}

/** Index de l'objectif en cours (0…n ; n = liste finie). */
export function mamieIndex(save, shopId) {
  const v = indexMap(save)[shopId];
  const n = mamieList(shopId).length;
  return Number.isInteger(v) && v >= 0 ? Math.min(v, n) : 0;
}

/** Exemplaires d'un meuble dans la boutique (posés ou en réserve). */
function ownedCount(shop, id) {
  let n = 0;
  for (const it of shop.layout || []) if (it.id === id) n++;
  for (const s of shop.storage || []) if (s === id) n++;
  return n;
}

/**
 * Valeur actuelle d'un objectif (même unité que `goal`).
 * @param {any} g
 * @param {any} def
 */
export function mamieValue(g, def) {
  const save = g.save;
  const st = save.stats;
  const shop = g.shop;
  switch (def.kind) {
    case 'shelfFill': {
      // Qui a déjà vendu autant d'articles a forcément rempli une étagère (joueur déjà avancé, ou objectif vu au Matin).
      if ((st.sold || 0) >= def.goal) return def.goal;
      let best = 0;
      for (const f of g.furn || []) if (f.def.day.kind === 'shelf' && f.product === def.product) best = Math.max(best, f.count);
      return best;
    }
    case 'served':
      return st.served || 0;
    case 'owned':
      return ownedCount(shop, def.furniture);
    case 'dayTakings':
      return Math.max(g.day ? g.day.takings : 0, (g.phase && g.phase.name === 'morning') || !g.day ? shop.lastDayTakings || 0 : 0);
    case 'nights':
      return st.nights || 0;
    case 'level':
      return furnState(save, def.furniture).level;
    case 'soldBy':
      return (st.soldBy && st.soldBy[def.product]) || 0;
    case 'cashier':
      return shop.staff && shop.staff.cashier ? 1 : 0;
    case 'clerks':
      return shop.staff && shop.staff.clerks ? shop.staff.clerks.length : 0;
    case 'flag':
      return save.progress.flags && save.progress.flags[def.flag] ? 1 : 0;
    case 'nights3':
      return st.nights3 || 0;
    case 'shopNights':
      return Math.max(0, (shop.week - 1) * 7 + shop.night - 1);
    case 'shopStars':
      return shop.lastNightStars || 0;
    case 'boss':
      return (st.bossKills && st.bossKills[def.boss]) || 0;
    default:
      return 0;
  }
}

/** Les Objectifs de Mamie s'appliquent-ils à cette partie ? */
export const mamieApplies = (g) => !!g && !g.challenge && !g.endlessRun && !!g.shop && mamieList(g.shopId).length > 0;

/**
 * Objectif en cours, ou null quand la liste est finie.
 * @param {any} g
 * @returns {{ def: any, index: number, count: number, value: number, goal: number, progress: number } | null}
 */
export function currentMamie(g) {
  if (!mamieApplies(g)) return null;
  const list = mamieList(g.shopId);
  const i = mamieIndex(g.save, g.shopId);
  if (i >= list.length) return null;
  const def = list[i];
  const value = Math.min(def.goal, mamieValue(g, def));
  return { def, index: i, count: list.length, value, goal: def.goal, progress: def.goal > 0 ? value / def.goal : 1 };
}

/**
 * Valide l'objectif en cours s'il est atteint : récompense, puis passage au suivant.
 * @param {any} g
 * @returns {{ def: any, reward: ReturnType<typeof grantReward> } | null}
 */
export function checkMamie(g) {
  const cur = currentMamie(g);
  if (!cur || cur.value < cur.goal) return null;
  const { def, index } = cur;
  const ctx = { seed: seedFrom(g.save.seed, 'mamie', def.id), planId: def.reward.planId };
  const reward = grantReward(g.save, def.reward, ctx);
  indexMap(g.save)[g.shopId] = index + 1;
  if (g.events) g.events.push('mamie_done', g.player ? g.player.x : 0, g.player ? g.player.y : 0, reward.coins, index);
  return { def, reward };
}

/**
 * Où se trouve la chose demandée (pour la visite de Moka) : étagère, caisse, producteur, emplacement… ou null.
 * @param {any} g
 * @param {any} def
 * @returns {{ x: number, y: number } | null}
 */
export function mamieTarget(g, def) {
  const furn = g.furn || [];
  const c = (f) => (f ? { x: f.cx, y: f.cy } : null);
  const pad = g.day && g.day.pad;
  switch (def.kind) {
    case 'shelfFill':
      return c(furn.find((f) => f.def.day.kind === 'shelf' && (f.product === def.product || !f.product)));
    case 'cashier':
    case 'clerks':
      if (g.day && g.day.hirePad) return { x: g.day.hirePad.x + 0.5, y: g.day.hirePad.y + 0.5 };
      return c(g.register);
    case 'served':
    case 'dayTakings':
      return c(g.register);
    case 'owned':
      if (pad && pad.furniture === def.furniture) return { x: pad.x + 0.5, y: pad.y + 0.5 };
      return c(furn.find((f) => f.id === def.furniture));
    case 'soldBy':
      return c(furn.find((f) => f.def.day.kind === 'producer' && (!def.product || f.def.day.product === def.product)));
    case 'level':
      return c(furn.find((f) => f.id === def.furniture));
    default:
      return null;
  }
}
