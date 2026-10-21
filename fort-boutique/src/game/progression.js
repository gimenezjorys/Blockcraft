// Fort Boutique — XP, niveau de marchand et déblocages (G12.3, G12.4). Complété en M7.
import { xpToNext, MAX_LEVEL } from '../data/xp.js';
import { DISTRICT_FACTORS } from '../data/balance.js';
import { FEATURE_LEVELS } from '../data/unlocks.js';
import { DISTRICTS } from '../data/districts.js';
import { FURNITURE, FURNITURE_IDS } from '../data/furniture.js';

/**
 * Ajoute de l'XP (déjà multipliée par X_Q si besoin) et fait monter de niveau.
 * @param {any} g partie (ou { save, events })
 * @param {number} amount
 * @returns {number} nombre de niveaux gagnés
 */
export function addXp(g, amount) {
  const p = g.save.player;
  if (!(amount > 0)) return 0;
  p.xp += amount;
  // Pendant le jour et la nuit, l'XP s'additionne mais le niveau attend l'aube (G12.3 « niveaux 2, 3 et 4 atteints à
  // l'aube », G19 : ruban à 2:57 et 6:30). Les niveaux en fin de cycle ne changent pas (DECISIONS.md, M11).
  if (g.phase && LEVEL_WAITS.has(g.phase.name)) {
    p.xp = Math.round(p.xp * 100) / 100;
    return 0;
  }
  return applyLevelUps(g);
}

/** Phases où le passage de niveau attend l'aube. */
const LEVEL_WAITS = new Set(['day', 'closing', 'dusk', 'night']);

/**
 * Applique les passages de niveau dus à l'XP accumulée (à l'aube, au Matin, ou tout de suite hors du jeu).
 * @param {any} g
 * @returns {number} nombre de niveaux gagnés
 */
export function applyLevelUps(g) {
  const p = g.save.player;
  let gained = 0;
  while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level++;
    gained++;
    if (g.save.progress && Array.isArray(g.save.progress.pendingUnlocks)) g.save.progress.pendingUnlocks.push(p.level);
    if (g.events) g.events.push('level_up', 0, 0, p.level);
  }
  if (p.level >= MAX_LEVEL) p.xp = Math.min(p.xp, 0);
  p.xp = Math.round(p.xp * 100) / 100;
  return gained;
}

/**
 * Niveau que donnera l'XP déjà gagnée (le passage se fête à l'aube) : sert aux conditions de jeu prises pendant la
 * journée, comme l'emplacement du Frigo (« niveau 2 »), pour qu'un passage en attente ne bloque jamais rien (P2, Hugo).
 * @param {{ level: number, xp: number }} player
 */
export function projectedLevel(player) {
  return projectedPlayer(player).level;
}

/** Niveau et XP restante une fois les passages en attente appliqués (sans rien modifier). */
export function projectedPlayer(player) {
  let level = player.level;
  let xp = player.xp;
  while (level < MAX_LEVEL && xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level++;
  }
  return { level, xp };
}

/** Multiplicateur d'XP du quartier (X_Q). */
export function xpFactor(shopId) {
  return DISTRICT_FACTORS.xp[shopId] || 1;
}

/** Progression vers le niveau suivant (0 à 1). */
export function levelProgress(player) {
  const need = xpToNext(player.level);
  return Number.isFinite(need) ? Math.min(1, player.xp / need) : 1;
}

/**
 * Une fonction du jeu est-elle débloquée ? (G12.4)
 * @param {any} save
 * @param {string} feature clé de data/unlocks.js
 */
export function isUnlocked(save, feature) {
  const lvl = FEATURE_LEVELS[feature];
  return lvl === undefined ? true : save.player.level >= lvl;
}

/** Le quartier est-il ouvert ? (boss précédent vaincu ET niveau requis, G12.4) */
export function districtOpen(save, id) {
  const d = DISTRICTS[id];
  if (!d) return false;
  if (!d.previousBoss) return true;
  const prev = save.shops[d.previousBoss];
  return !!prev && prev.bossBeatenCount > 0 && save.player.level >= d.requiredLevel;
}

/**
 * Meubles débloqués : niveau atteint et quartier du meuble ouvert.
 * @param {any} save
 * @returns {string[]}
 */
export function unlockedFurniture(save) {
  return FURNITURE_IDS.filter((id) => {
    const f = FURNITURE[id];
    return save.player.level >= f.unlockLevel && (f.district === 'q1' || districtOpen(save, f.district));
  });
}

/** Déblocages obtenus en passant au niveau `level` (fonctions et meubles). */
export function unlocksAtLevel(level) {
  const features = Object.entries(FEATURE_LEVELS).filter(([, l]) => l === level).map(([k]) => k);
  const furniture = FURNITURE_IDS.filter((id) => FURNITURE[id].unlockLevel === level && id !== 'caisse');
  return { features, furniture };
}

/** Prochain déblocage (niveau N+1 ou plus), pour l'objectif « silhouette » (G3.5). */
export function nextUnlock(save, fromLevel = save.player.level) {
  for (let l = fromLevel + 1; l <= 40; l++) {
    const u = unlocksAtLevel(l);
    if (u.features.length || u.furniture.length) return { level: l, ...u };
  }
  return null;
}
