// Fort Boutique — ce que rapporte une amélioration, en chiffres et sans texte (P1, Hugo) : « ⚔ 6 → 7 · ♥ 60 → 69 ».
import { h } from './widgets.js';
import { FURNITURE } from '../data/furniture.js';
import { nightStats, dayStats } from '../game/stats.js';

const round1 = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));

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
  if (a.dmg > 0) out.push({ key: 'dmg', from: round1(a.dmg), to: round1(b.dmg) });
  else if (a.dps > 0) out.push({ key: 'dps', from: round1(a.dps), to: round1(b.dps) });
  if (a.hp > 0) out.push({ key: 'hp', from: round1(a.hp), to: round1(b.hp) });
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
