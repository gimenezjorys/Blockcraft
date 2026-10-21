// Fort Boutique — scène de démonstration du moteur (M1) : un rond piloté au joystick.
// Remplacée par la boutique en M3 ; conservée pour les tests d'entrées.
import { drawJoystick } from './hud.js';

const SPEED = 3 * 48; // 3 cases/s (G6.3), en pixels logiques

/**
 * @param {import('../ui/app.js').default} app
 */
export function createDemoScene(app) {
  const ball = { x: 180, y: 380 };
  let bells = 0;
  const bell = { x: 312, y: 592, r: 32 };
  return {
    joystick: true,
    update(dt) {
      ball.x = Math.max(16, Math.min(344, ball.x + app.input.move.x * SPEED * dt));
      ball.y = Math.max(96, Math.min(624, ball.y + app.input.move.y * SPEED * dt));
    },
    hitTest(x, y) {
      return Math.hypot(x - bell.x, y - bell.y) <= bell.r + 6 ? 'bell' : null;
    },
    onButton(id, phase) {
      if (id === 'bell' && phase === 'down') bells++;
    },
    render(ctx) {
      ctx.fillStyle = '#2E4B44';
      ctx.fillRect(0, 0, 360, 640);
      ctx.strokeStyle = 'rgba(242,246,238,0.12)';
      ctx.lineWidth = 1;
      for (let x = 12; x < 360; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 80);
        ctx.lineTo(x, 640);
        ctx.stroke();
      }
      ctx.fillStyle = '#2B1A33';
      ctx.beginPath();
      ctx.ellipse(ball.x, ball.y + 14, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFD23F';
      ctx.strokeStyle = '#2B1A33';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFD23F';
      ctx.beginPath();
      ctx.arc(bell.x, bell.y, bell.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawJoystick(ctx, app.input.joystick);
    },
    snapshot() {
      return { ball: { x: ball.x, y: ball.y }, bells };
    },
  };
}
