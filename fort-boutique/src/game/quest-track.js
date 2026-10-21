// Fort Boutique — tirage et suivi des quêtes (G14.1, G14.2). Tirage à graine par jour UTC ; une quête impossible avec
// les déblocages actuels n'est jamais tirée. Les réclamations (récompenses) sont dans quests.js.
import { DAILY_QUESTS, WEEKLY_QUESTS, QUESTS } from '../data/quests.js';
import { FURNITURE } from '../data/furniture.js';
import { mQ, districtNumber } from '../data/balance.js';
import { Rng, seedFrom } from '../core/rng.js';
import { now, utcDay, utcWeek } from '../core/time.js';
import { isUnlocked } from './progression.js';

/** Conditions « needs » : fonction débloquée. */
const NEEDS = {
  editor: (save) => isUnlocked(save, 'editor'),
  dailyChallenge: (save) => isUnlocked(save, 'daily'),
};

/** Q : quartier le plus avancé débloqué (G14.1). */
export function questDistrict(save) {
  let q = 1;
  for (const [id, shop] of Object.entries(save.shops)) if (shop && (id === 'q1' || shop.unlocked)) q = Math.max(q, districtNumber(id));
  return q;
}

/** Produits exposés dans la boutique courante (étagères posées). */
export function exposedProducts(save) {
  const shop = save.shops[save.currentShop] || save.shops.q1;
  const set = new Set();
  for (const it of shop.layout) {
    const f = FURNITURE[it.id];
    const prod = f && f.day && f.day.kind === 'producer' ? f.day.product : null;
    if (typeof prod === 'string') set.add(prod);
  }
  return [...set].sort();
}

/** La quête peut-elle être tirée aujourd'hui ? */
function eligible(save, def) {
  if (def.needs && !(NEEDS[def.needs] && NEEDS[def.needs](save))) return false;
  const shop = save.shops[save.currentShop] || save.shops.q1;
  if (def.minDay && shop.day < def.minDay) return false;
  if (def.product && !exposedProducts(save).length) return false;
  return true;
}

/** Objectif d'une quête : base + parQ × Q (+ floor(Q/2)), × m_Q si demandé. */
export function questGoal(def, q) {
  let goal = def.base + (def.perQ || 0) * q + (def.halfQ ? Math.floor(q / 2) : 0);
  if (def.mQ) goal *= mQ(`q${q}`);
  return Math.round(goal);
}

/** Instance de quête sauvegardée. */
function instance(save, def, rng) {
  const q = questDistrict(save);
  const it = { id: def.id, kind: def.kind, goal: questGoal(def, q), progress: 0, claimed: false };
  if (def.max) it.max = true;
  if (def.product) it.product = rng.pick(exposedProducts(save));
  return it;
}

/** Les quêtes du jour qui peuvent être tirées (hors celles déjà affichées). */
export function questPool(save, exclude = []) {
  return DAILY_QUESTS.filter((def) => !exclude.includes(def.id) && eligible(save, def));
}

/**
 * Met à jour les listes pour le jour et la semaine UTC (tirage à graine, sans Math.random). Une horloge qui recule ne
 * redonne jamais de nouvelles quêtes (on garde la liste en cours).
 * @param {any} save
 * @param {number} [t]
 */
export function refreshQuests(save, t = now()) {
  const qs = save.daily.quests;
  const day = utcDay(t);
  if (isUnlocked(save, 'quests') && (qs.day < day || !qs.list.length) && !(qs.day > day)) {
    const rng = new Rng(seedFrom(save.seed, 'quetes', day));
    const pool = rng.shuffle(questPool(save).slice());
    qs.day = day;
    qs.list = pool.slice(0, QUESTS.perDay).map((def) => instance(save, def, rng));
    qs.rerollsUsed = 0;
    qs.adRerollsUsed = 0;
    qs.allClaimed = false;
  }
  const wk = save.daily.weekly;
  const week = utcWeek(t);
  if (isUnlocked(save, 'weeklyQuests') && (wk.week < week || !wk.list.length) && !(wk.week > week)) {
    wk.week = week;
    wk.list = WEEKLY_QUESTS.filter((def) => eligible(save, { ...def, needs: def.kind === 'daily' ? 'dailyChallenge' : def.needs }))
      .map((def) => ({ id: def.id, kind: def.kind, goal: def.base, progress: 0, claimed: false }));
    wk.allClaimed = false;
  }
}

/** Nouvelle quête à la place de la quête i (relance), tirée à graine. */
export function drawReplacement(save, i) {
  const qs = save.daily.quests;
  const rng = new Rng(seedFrom(save.seed, 'relance', qs.day, qs.rerollsUsed + qs.adRerollsUsed, i));
  const pool = questPool(save, qs.list.map((q) => q.id));
  if (!pool.length) return null;
  return instance(save, rng.pick(pool), rng);
}

function bump(q, kind, amount, product) {
  if (q.kind !== kind || q.claimed || q.progress >= q.goal) return;
  if (q.product && product !== q.product) return;
  q.progress = Math.min(q.goal, q.max ? Math.max(q.progress, amount) : q.progress + amount);
}

/**
 * Fait avancer les quêtes du jour et de la semaine d'un type donné.
 * @param {any} save
 * @param {string} kind serve | sell | night3 | thief | kill | upgrade | chest | daily | takings | vip | order | bell | rush | loot | move | moon | stars
 * @param {number} [amount]
 * @param {string} [product] pour « sell »
 */
export function trackQuest(save, kind, amount = 1, product) {
  if (!(amount > 0) || !save.daily) return;
  refreshQuests(save);
  for (const q of save.daily.quests.list) bump(q, kind, amount, product);
  for (const q of save.daily.weekly.list) bump(q, kind, amount, product);
}
