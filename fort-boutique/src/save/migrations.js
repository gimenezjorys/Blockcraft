// Fort Boutique — registre des migrations { n: vN -> vN+1 } (B9).
// Chaque migration est pure, conserve tous les champs inconnus et ne retire jamais
// progression, monnaies, cosmétiques ni achats.
import { CURRENT_VERSION, cloneJson } from './schema.js';

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

/** @type {Record<number, (save: any) => any>} */
export const MIGRATIONS = {
  0: v0toV1,
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
