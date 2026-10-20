// Fort Boutique — scène de jeu : relie la partie (logique), le rendu, le HUD et les entrées.
import { stepGame } from '../game/phases.js';
import { createRenderer } from '../render/renderer.js';
import { drawJoystick } from '../render/hud.js';

/**
 * @param {any} app
 * @param {any} g partie (src/game/state.js)
 */
export function createPlay(app, g) {
  const renderer = createRenderer({
    makeCanvas: (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    },
    pixelScale: () => app.viewport().scale * Math.min(2, window.devicePixelRatio || 1),
  });
  return {
    joystick: true,
    game: g,
    renderer,
    update(dt) {
      g.input.x = app.input.move.x;
      g.input.y = app.input.move.y;
      stepGame(g, dt);
      g.events.clear();
    },
    render(ctx) {
      renderer.draw(ctx, g, { night: g.phase.name === 'night' });
      drawJoystick(ctx, app.input.joystick);
    },
    snapshot() {
      return {
        phase: g.phase.name,
        player: { x: g.player.x, y: g.player.y, stack: g.player.stack.slice() },
        grid: { w: g.grid.w, h: g.grid.h, origin: g.grid.origin },
        furniture: g.furn.map((f) => ({ id: f.id, x: f.x, y: f.y, w: f.w, h: f.h })),
      };
    },
  };
}
