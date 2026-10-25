// Fort Boutique — boutique automatisée et pilote automatique (v1.1, V5.3), et vitesse du temps (V6). Logique pure.
// Pilote automatique : la journée tourne toute seule (le personnel fait tout) ; sans geste du joueur depuis 1 s, le
// marchand retourne à la caisse et y reste en souriant. « Passer la journée » simule le reste exactement comme un
// jeu sans intervention (mêmes pas fixes, plusieurs par image), en 1,5 s.
import { AUTOPILOT, SPEED } from '../data/merchant.js';
import { isAutomated } from './staff.js';
import { bfs, nextStep } from './pathfinding.js';
import { distToFurniture } from './state.js';

/** Le pilote automatique est-il proposé ? (boutique automatisée, partie normale) */
export function autopilotAvailable(g) {
  return !!g && !g.challenge && !g.endlessRun && !!g.shop && isAutomated(g.shop);
}

/** Le pilote automatique est-il en marche ? */
export function autopilotOn(g) {
  return autopilotAvailable(g) && !!g.shop.autopilot;
}

/** Interrupteur du HUD. */
export function toggleAutopilot(g) {
  if (!autopilotAvailable(g)) return false;
  g.shop.autopilot = !g.shop.autopilot;
  return true;
}

/** Case où le marchand attend, à côté de la caisse (pas celle de la file). */
function merchantSpot(g) {
  const reg = g.register;
  if (!reg) return -1;
  const { w, h, occ } = g.grid;
  const d = g.day;
  let best = -1;
  let bestK = -1e9;
  for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
    const x = reg.x + dx;
    const y = reg.y + dy;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = y * w + x;
    if (occ[i] >= 0) continue;
    // Pas la case de la file ni celle de la porte ; plutôt au-dessus de la caisse.
    let k = dy < 0 ? 3 : dx !== 0 ? 2 : 1;
    if (d && i === d.queueCell) k -= 5;
    if (x === g.grid.door.x && y === g.grid.door.y) k -= 5;
    if (k > bestK) {
      bestK = k;
      best = i;
    }
  }
  return best;
}

/**
 * Un pas du pilote automatique, avant la simulation : écrit la direction du marchand dans g.input s'il n'y a pas
 * de geste. Compte aussi le temps passé en pilote automatique (Objectif de Mamie).
 * @param {any} g
 * @param {number} dt
 * @param {boolean} touching le joueur dirige le marchand
 */
export function stepAutopilot(g, dt, touching) {
  const d = g.day;
  const name = g.phase.name;
  if (!d || (name !== 'day' && name !== 'closing')) return;
  if (!autopilotOn(g)) {
    d.autoIdle = 0;
    return;
  }
  d.autoT = (d.autoT || 0) + dt;
  if (touching) {
    d.autoIdle = 0;
    return;
  }
  d.autoIdle = (d.autoIdle || 0) + dt;
  if (d.autoIdle < AUTOPILOT.idleS) return;
  const target = merchantSpot(g);
  if (target < 0) return;
  const { w, h, occ } = g.grid;
  const key = `${target}:${g.layoutVersion || 0}`;
  if (!d.autoField || d.autoKey !== key) {
    d.autoField = bfs(w, h, [target], (i) => occ[i] < 0, d.autoField);
    d.autoKey = key;
  }
  const p = g.player;
  const cx = Math.max(0, Math.min(w - 1, Math.floor(p.x)));
  const cy = Math.max(0, Math.min(h - 1, Math.floor(p.y)));
  const here = cy * w + cx;
  let tx;
  let ty;
  if (here === target || d.autoField[here] <= 0) {
    tx = (target % w) + 0.5;
    ty = ((target / w) | 0) + 0.5;
  } else {
    const nx = nextStep(d.autoField, w, h, here);
    if (nx < 0) return;
    tx = (nx % w) + 0.5;
    ty = ((nx / w) | 0) + 0.5;
  }
  const dx = tx - p.x;
  const dy = ty - p.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.12) {
    g.input.x = 0;
    g.input.y = 0;
    p.smile = g.register && distToFurniture(g.register, p.x, p.y) < 1;
    return;
  }
  g.input.x = dx / len;
  g.input.y = dy / len;
}

/** « Passer la journée » est-il possible maintenant ? */
export function canSkipDay(g) {
  return autopilotOn(g) && !g.skip && (g.phase.name === 'day' || g.phase.name === 'closing') && !!g.day;
}

/**
 * Lance « Passer la journée » : le reste du jour sera simulé en `skipS` secondes (plusieurs pas par image).
 * @param {any} g
 * @param {number} step pas fixe de la boucle (s)
 */
export function startSkipDay(g, step) {
  if (!canSkipDay(g)) return false;
  const d = g.day;
  const left = Math.max(0, d.timeLeft) + 8;
  g.skip = { perFrame: Math.max(2, Math.ceil(left / step / (AUTOPILOT.skipS / step))), coins0: g.save.player.coins };
  d.skipped = true;
  return true;
}

/** Fin de journée : l'Objectif de Mamie « journée en pilote automatique » (la moitié du jour au moins, ou passée). */
export function noteAutopilotDay(g) {
  const d = g.day;
  if (!d || g.challenge || g.endlessRun) return;
  if (d.skipped || (g.shop.autopilot && (d.autoT || 0) >= AUTOPILOT.dayShare * d.duration)) {
    g.save.progress.flags.autopilotDay = true;
  }
}

/** Vitesse la plus haute débloquée (V6) : ×2 dès le jour 2, ×3 dès le jour 4 ou une boutique automatisée. */
export function maxSpeed(g, night) {
  const day = g.shop ? g.shop.day : 1;
  if (night) return day >= SPEED.x2Day ? 2 : 1;
  if (day >= SPEED.x3Day || (g.shop && isAutomated(g.shop))) return 3;
  return day >= SPEED.x2Day ? 2 : 1;
}

/** Vitesse actuelle (nombre de pas de simulation par pas de la boucle). */
export function currentSpeed(g) {
  const name = g.phase.name;
  const night = name === 'night';
  if (!night && name !== 'day' && name !== 'closing') return 1;
  const s = g.save.settings;
  const want = night ? s.nightSpeed : s.daySpeed;
  return Math.max(1, Math.min(maxSpeed(g, night), Number.isFinite(want) ? want | 0 : 1));
}

/** Tap sur le bouton de vitesse : ×1 → ×2 → ×3 → ×1 (×1 → ×2 la nuit). */
export function cycleSpeed(g) {
  const night = g.phase.name === 'night';
  const max = maxSpeed(g, night);
  if (max <= 1) return 1;
  const cur = currentSpeed(g);
  const next = cur >= max ? 1 : cur + 1;
  if (night) g.save.settings.nightSpeed = next;
  else g.save.settings.daySpeed = next;
  return next;
}

/** Image trop lente : on redescend d'un cran (V6). */
export function stepDownSpeed(g) {
  const night = g.phase.name === 'night';
  const cur = currentSpeed(g);
  if (cur <= 1) return false;
  if (night) g.save.settings.nightSpeed = cur - 1;
  else g.save.settings.daySpeed = cur - 1;
  return true;
}
