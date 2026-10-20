// Aides pour les tests de logique : créer une partie, avancer le temps, déplacer le marchand.
import { createGame } from '../../src/game/state.js';
import { stepGame } from '../../src/game/phases.js';
import { defaultSave } from '../../src/save/schema.js';

export const DT = 1 / 60;

/** Partie neuve (seed fixe). */
export function newGame(seed = 11, mutate) {
  const save = defaultSave({ seed, now: 0 });
  if (mutate) mutate(save);
  return createGame({ save });
}

/**
 * Avance de `sec` secondes. `onStep(g)` peut piloter l'entrée.
 * @returns {Array<{ type: string, x: number, y: number, a: number, b: number, s: string }>} événements émis
 */
export function run(g, sec, onStep) {
  const events = [];
  const n = Math.round(sec / DT);
  for (let i = 0; i < n; i++) {
    if (onStep) onStep(g);
    stepGame(g, DT);
    for (let k = 0; k < g.events.length; k++) events.push({ ...g.events.items[k] });
    g.events.clear();
  }
  return events;
}

/** Oriente l'entrée vers (x, y) ; renvoie vrai à l'arrivée. */
export function steer(g, x, y, tol = 0.12) {
  const dx = x - g.player.x;
  const dy = y - g.player.y;
  const l = Math.hypot(dx, dy);
  if (l < tol) {
    g.input.x = 0;
    g.input.y = 0;
    return true;
  }
  g.input.x = dx / l;
  g.input.y = dy / l;
  return false;
}

/** Téléporte le marchand (tests ciblés). */
export function teleport(g, x, y) {
  g.player.x = x;
  g.player.y = y;
  g.input.x = 0;
  g.input.y = 0;
}

export const count = (events, type) => events.filter((e) => e.type === type).length;
