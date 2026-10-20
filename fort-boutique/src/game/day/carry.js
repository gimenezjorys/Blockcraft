// Fort Boutique — pile du marchand (G7.6) : prise à ≤ 1 case d'un producteur (6/s), dépose à ≤ 1 case
// d'une étagère du bon produit (8/s). Produits mélangés autorisés.
import { PLAYER } from '../../data/balance.js';
import { stackCapacity } from '../player.js';
import { distToFurniture } from '../state.js';
import { putOnShelf } from './shelves.js';

/** @param {any} g @param {number} dt */
export function stepCarry(g, dt) {
  const p = g.player;
  const cap = stackCapacity(g.save.player.upgrades.basket);
  // Prise.
  let nearProducer = null;
  if (p.stack.length < cap) {
    for (const f of g.furn) {
      if (f.def.day.kind !== 'producer' || f.stock <= 0) continue;
      if (distToFurniture(f, p.x, p.y) <= PLAYER.pickupRange) {
        nearProducer = f;
        break;
      }
    }
  }
  if (nearProducer) {
    p.pickT += dt;
    while (p.pickT >= 1 / PLAYER.pickupRate && nearProducer.stock > 0 && p.stack.length < cap) {
      p.pickT -= 1 / PLAYER.pickupRate;
      nearProducer.stock--;
      nearProducer.item.stock = nearProducer.stock;
      const product = nearProducer.def.day.product;
      p.stack.push(product);
      g.shop.phase.carried = p.stack.slice();
      g.events.push('pickup', p.x, p.y, p.stack.length, 0, product);
    }
  } else {
    p.pickT = Math.min(p.pickT, 1 / PLAYER.pickupRate);
  }
  // Dépose.
  let dropped = false;
  if (p.stack.length) {
    for (const f of g.furn) {
      if (f.def.day.kind !== 'shelf' || f.count >= f.capacity) continue;
      if (distToFurniture(f, p.x, p.y) > PLAYER.dropRange) continue;
      const idx = f.product ? p.stack.lastIndexOf(f.product) : p.stack.length - 1;
      if (idx < 0) continue;
      p.dropT += dt;
      dropped = true;
      while (p.dropT >= 1 / PLAYER.dropRate && f.count < f.capacity) {
        const i = f.product ? p.stack.lastIndexOf(f.product) : p.stack.length - 1;
        if (i < 0) break;
        p.dropT -= 1 / PLAYER.dropRate;
        const product = p.stack[i];
        p.stack.splice(i, 1);
        putOnShelf(f, product);
        g.shop.phase.carried = p.stack.slice();
        g.events.push('drop', f.cx, f.cy, f.count, 0, product);
      }
      break;
    }
  }
  if (!dropped) p.dropT = Math.min(p.dropT, 1 / PLAYER.dropRate);
}
