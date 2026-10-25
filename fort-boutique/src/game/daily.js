// Fort Boutique — Défi du jour (G13.3, niveau 4). Graine = jour UTC : le même défi pour tout le monde. Une boutique E1
// aux couleurs d'un quartier tiré au sort, 8 à 10 meubles imposés (niveau 5), 5 vagues fixes tirées dans tout le
// bestiaire. Seule la première tentative du jour est récompensée ; ensuite, Entraînement. Logique pure.
import { DAILY } from '../data/events.js';
import { MONSTERS } from '../data/monsters.js';
import { FURNITURE, FURNITURE_IDS } from '../data/furniture.js';
import { DISTRICT_IDS } from '../data/districts.js';
import { Rng, seedFrom } from '../core/rng.js';
import { utcDateParts } from '../core/time.js';
import { defaultShop } from '../save/schema.js';
import { findPlacement } from './catalog.js';
import { gridSize, districtEntrances } from './shop.js';
import { fillBudget } from './night/waves.js';
import { grantReward } from './rewards.js';
import { trackQuest } from './quest-track.js';

const DAY_MS = 86400000;

/** Graine du défi : le jour UTC seul (jamais la graine du joueur). */
export function dailySeed(day) {
  return seedFrom('defi du jour', day);
}

/**
 * Contenu du défi d'un jour UTC (identique pour tout le monde).
 * @param {number} day
 */
export function dailySetup(day) {
  const rng = new Rng(dailySeed(day));
  const district = DISTRICT_IDS[rng.int(DISTRICT_IDS.length)];
  const want = rng.intRange(DAILY.furnitureMin, DAILY.furnitureMax);
  const pool = rng.shuffle(FURNITURE_IDS.filter((id) => id !== 'caisse' && FURNITURE[id].night));
  const base = defaultShop(district);
  // Agrandissement E1 : une rangée de plus en haut, la caisse descend d'une case (comme expandShop).
  const layout = base.layout.filter((it) => it.id === 'caisse').map((it) => ({ ...it, y: it.y + DAILY.expansion }));
  const furniture = [];
  for (const id of pool) {
    if (furniture.length >= want) break;
    const pos = findPlacement(district, DAILY.expansion, layout, id);
    if (!pos) continue;
    layout.push({ id, ...pos });
    furniture.push(id);
  }
  // Vagues : tout le bestiaire (hors petits et Raton doré), entrées du quartier toutes ouvertes.
  const [w, h] = gridSize(DAILY.expansion);
  const active = districtEntrances(district, w, h);
  const types = Object.keys(MONSTERS).filter((t) => !MONSTERS[t].child && !MONSTERS[t].golden);
  const weights = Object.fromEntries(types.map((t) => [t, 1]));
  const waves = [];
  for (let i = 1; i <= DAILY.waves; i++) {
    const groups = [];
    fillBudget(rng, DAILY.budget * (0.7 + 0.15 * (i - 1)), types, weights, active, groups);
    waves.push({ groups, boss: null });
  }
  const monsters = [...new Set(waves.flatMap((wv) => wv.groups.map((g) => g.type)))];
  return { day, district, furniture, layout, monsters, waves: { waves, golden: -1, newTypes: [] } };
}

/** Score (G13.3) : 1 000 × Bocal gardé + 25 × voleurs rattrapés + 100 sans meuble cassé + 50 × vague sans vol. */
export function dailyScore(result) {
  const S = DAILY.score;
  return Math.round(S.jar * result.kept) + S.thief * (result.caught || 0) + (result.noneBroken ? S.noBroken : 0) + S.cleanWave * (result.cleanWaves || 0);
}

/** Rivaux simulés du jour (G13.3) : 20 scores tirés de la graine du jour. */
export function dailyRivals(day) {
  const R = DAILY.rivals;
  const rng = new Rng(seedFrom(dailySeed(day), 'rivaux'));
  const out = [];
  for (let i = 0; i < R.count; i++) out.push({ id: i, score: Math.round(Math.max(R.min, Math.min(R.max, rng.normal(R.mean, R.sd)))) });
  return out.sort((a, b) => b.score - a.score);
}

/** Rang du joueur parmi les rivaux (1 = premier). */
export function dailyRank(day, score) {
  return 1 + dailyRivals(day).filter((r) => r.score > score).length;
}

const groupDigits = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/**
 * Texte à partager (G13.3).
 * @param {{ day: number, stars: number, score: number, waves: string[] }} r waves : clean | caught | lost
 * @param {string} lang
 * @param {string} url adresse du jeu (celle de la page, donnée par l'interface : le fichier n'en contient aucune, B1)
 */
export function shareText(r, lang = 'fr', url = '') {
  const { year, month, day } = utcDateParts(r.day * DAY_MS);
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const date = lang === 'en' ? `${year}-${mm}-${dd}` : `${dd}/${mm}/${year}`;
  const title = lang === 'en' ? `Fort Boutique — Daily ${date} 🌙` : `Fort Boutique — Défi du ${date} 🌙`;
  const marks = r.waves.map((w) => (w === 'clean' ? '🟩' : w === 'caught' ? '🟨' : '🟥')).join('');
  return `${title}\n${'★'.repeat(r.stars)} ${groupDigits(r.score)} pts\n${marks}${url ? `\n${url}` : ''}`;
}

/** Aujourd'hui, la tentative est-elle encore récompensée ? (une horloge reculée n'en redonne pas) */
export function dailyFirstAttempt(save, day) {
  return save.daily.challenge.lastDay < day;
}

/**
 * Note une tentative terminée. Seule la première du jour UTC donne ★/★★ 3 rubis + coffre en bois, ★★★ 5 rubis + coffre
 * d'argent, et compte pour la série et les quêtes ; les suivantes sont de l'Entraînement.
 * @param {any} save
 * @param {number} day
 * @param {{ score: number, stars: number, waves: string[] }} r
 * @returns {{ first: boolean, reward: any, rank: number }}
 */
export function recordDaily(save, day, r) {
  const c = save.daily.challenge;
  const first = dailyFirstAttempt(save, day);
  let reward = null;
  if (first) {
    c.lastDay = day;
    c.scoreToday = r.score;
    c.starsToday = r.stars;
    c.wavesToday = r.waves.slice();
    c.history = [...(c.history || []), { day, score: r.score, stars: r.stars }].slice(-30);
    c.streak = c.lastStreakDay === day - 1 ? (c.streak || 0) + 1 : 1;
    c.lastStreakDay = day;
    reward = grantReward(save, r.stars >= 3 ? DAILY.rewards.high : DAILY.rewards.low, { seed: seedFrom(save.seed, 'defi', day) });
    trackQuest(save, 'daily');
  }
  return { first, reward, rank: dailyRank(day, first ? r.score : c.scoreToday) };
}
