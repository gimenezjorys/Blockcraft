// Fort Boutique — objectif toujours visible (G3.5) : un seul objectif, avec icône et barre de progression.
// Priorités : 1) emplacement d'achat ; 2) amélioration prête ; 3) quête presque finie ; 4) prochain déblocage ;
// 5) Pleine Lune. Logique pure : l'interface (étiquette kraft) ne fait que l'afficher.
import { canUpgrade } from './economy.js';
import { unlockedFurniture, nextUnlock, levelProgress } from './progression.js';
import { UNLOCK_CARD_ORDER } from '../data/unlocks.js';
import { FURNITURE } from '../data/furniture.js';

/**
 * Premier emplacement d'achat pas encore construit, s'il peut apparaître aujourd'hui.
 * La condition « première vente » ne le cache pas : dès 0:06, l'étiquette montre ce que rapportent 40 pièces (G19).
 * @param {any} g
 */
function pendingPad(g) {
  const pads = g.district.pads || [];
  const done = g.shop.pads.done;
  const p = pads.find((x) => !done.includes(x.id));
  if (!p) return null;
  const w = p.when || {};
  if (w.minDay && g.shop.day < w.minDay) return null;
  if (w.minLevel && g.save.player.level < w.minLevel) return null;
  return p;
}

/** Quêtes du jour (M12) : la plus avancée, si elle atteint 80 % sans être réclamée. */
function nearQuest(save) {
  const list = (save.daily && save.daily.quests && save.daily.quests.list) || [];
  let best = null;
  for (const q of list) {
    if (!q || q.claimed || !(q.goal > 0)) continue;
    const k = Math.min(1, (q.progress || 0) / q.goal);
    if (k >= 0.8 && k < 1 && (!best || k > best.progress)) best = { id: q.id, progress: k };
  }
  return best;
}

/**
 * Objectif à montrer maintenant.
 * @param {any} g partie (src/game/state.js)
 * @returns {{ kind: 'pad', id: string, furniture: string, remaining: number, progress: number, onFloor: boolean, cell: { x: number, y: number } | null }
 *   | { kind: 'upgrade', furniture: string, progress: number }
 *   | { kind: 'quest', id: string, progress: number }
 *   | { kind: 'unlock', level: number, furniture: string | null, feature: string | null, progress: number }
 *   | { kind: 'moon', nights: number, progress: number }}
 */
export function nextObjective(g) {
  const save = g.save;
  const coins = save.player.coins;
  // 1) Emplacement d'achat : celui qui est au sol, sinon le prochain de la liste.
  const live = g.day && g.day.pad;
  const def = live ? null : pendingPad(g);
  if (live || def) {
    const id = live ? live.id : def.id;
    const price = live ? live.price : def.price;
    const paid = live ? live.paid : Math.max(0, Math.min(price, g.shop.pads.paid[id] || 0));
    const remaining = Math.max(0, price - paid);
    return {
      kind: 'pad',
      id,
      furniture: live ? live.furniture : def.furniture,
      remaining,
      progress: price > 0 ? Math.min(1, (paid + coins) / price) : 1,
      onFloor: !!live,
      cell: live ? { x: live.x, y: live.y } : null,
    };
  }
  // 2) Amélioration prête (plans et pièces suffisants : la flèche verte s'allume).
  const up = unlockedFurniture(save).find((id) => canUpgrade(save, id).ok);
  if (up) return { kind: 'upgrade', furniture: up, progress: 1 };
  // 3) Quête presque finie.
  const q = nearQuest(save);
  if (q) return { kind: 'quest', id: q.id, progress: q.progress };
  // 4) Prochain déblocage (niveau N+1, ou le suivant qui apporte quelque chose), en silhouette.
  // Un meuble qui apporte un nouveau produit passe avant les meubles génériques (G19 3:02 : le Frigo se révèle).
  const u = nextUnlock(save);
  if (u) {
    const furniture = u.furniture.find((id) => !FURNITURE[id].generic) || u.furniture[0] || null;
    const feature = furniture ? null : UNLOCK_CARD_ORDER.find((k) => u.features.includes(k)) || u.features[0] || null;
    return { kind: 'unlock', level: u.level, furniture, feature, progress: u.level === save.player.level + 1 ? levelProgress(save.player) : 0 };
  }
  // 5) Pleine Lune dans X nuits.
  const k = g.shop.night;
  return { kind: 'moon', nights: Math.max(1, 8 - k), progress: Math.min(1, (k - 1) / 7) };
}

/**
 * Clé de rendu : l'étiquette n'est redessinée que si l'objectif change (pas à chaque image).
 * @param {ReturnType<typeof nextObjective>} o
 */
export function objectiveKey(o) {
  const p = Math.round(o.progress * 50);
  switch (o.kind) {
    case 'pad':
      return `pad:${o.id}:${o.remaining}:${p}:${o.onFloor ? 1 : 0}`;
    case 'upgrade':
      return `up:${o.furniture}`;
    case 'quest':
      return `q:${o.id}:${p}`;
    case 'unlock':
      return `un:${o.level}:${o.furniture || o.feature}:${p}`;
    default:
      return `moon:${o.nights}`;
  }
}
