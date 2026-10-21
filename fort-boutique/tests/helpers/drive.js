// Pilotage du jeu construit avec de VRAIS événements tactiles (joystick), en lisant l'état par __FB_TEST__.

/**
 * Marche vers (x, y) en cases avec un doigt sur le joystick.
 * @param {ReturnType<import('./dom.js').loadGame>} g
 * @param {number} x
 * @param {number} y
 * @param {{ tol?: number, maxMs?: number, id?: number }} [o]
 * @returns {boolean} arrivé
 */
export function walkTo(g, x, y, o = {}) {
  const tol = o.tol ?? 0.2;
  const maxMs = o.maxMs ?? 8000;
  const id = o.id ?? 31;
  const canvas = g.$('#game');
  const ox = 180;
  const oy = 560;
  let down = false;
  let ms = 0;
  let arrived = false;
  while (ms < maxMs) {
    const p = g.hooks.getState().scene.player;
    const dx = x - p.x;
    const dy = y - p.y;
    const l = Math.hypot(dx, dy);
    if (l < tol) {
      arrived = true;
      break;
    }
    if (!down) {
      g.fingers.start(id, canvas, ox, oy);
      down = true;
    }
    const k = l < 0.6 ? 20 + 40 * (l / 0.6) : 52;
    g.fingers.move(id, ox + (dx / l) * k, oy + (dy / l) * k);
    g.hooks.advance(50);
    ms += 50;
  }
  if (down) g.fingers.end(id);
  g.hooks.advance(80);
  return arrived;
}

/** Attend (temps simulé) jusqu'à ce que `pred(state)` soit vrai. */
export function waitFor(g, pred, maxMs = 20000, stepMs = 100) {
  let ms = 0;
  while (ms < maxMs) {
    if (pred(g.hooks.getState())) return true;
    g.hooks.advance(stepMs);
    ms += stepMs;
  }
  return pred(g.hooks.getState());
}

/**
 * Premier lancement : tap sur l'écran titre, puis sur l'enveloppe de la scène d'intro (G19 0:02, M11) ;
 * renvoie quand le Jour 1 a commencé.
 * @param {ReturnType<import('./dom.js').loadGame>} g
 */
export function openEnvelope(g) {
  g.hooks.advance(1000);
  const env = g.$('.intro-envelope');
  if (!env) return false;
  g.fingers.tap(env, 180, 320);
  return waitFor(g, (s) => s.scene && s.scene.phase === 'day', 4000, 50);
}
