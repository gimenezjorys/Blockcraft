// Fort Boutique — ce que rapporte une amélioration, en chiffres et sans texte (P1, Hugo) : « ⚔ 6 → 7 · ♥ 60 → 69 ».
import { h } from './widgets.js';
import { FURNITURE } from '../data/furniture.js';
import { nightStats, dayStats } from '../game/stats.js';

const round1 = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));
/** Avant → après : des entiers dès 5 (G19 2:50 « dégâts 6 → 7 », P2 Hugo), une décimale en dessous ou s'ils se confondent. */
const pair = (a, b) => (a >= 5 && Math.round(a) !== Math.round(b) ? [String(Math.round(a)), String(Math.round(b))] : [round1(a), round1(b)]);

/**
 * Statistiques principales avant et après le passage au niveau suivant.
 * @param {string} id
 * @param {number} level niveau actuel
 * @returns {Array<{ key: 'dmg' | 'dps' | 'hp' | 'cap' | 'prod', from: string, to: string }>}
 */
export function upgradeDeltas(id, level) {
  const def = FURNITURE[id];
  if (!def || level >= 10) return [];
  const a = nightStats(def, level);
  const b = nightStats(def, level + 1);
  const out = [];
  const add = (key, x, y) => {
    const [from, to] = pair(x, y);
    out.push({ key, from, to });
  };
  if (a.dmg > 0) add('dmg', a.dmg, b.dmg);
  else if (a.dps > 0) add('dps', a.dps, b.dps);
  if (a.hp > 0) add('hp', a.hp, b.hp);
  const da = dayStats(def, level);
  const db = dayStats(def, level + 1);
  if (da.capacity) out.push({ key: 'cap', from: String(da.capacity), to: String(db.capacity) });
  else if (da.interval) out.push({ key: 'prod', from: round1(da.interval), to: round1(db.interval) });
  return out;
}

const GLYPH = { dmg: '⚔', dps: '⚔', hp: '♥', cap: '▦', prod: '⏱' };

/**
 * Ligne de statistiques (2 au plus pour tenir sur une carte).
 * @param {string} id
 * @param {number} level
 * @param {number} [max]
 */
export function upgradeStatsEl(id, level, max = 2) {
  const list = upgradeDeltas(id, level).slice(0, max);
  return h('div.up-stats', list.map((d) => h('span.up-stat', { 'data-stat': d.key, text: `${GLYPH[d.key]} ${d.from}→${d.to}` })));
}
