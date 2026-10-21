// Fort Boutique — Garde-robe (G17) : acheter avec des rubis (jamais perdu : `purchases.cosmetics` et `cosmetics.owned`),
// porter. Les objets de saison ne s'achètent que pendant leur saison ; les objets gagnés (événement, calendrier, semaine,
// Coffre de Lune, franchise) ne s'achètent jamais.
import { COSMETICS } from '../data/cosmetics.js';
import { now } from '../core/time.js';
import { isUnlocked } from './progression.js';
import { currentSeason } from './weekly-events.js';

/** Possédé ? (les objets de base le sont toujours) */
export function ownsCosmetic(save, id) {
  return COSMETICS[id] ? COSMETICS[id].price === 0 || save.cosmetics.owned.includes(id) : false;
}

/** État d'un objet pour la Garde-robe. */
export function cosmeticState(save, id, t = now()) {
  const def = COSMETICS[id];
  const owned = ownsCosmetic(save, id);
  const equipped = save.cosmetics.equipped[def.cat] === id || (def.cat === 'cat' && save.cosmetics.equipped.cat === id);
  if (owned) return { owned, equipped, buyable: false, reason: null };
  if (def.price === null) return { owned, equipped: false, buyable: false, reason: def.source };
  const season = currentSeason(t);
  if (def.season && (!season || season.id !== def.season)) return { owned, equipped: false, buyable: false, reason: 'season' };
  return { owned, equipped: false, buyable: true, reason: save.player.rubies < def.price ? 'rubies' : null };
}

/** Achète un objet avec des rubis. */
export function buyCosmetic(save, id, t = now()) {
  if (!isUnlocked(save, 'wardrobe')) return false;
  const st = cosmeticState(save, id, t);
  if (!st.buyable || st.reason) return false;
  save.player.rubies -= COSMETICS[id].price;
  save.cosmetics.owned.push(id);
  save.purchases.cosmetics.push({ id, rubies: COSMETICS[id].price, at: t });
  return true;
}

/** Porte un objet possédé (Moka : un second tap l'enlève). */
export function equipCosmetic(save, id) {
  const def = COSMETICS[id];
  if (!def || !ownsCosmetic(save, id)) return false;
  const eq = save.cosmetics.equipped;
  eq[def.cat] = def.cat === 'cat' && eq.cat === id ? null : id;
  return true;
}
