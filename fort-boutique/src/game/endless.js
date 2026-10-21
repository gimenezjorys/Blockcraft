// Fort Boutique — Nuit sans fin (G13.2, niveau 16) : la disposition et les meubles d'une boutique, des vagues sans fin
// (budget 6 × 1,12^(i − 1) × F_Q, PV × 1,08^(i − 1) en plus du quartier), types du quartier et des précédents. Le Bocal
// vaut 1 000 points, chaque vol en retire, la partie s'arrête à 0. Score = vagues tenues. Un coffre en bois toutes les
// 5 vagues (3 par jour). Rivaux simulés de la semaine (toujours étiquetés comme tels). Joué sur une copie de la partie.
import { ENDLESS, DISTRICT_FACTORS } from '../data/balance.js';
import { DISTRICTS, DISTRICT_IDS } from '../data/districts.js';
import { MONSTERS } from '../data/monsters.js';
import { Rng, seedFrom } from '../core/rng.js';
import { now, utcDay, utcWeek } from '../core/time.js';
import { cloneJson } from '../save/schema.js';
import { createGame } from './state.js';
import { fillBudget } from './night/waves.js';
import { startNight } from './night/night.js';
import { isUnlocked } from './progression.js';
import { grantReward } from './rewards.js';

/** Types de Grignotins : ceux du quartier et des quartiers précédents. */
export function endlessTypes(shopId) {
  const upto = DISTRICT_IDS.slice(0, DISTRICT_IDS.indexOf(shopId) + 1);
  const set = new Set();
  for (const id of upto) for (const t of Object.keys(DISTRICTS[id].weights || {})) if (MONSTERS[t] && !MONSTERS[t].child) set.add(t);
  return [...set];
}

/** Vague i (à partir de 1). */
export function endlessWave(seed, shopId, i, entrances) {
  const rng = new Rng(seedFrom(seed, 'sans fin', shopId, i));
  const types = endlessTypes(shopId);
  const weights = Object.fromEntries(types.map((t) => [t, 1]));
  const budget = ENDLESS.budgetBase * ENDLESS.budgetGrowth ** (i - 1) * DISTRICT_FACTORS.threat[shopId];
  const groups = [];
  fillBudget(rng, budget, types, weights, entrances, groups);
  return { groups, boss: null };
}

/** La Nuit sans fin est-elle ouverte ? */
export function endlessOpen(save) {
  return isUnlocked(save, 'endless');
}

/**
 * Partie de la Nuit sans fin dans une boutique (copie : la vraie partie ne change pas pendant la nuit).
 * @param {any} save
 * @param {string} shopId
 */
export function createEndless(save, shopId, t = now()) {
  const s = cloneJson(save);
  s.currentShop = shopId;
  const g = createGame({ save: s });
  g.endlessRun = { shopId, seed: seedFrom(save.seed, 'sans fin', utcDay(t)) };
  return g;
}

/** La nuit commence (vague 1 ; les suivantes s'ajoutent quand une vague est tenue). */
export function startEndlessNight(g) {
  for (const f of g.furn) {
    f.eyes = 1;
    f.broken = false;
  }
  const { seed, shopId } = g.endlessRun;
  startNight(g, {
    waves: { waves: [endlessWave(seed, shopId, 1, g.grid.entrances)], golden: -1, newTypes: [] },
    jar: ENDLESS.jar,
    challenge: true,
    endless: { seed, shopId, next: nextEndlessWave },
  });
  g.night.endless.baseHp = g.night.hpMult;
}

/** Vague suivante de la Nuit sans fin (appelée par la nuit quand une vague est tenue). */
export function nextEndlessWave(g, i) {
  const n = g.night;
  n.hpMult = n.endless.baseHp * ENDLESS.hpGrowth ** (i - 1);
  return endlessWave(n.endless.seed, n.endless.shopId, i, g.grid.entrances);
}

/** Remet le compteur de coffres du jour à zéro. */
function endlessDay(save, t) {
  const e = save.endless;
  const day = utcDay(t);
  if (e.day !== day && !(e.day > day)) {
    e.day = day;
    e.chestsToday = 0;
  }
  return e;
}

/**
 * Résultat d'une Nuit sans fin : record, coffres en bois (un toutes les 5 vagues, 3 par jour).
 * @returns {{ score: number, best: number, newBest: boolean, chests: any[] }}
 */
export function recordEndless(save, score, t = now()) {
  const e = endlessDay(save, t);
  const newBest = score > e.best;
  if (newBest) e.best = score;
  const n = Math.max(0, Math.min(Math.floor(score / ENDLESS.chestEvery), ENDLESS.chestsPerDay - e.chestsToday));
  const chests = [];
  for (let k = 0; k < n; k++) chests.push(grantReward(save, { chest: 'wood' }, { seed: seedFrom(save.seed, 'sans fin coffre', utcDay(t), e.chestsToday + k) }));
  e.chestsToday += n;
  return { score, best: e.best, newBest, chests };
}

const FIRST = ['Chez', 'La Boutique', 'Au Comptoir', "L'Échoppe", 'Le Bazar', 'Aux Délices'];
const SECOND = ['Paulette', 'des Hiboux', 'de Marcel', 'du Lundi', 'des Lutins', 'de la Lune', 'Gaston', 'des Pommes', 'de Rosalie', 'du Coin'];

/**
 * Rivaux simulés de la semaine UTC (15 boutiques aux noms générés), autour de la tranche de niveau du joueur.
 * @returns {Array<{ name: string, score: number }>}
 */
export function endlessRivals(save, t = now()) {
  const band = Math.floor(save.player.level / 5);
  const rng = new Rng(seedFrom('rivaux sans fin', utcWeek(t), band));
  const mean = 4 + 3 * band;
  const out = [];
  for (let i = 0; i < ENDLESS.rivals; i++) {
    out.push({ name: `${rng.pick(FIRST)} ${rng.pick(SECOND)}`, score: Math.max(1, Math.round(rng.normal(mean, mean * 0.3))) });
  }
  return out.sort((a, b) => b.score - a.score);
}
