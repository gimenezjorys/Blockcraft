// Fort Boutique — hooks de test (B15), présents uniquement dans dist-test/ (supprimés de dist/ par esbuild).
import { setClock, setPerfClock } from '../core/time.js';

/**
 * Expose window.__FB_TEST__ : getState() (lecture seule), advance(ms), setNow(ms).
 * Le temps et l'horloge sont entièrement simulés ; aucune boucle rAF ne tourne.
 * @param {object} app
 */
export function installTestHooks(app) {
  let testNow = typeof window.__FB_TEST_NOW__ === 'number' ? window.__FB_TEST_NOW__ : 1792411200000;
  let testPerf = 0;
  setClock(() => testNow);
  setPerfClock(() => testPerf);
  window.__FB_TEST__ = Object.freeze({
    getState: () => JSON.parse(JSON.stringify(app.services.testState ? app.services.testState() : app.snapshot())),
    advance: (ms) => {
      let left = ms;
      while (left > 0) {
        const chunk = Math.min(left, 1000 / 60);
        testNow += chunk;
        testPerf += chunk;
        app.loop.advance(chunk, false);
        left -= chunk;
      }
      app.loop.advance(0, true);
    },
    setNow: (ms) => {
      testNow = ms;
    },
  });
}
