// Fort Boutique — contrôleur de l'application : boucle, entrées, écrans DOM, scène canvas, hooks de test.
import { createLoop } from '../core/loop.js';
import { listen } from '../core/events.js';
import { now } from '../core/time.js';
import { createInput } from '../input/input.js';
import { computeViewport } from '../render/camera.js';
import { createRouter } from './router.js';
import { debugEnabled, mountDebug } from '../debug/debug.js';

/**
 * @typedef {object} Scene scène dessinée sur le canvas
 * @property {(dt: number) => void} [update]
 * @property {(ctx: CanvasRenderingContext2D, alpha: number) => void} render
 * @property {(x: number, y: number) => string | null} [hitTest]
 * @property {(id: string, phase: string) => void} [onButton]
 * @property {(x: number, y: number) => void} [onTap]
 * @property {(phase: string, x: number, y: number) => boolean | void} [onPointer] gestes bruts (éditeur) ; false = refusé
 * @property {(key: string) => boolean} [onKey]
 * @property {boolean} [joystick]
 * @property {() => object} [snapshot]
 */

/**
 * @param {{ testBuild: boolean, version: object }} opts
 */
export function createApp({ testBuild, version }) {
  const appEl = document.getElementById('app');
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
  const uiRoot = document.getElementById('ui');
  const ctx2d = canvas.getContext('2d');
  let vp = computeViewport(window.innerWidth, window.innerHeight);
  let dpr = 1;
  /** @type {Scene | null} */
  let scene = null;

  function fit() {
    vp = computeViewport(window.innerWidth, window.innerHeight);
    appEl.style.transform = `scale(${vp.scale})`;
    appEl.style.left = `${vp.offsetX}px`;
    appEl.style.top = `${vp.offsetY}px`;
    dpr = Math.min(2, window.devicePixelRatio || 1) * (app.economy ? 0.5 : 1);
    dpr = Math.max(1, dpr);
    canvas.width = Math.round(360 * vp.scale * dpr);
    canvas.height = Math.round(640 * vp.scale * dpr);
  }

  const app = {
    version,
    testBuild,
    economy: false,
    canvas,
    ctx2d,
    uiRoot,
    /** @type {ReturnType<typeof createRouter>} */
    router: null,
    /** @type {ReturnType<typeof createLoop>} */
    loop: null,
    /** @type {ReturnType<typeof createInput>} */
    input: null,
    debug: null,
    /** Services ajoutés par main.js (jeu, audio, sauvegarde…). */
    services: {},
    /** Hooks appelés à chaque pas. */
    stepHooks: [],
    viewport: () => vp,
    /** @param {Scene | null} s */
    setScene(s) {
      scene = s;
      if (app.input) app.input.cancelAll();
    },
    scene: () => scene,
    refit: () => fit(),
    /** Instantané lisible (debug, hooks de test). */
    snapshot() {
      return {
        screen: app.router.currentId(),
        screens: app.router.ids(),
        paused: app.loop.paused,
        pauseReasons: app.loop.pauseReasons(),
        simTime: app.loop.stats.simTime,
        now: now(),
        move: { x: app.input.move.x, y: app.input.move.y },
        joystick: { active: app.input.joystick.active, x: app.input.joystick.ox, y: app.input.joystick.oy },
        bellPresses: app.input.bellPresses,
        audioMuted: !!(app.services.audio && app.services.audio.muted),
        scene: scene && scene.snapshot ? scene.snapshot() : null,
      };
    },
  };

  app.router = createRouter(uiRoot, app);

  app.loop = createLoop({
    raf: testBuild ? undefined : (cb) => window.requestAnimationFrame(cb),
    step(dt) {
      app.input.update(dt);
      if (scene && scene.update) scene.update(dt);
      for (const fn of app.stepHooks.slice()) fn(dt);
      app.router.update(dt);
      if (app.debug) app.debug.update(dt);
    },
    render(alpha) {
      ctx2d.setTransform(vp.scale * dpr, 0, 0, vp.scale * dpr, 0, 0);
      if (scene) scene.render(ctx2d, alpha);
      else {
        ctx2d.fillStyle = '#2E4B44';
        ctx2d.fillRect(0, 0, 360, 640);
      }
    },
  });

  app.input = createInput({
    surface: canvas,
    viewport: () => vp,
    hitTest: (x, y) => (scene && scene.hitTest ? scene.hitTest(x, y) : null),
    onButton: (id, phase) => scene && scene.onButton && scene.onButton(id, phase),
    onTap: (x, y) => scene && scene.onTap && scene.onTap(x, y),
    onKey: (key) => {
      if (app.router.key(key)) return;
      if (scene && scene.onKey) scene.onKey(key);
    },
    joystickEnabled: () => !!(scene && scene.joystick),
    onPointer: (phase, x, y) => (scene && scene.onPointer ? scene.onPointer(phase, x, y) !== false : false),
  });

  fit();
  listen(window, 'resize', fit);
  listen(document, 'visibilitychange', () => {
    if (document.hidden) app.loop.pause('hidden');
    else app.loop.resume('hidden');
    if (app.services.onVisibility) app.services.onVisibility(document.hidden);
  });
  listen(window, 'pagehide', () => app.services.onPageHide && app.services.onPageHide());

  if (debugEnabled(window.location.search)) {
    app.debug = mountDebug(appEl, {
      stats: () => {
        const s = app.services.debugStats ? app.services.debugStats() : {};
        return {
          fps: app.loop.stats.fps,
          updateMs: app.loop.stats.updateMs,
          entities: s.entities || 0,
          seed: s.seed ?? '-',
          phase: s.phase || app.router.currentId() || '-',
        };
      },
      get cheats() {
        return app.services.cheats ? app.services.cheats() : [];
      },
    });
  }

  return app;
}
