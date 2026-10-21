// Environnement jsdom : charge dist/index.html ou dist-test/index.html avec canvas, audio et toucher simulés.
import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { installCanvas } from './canvas.js';
import { installAudio } from './audio.js';
import { installTouch, Fingers } from './touch.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * @typedef {object} LoadOptions
 * @property {'dist' | 'dist-test'} [build]
 * @property {number} [width]
 * @property {number} [height]
 * @property {Record<string, string>} [storage] contenu initial de localStorage
 * @property {'ok' | 'throw' | 'quota'} [storageMode]
 * @property {string} [query] ex. '?debug=1'
 * @property {string} [language]
 * @property {boolean} [reducedMotion]
 * @property {number} [now] horloge simulée (dist-test uniquement)
 * @property {boolean} [standalone]
 * @property {string} [userAgent]
 */

/**
 * Charge le jeu construit dans jsdom.
 * @param {LoadOptions} [opts]
 */
export function loadGame(opts = {}) {
  const build = opts.build || 'dist-test';
  const file = join(ROOT, build, 'index.html');
  if (!existsSync(file)) throw new Error(`${file} absent : lancer npm run build${build === 'dist-test' ? ' -- --test' : ''}`);
  const html = readFileSync(file, 'utf8');
  const errors = [];
  const warnings = [];
  const vibrations = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(e.message || String(e)));
  vc.on('error', (...a) => errors.push(a.map(String).join(' ')));
  vc.on('warn', (...a) => warnings.push(a.map(String).join(' ')));
  let canvas;
  let audio;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://fort-boutique.test/' + (opts.query || ''),
    virtualConsole: vc,
    userAgent: opts.userAgent,
    beforeParse(window) {
      const w = opts.width || 360;
      const h = opts.height || 640;
      Object.defineProperty(window, 'innerWidth', { value: w, configurable: true, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: h, configurable: true, writable: true });
      Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true, writable: true });
      canvas = installCanvas(window);
      audio = installAudio(window);
      installTouch(window);
      window.matchMedia = (q) => ({
        matches: q.includes('prefers-reduced-motion') ? !!opts.reducedMotion : false,
        media: q,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      });
      Object.defineProperty(window.navigator, 'language', { value: opts.language || 'fr-FR', configurable: true });
      window.navigator.vibrate = (ms) => { vibrations.push(ms); return true; };
      if (opts.standalone !== undefined) Object.defineProperty(window.navigator, 'standalone', { value: opts.standalone, configurable: true });
      window.addEventListener('error', (e) => errors.push(e.message || String(e.error)));
      window.addEventListener('unhandledrejection', (e) => errors.push('rejet : ' + String(e.reason)));
      if (opts.storage) for (const [k, v] of Object.entries(opts.storage)) window.localStorage.setItem(k, v);
      if (opts.storageMode === 'throw') {
        Object.defineProperty(window, 'localStorage', { get() { throw new window.DOMException('refusé', 'SecurityError'); }, configurable: true });
      } else if (opts.storageMode === 'quota') {
        const ls = window.localStorage;
        const real = ls.setItem.bind(ls);
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get() {
            return new Proxy(ls, {
              get(target, prop) {
                if (prop === 'setItem') return () => { throw new window.DOMException('plein', 'QuotaExceededError'); };
                const v = Reflect.get(target, prop);
                return typeof v === 'function' ? v.bind(target) : v;
              },
            });
          },
        });
        void real;
      }
      if (opts.now !== undefined) window.__FB_TEST_NOW__ = opts.now;
    },
  });
  const window = dom.window;
  const fingers = new Fingers(window);
  return {
    dom,
    window,
    document: window.document,
    errors,
    warnings,
    vibrations,
    canvas,
    audio,
    fingers,
    hooks: window.__FB_TEST__,
    /** @param {string} sel */
    $(sel) { return window.document.querySelector(sel); },
    $$(sel) { return [...window.document.querySelectorAll(sel)]; },
    screenId() {
      const s = window.document.querySelectorAll('#ui > .screen');
      return s.length ? s[s.length - 1].getAttribute('data-screen') : null;
    },
    close() { window.close(); },
  };
}

/** Horloge de départ du build de test (src/debug/test-hooks.js). */
export const TEST_NOW = 1792411200000;

/**
 * Le calendrier est déjà réclamé ce jour UTC (M12) : le Matin s'affiche sans que le Calendrier s'ouvre seul.
 * Pour les tests d'un autre écran du hub, partis d'une sauvegarde préparée.
 * @param {any} save
 */
export function calendarDoneToday(save) {
  const day = Math.floor(TEST_NOW / 86400000);
  save.daily.lastCalendarDay = day;
  save.daily.maxClaimDay = day;
  save.daily.calendarIndex = Math.max(1, save.daily.calendarIndex);
  return save;
}
