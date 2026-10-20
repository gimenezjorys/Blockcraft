// Fort Boutique — machine à états des phases (G5.1). Jour (M4) ; nuit (M5) ; cycle complet (M6).
import { stepPlayer, playerSpeed } from './player.js';
import { stepDay, endDay, CLOSING_S } from './day/day.js';

/**
 * Un pas de simulation.
 * @param {any} g partie
 * @param {number} dt secondes
 */
export function stepGame(g, dt) {
  g.t += dt;
  g.phase.t += dt;
  const name = g.phase.name;
  const walking = name === 'free' || name === 'day' || name === 'closing' || name === 'night';
  if (walking) {
    const p = g.player;
    stepPlayer(p, g.input.x, g.input.y, playerSpeed(g.save.player.upgrades.shoes), dt, g.grid.w, g.grid.h, g.solid);
  }
  if (name === 'day' || name === 'closing') {
    stepDay(g, dt);
    if (g.phase.name === 'closing' && g.phase.t >= CLOSING_S) {
      g.dayResult = endDay(g);
      g.phase = { name: 'dayEnd', t: 0 };
      g.events.push('day_end');
    }
  }
}
