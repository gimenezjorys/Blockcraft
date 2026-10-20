// Fort Boutique — HUD sur le canvas (complété en M4+).

/**
 * Joystick flottant : anneau craie 2 px + pastille kraft (B6).
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../input/joystick.js').Joystick} joy
 */
export function drawJoystick(ctx, joy) {
  if (!joy.active) return;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = '#F2F6EE';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(joy.ox, joy.oy, joy.radius, 0, Math.PI * 2);
  ctx.stroke();
  const kx = joy.ox + joy.vx * joy.radius;
  const ky = joy.oy + joy.vy * joy.radius;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#DDB389';
  ctx.strokeStyle = '#2B1A33';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(kx, ky, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
