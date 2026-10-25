// Fort Boutique — registre des migrations { n: vN -> vN+1 } (B9).
// Chaque migration est pure, conserve tous les champs inconnus et ne retire jamais
// progression, monnaies, cosmétiques ni achats.
import { CURRENT_VERSION, cloneJson } from './schema.js';
import { applyPlan } from '../game/plans.js';
import { DEFAULT_PLAN } from '../data/shop-plans.js';

/**
 * v0 -> v1 : format « plat » des prototypes (synthétique, sert à tester la chaîne de migration).
 * v0 : { version: 0, coins, rubies, kibble, level, xp, cosmetics: [...], purchases, shop: {...}, ... }
 * @param {any} s
 */
function v0toV1(s) {
  const out = cloneJson(s);
  // D'abord retirer les anciens champs plats, ensuite écrire les nouvelles structures.
  for (const k of ['coins', 'rubies', 'kibble', 'level', 'xp', 'shop', 'cosmetics', 'equipped']) delete out[k];
  out.player = Object.assign({}, out.player || {}, {
    coins: s.coins ?? 0,
    rubies: s.rubies ?? 0,
    kibble: s.kibble ?? 0,
    level: s.level ?? 1,
    xp: s.xp ?? 0,
  });
  if (s.shop && typeof s.shop === 'object') {
    out.shops = Object.assign({}, out.shops || {}, { q1: Object.assign({ unlocked: true }, s.shop) });
  }
  if (Array.isArray(s.cosmetics)) {
    out.cosmetics = { owned: s.cosmetics.slice(), equipped: s.equipped || {} };
  }
  out.version = 1;
  return out;
}

/**
 * v1 -> v2 (v1.1, V3) : le placement libre devient des emplacements prévus. Chaque boutique prend le plan par défaut
 * (l'Allée) ; ses meubles posés vont dans l'emplacement libre le plus proche de leur type ; ce qui ne tient pas va dans
 * la Réserve. Rien n'est perdu : Réserve, personnel, recettes, semaine, monnaies et tout le reste sont gardés.
 * Si le rangement donnait une disposition invalide (sauvegarde abîmée), la disposition reste telle quelle.
 * @param {any} s
 */
function v1toV2(s) {
  const out = cloneJson(s);
  const shops = out.shops && typeof out.shops === 'object' ? out.shops : {};
  for (const [id, shop] of Object.entries(shops)) {
    if (!shop || typeof shop !== 'object' || !Array.isArray(shop.layout)) continue;
    if (!Array.isArray(shop.storage)) shop.storage = [];
    if (!Number.isInteger(shop.expansion)) shop.expansion = 0;
    shop.autopilot = false;
    shop.slots = {};
    shop.layout = shop.layout.filter((it) => it && typeof it.id === 'string');
    if (!applyPlan(id, shop, DEFAULT_PLAN, { nearest: true, fromStorage: false })) shop.plan = DEFAULT_PLAN;
  }
  out.version = 2;
  return out;
}

/** @type {Record<number, (save: any) => any>} */
export const MIGRATIONS = {
  0: v0toV1,
  1: v1toV2,
};

/**
 * Migre une sauvegarde jusqu'à la version courante.
 * @param {any} data
 * @returns {{ data: any, from: number, to: number }}
 */
export function migrate(data) {
  let v = Number.isInteger(data && data.version) ? data.version : 0;
  const from = v;
  if (v > CURRENT_VERSION) throw new Error(`sauvegarde d'une version future (${v})`);
  let cur = data;
  while (v < CURRENT_VERSION) {
    const fn = MIGRATIONS[v];
    if (!fn) throw new Error(`migration manquante v${v}`);
    cur = fn(cur);
    v = cur.version;
  }
  return { data: cur, from, to: v };
}
