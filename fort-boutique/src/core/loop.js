// Fort Boutique — boucle à pas fixe (1/60 s), accumulateur, 5 pas max par image, timeScale (B5).
import { perfNow } from './time.js';

/** Durée d'un pas de simulation (s). */
export const STEP = 1 / 60;

/**
 * @param {object} opts
 * @param {(dt: number) => void} opts.step pas de simulation (dt en secondes, déjà multiplié par timeScale)
 * @param {(alpha: number, frameDt: number) => void} opts.render rendu, à chaque image
 * @param {(cb: FrameRequestCallback) => number} [opts.raf]
 * @param {number} [opts.maxSteps]
 */
export function createLoop({ step, render, raf, maxSteps = 5, onSlow }) {
  const pauses = new Set();
  let acc = 0;
  let last = -1;
  let running = false;
  let manualAcc = 0;
  const stats = { fps: 60, frameMs: 16.7, updateMs: 0, steps: 0, simTime: 0, slowSince: -1 };

  const loop = {
    timeScale: 1,
    stats,
    /** Réglages du ralenti ponctuel (G20.6) : timeScale temporaire pendant une durée réelle. */
    slow: { scale: 1, left: 0 },

    get paused() {
      return pauses.size > 0;
    },
    /** @param {string} reason */
    pause(reason) {
      pauses.add(reason);
    },
    /** @param {string} reason */
    resume(reason) {
      pauses.delete(reason);
    },
    pauseReasons() {
      return [...pauses];
    },
    /** Ralenti : `scale` pendant `sec` secondes réelles. */
    slowMo(scale, sec) {
      loop.slow.scale = scale;
      loop.slow.left = sec;
    },

    effectiveScale() {
      return loop.timeScale * (loop.slow.left > 0 ? loop.slow.scale : 1);
    },

    /** Exécute des pas pour une durée réelle donnée (s). */
    runFor(realSec, limitSteps) {
      if (pauses.size) return 0;
      if (loop.slow.left > 0) loop.slow.left -= realSec;
      acc += realSec * loop.effectiveScale();
      let n = 0;
      const t0 = perfNow();
      while (acc >= STEP && (limitSteps === undefined || n < limitSteps)) {
        step(STEP);
        acc -= STEP;
        n++;
        stats.simTime += STEP;
      }
      if (limitSteps !== undefined && n >= limitSteps) acc = 0;
      if (n) stats.updateMs = stats.updateMs * 0.9 + ((perfNow() - t0) / n) * 0.1;
      stats.steps += n;
      return n;
    },

    /** Démarre la boucle rAF (navigateur). */
    start() {
      if (running || !raf) return;
      running = true;
      const frame = (ts) => {
        if (!running) return;
        const tNow = typeof ts === 'number' ? ts : perfNow();
        const elapsed = last < 0 ? STEP : Math.min(0.25, Math.max(0, (tNow - last) / 1000));
        last = tNow;
        stats.frameMs = stats.frameMs * 0.95 + elapsed * 1000 * 0.05;
        stats.fps = 1000 / Math.max(1, stats.frameMs);
        // Mode économie automatique (B5) : temps moyen d'image > 20 ms pendant 5 s (onglet visible, jeu en marche).
        if (stats.frameMs > 20 && !loop.paused) {
          if (stats.slowSince < 0) stats.slowSince = tNow;
          else if (stats.slowSince !== Infinity && tNow - stats.slowSince > 5000) {
            stats.slowSince = Infinity;
            if (onSlow) onSlow();
          }
        } else if (stats.slowSince !== Infinity) stats.slowSince = -1;
        loop.runFor(elapsed, maxSteps);
        render(acc / STEP, elapsed);
        raf(frame);
      };
      raf(frame);
    },

    stop() {
      running = false;
    },

    /**
     * Avance déterministe (tests, B15) : `ms` de temps réel simulé, sans plafond de pas.
     * @param {number} ms
     * @param {boolean} [doRender]
     */
    advance(ms, doRender = true) {
      manualAcc += ms / 1000;
      let total = 0;
      while (manualAcc >= STEP - 1e-9) {
        manualAcc -= STEP;
        total += loop.runFor(STEP);
      }
      if (doRender) render(acc / STEP, ms / 1000);
      return total;
    },
  };
  return loop;
}
