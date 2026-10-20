// Fort Boutique — machine à états des phases (G5.1). Complétée en M4 (jour), M5 (nuit), M6 (cycle).
import { stepPlayer, playerSpeed } from './player.js';

/**
 * Un pas de simulation.
 * @param {any} g partie
 * @param {number} dt secondes
 */
export function stepGame(g, dt) {
  g.t += dt;
  g.phase.t += dt;
  const walking = g.phase.name === 'free' || g.phase.name === 'day' || g.phase.name === 'closing' || g.phase.name === 'night';
  if (walking) {
    const p = g.player;
    stepPlayer(p, g.input.x, g.input.y, playerSpeed(g.save.player.upgrades.shoes), dt, g.grid.w, g.grid.h, g.solid);
  }
}
