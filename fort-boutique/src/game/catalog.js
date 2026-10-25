// Fort Boutique — catalogue (G9.1, G20.8) : acheter puis placer. Prix × 1,6 par exemplaire, plafond par boutique,
// producteurs uniquement dans la boutique de leur quartier.
import { FURNITURE, FURNITURE_IDS, footprint } from '../data/furniture.js';
import { buyPrice, ownedCount } from './economy.js';
import { districtOpen } from './progression.js';
import { validateLayout, gridSize, districtEntrances, occupancy, registerAccessCells } from './shop.js';
import { bfs } from './pathfinding.js';
import { nextSlotSpot, syncSlots } from './plans.js';

/**
 * Meubles proposés dans le catalogue d'une boutique (dans l'ordre d'affichage).
 * @param {string} shopId
 * @returns {string[]}
 */
export function catalogIds(shopId) {
  return FURNITURE_IDS.filter((id) => {
    const f = FURNITURE[id];
    if (f.unique) return false;
    return f.generic || f.district === shopId;
  }).sort((a, b) => FURNITURE[a].unlockLevel - FURNITURE[b].unlockLevel || FURNITURE[a].price - FURNITURE[b].price);
}

/**
 * Peut-on acheter ce meuble ici ?
 * @param {any} save
 * @param {string} shopId
 * @param {string} id
 * @returns {{ ok: boolean, reason?: 'unknown' | 'level' | 'district' | 'max' | 'coins', price: number, owned: number, max: number }}
 */
export function canBuy(save, shopId, id) {
  const f = FURNITURE[id];
  const shop = save.shops[shopId];
  if (!f || !shop || f.unique) return { ok: false, reason: 'unknown', price: 0, owned: 0, max: 0 };
  const price = buyPrice(shop, id);
  const owned = ownedCount(shop, id);
  const base = { price, owned, max: f.max };
  if (!f.generic && f.district !== shopId) return { ok: false, reason: 'district', ...base };
  if (save.player.level < f.unlockLevel) return { ok: false, reason: 'level', ...base };
  if (f.district !== 'q1' && !districtOpen(save, f.district)) return { ok: false, reason: 'district', ...base };
  if (owned >= f.max) return { ok: false, reason: 'max', ...base };
  if (save.player.coins < price) return { ok: false, reason: 'coins', ...base };
  return { ok: true, ...base };
}

/**
 * Achète un meuble : il part dans la Réserve de la boutique.
 * @returns {boolean}
 */
export function buyFurniture(save, shopId, id) {
  const c = canBuy(save, shopId, id);
  if (!c.ok) return false;
  save.player.coins -= c.price;
  save.shops[shopId].storage.push(id);
  if (!save.furniture[id]) save.furniture[id] = { level: 1, plans: 0 };
  save.stats.bought = (save.stats.bought || 0) + 1;
  return true;
}

/**
 * Longueurs des trajets d'une disposition : moyenne des Grignotins (entrées au sol -> caisse)
 * et des clients (porte -> cases d'accès des meubles).
 * @returns {{ monsters: number, customers: number }}
 */
export function pathLengths(districtId, expansion, layout) {
  const [w, h] = gridSize(expansion);
  const { occ } = occupancy(w, h, layout);
  const free = (i) => occ[i] < 0;
  const reg = layout.find((it) => it.id === 'caisse');
  let monsters = 0;
  let mCount = 0;
  if (reg) {
    const toReg = bfs(w, h, registerAccessCells(w, h, reg, occ), free);
    for (const e of districtEntrances(districtId, w, h)) {
      if (!e.ground) continue;
      const d = toReg[e.y * w + e.x];
      if (d >= 0) {
        monsters += d;
        mCount++;
      }
    }
  }
  const door = { x: 2, y: h - 1 };
  const fromDoor = bfs(w, h, [door.y * w + door.x], free);
  let customers = 0;
  let cCount = 0;
  layout.forEach((it) => {
    const f = FURNITURE[it.id];
    if (!f || !f.access || it.id === 'caisse') return;
    const [fw, fh] = footprint(f, it.rot || 0);
    let best = 1e9;
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        for (const [ox, oy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const x = it.x + dx + ox;
          const y = it.y + dy + oy;
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const d = fromDoor[y * w + x];
          if (d >= 0 && d < best) best = d;
        }
      }
    }
    if (best < 1e9) {
      customers += best;
      cCount++;
    }
  });
  return { monsters: mCount ? monsters / mCount : 0, customers: cCount ? customers / cCount : 0 };
}

/**
 * Trouve une place valide pour un meuble : le plus long trajet des Grignotins,
 * sans allonger celui des clients de plus de 30 % (règle du Conseil de Mamie, G6.5).
 * @returns {{ x: number, y: number, rot: number } | null}
 */
export function findPlacement(districtId, expansion, layout, id) {
  const [w, h] = gridSize(expansion);
  const f = FURNITURE[id];
  const base = pathLengths(districtId, expansion, layout);
  let best = null;
  let bestScore = -1e9;
  const rots = f.size[0] !== f.size[1] ? [0, 1] : [0];
  for (const rot of rots) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const item = { id, x, y, rot };
        const next = layout.concat([item]);
        if (!validateLayout(districtId, expansion, next).ok) continue;
        const L = pathLengths(districtId, expansion, next);
        if (base.customers > 0 && L.customers > base.customers * 1.3 + 1e-9) continue;
        const centerBias = -Math.abs(x + 0.5 - w / 2) * 0.01 - Math.abs(y + 0.5 - h / 2) * 0.01;
        const score = L.monsters - L.customers * 0.3 + centerBias;
        if (score > bestScore) {
          bestScore = score;
          best = { x, y, rot };
        }
      }
    }
  }
  return best;
}

/**
 * Pose un meuble de la Réserve dans le prochain emplacement prévu de son type (s'il y en a un).
 * @returns {{ x: number, y: number, rot: number } | null}
 */
export function autoPlaceFromStorage(save, shopId, id) {
  const shop = save.shops[shopId];
  const i = shop.storage.indexOf(id);
  if (i < 0) return null;
  // v1.1 (V3) : le premier emplacement libre de son type, dans l'ordre du plan ; sinon il reste dans la Réserve.
  const spot = nextSlotSpot(shopId, shop, id);
  if (!spot) return null;
  shop.storage.splice(i, 1);
  shop.layout.push({ id, x: spot.x, y: spot.y, rot: spot.rot });
  syncSlots(shopId, shop);
  return spot;
}
