// Fort Boutique — traductions (B12). Toutes les chaînes vivent dans ui/strings/.
import fr from './strings/fr.js';
import en from './strings/en.js';

const TABLES = { fr, en };
let current = 'fr';

/**
 * Choisit la langue d'après navigator.language : français si « fr… »,
 * anglais pour toute autre langue déclarée, français si rien n'est déclaré.
 * @param {{ language?: string } | undefined} nav
 * @returns {'fr' | 'en'}
 */
export function detectLang(nav) {
  const l = String((nav && nav.language) || '').toLowerCase();
  if (!l || l.startsWith('fr')) return 'fr';
  return 'en';
}

/** @param {string} lang */
export function setLang(lang) {
  current = TABLES[lang] ? lang : 'fr';
}

/** @returns {'fr' | 'en'} */
export function getLang() {
  return current;
}

/**
 * Traduit une clé ; {nom} est remplacé par params.nom.
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params) {
  let s = TABLES[current][key];
  if (s === undefined) s = TABLES.fr[key];
  if (s === undefined) return key;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m));
  return s;
}

/**
 * Formate un nombre avec séparateur de milliers (espace fine en français).
 * @param {number} n
 */
export function fmt(n) {
  const v = Math.round(n);
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, current === 'fr' ? ' ' : ',');
  return v < 0 ? '−' + s : s;
}

/** Tables brutes (pour npm run check et les tests). */
export const STRING_TABLES = TABLES;
