// Fort Boutique — point d'entrée du navigateur : assemble l'interface, le jeu, le rendu et l'audio.
import { setLang, detectLang } from './ui/i18n.js';
import { createRouter } from './ui/router.js';
import { computeViewport } from './render/camera.js';
import { listen } from './core/events.js';
import title from './ui/screens/title.js';
import blank from './ui/screens/blank.js';

const VERSION = typeof __FB_VERSION__ !== 'undefined' ? __FB_VERSION__ : { version: 'dev', hash: '', date: '' };

function fit(app, canvas) {
  const vp = computeViewport(window.innerWidth, window.innerHeight);
  app.style.transform = `scale(${vp.scale})`;
  app.style.left = `${vp.offsetX}px`;
  app.style.top = `${vp.offsetY}px`;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(360 * vp.scale * dpr);
  canvas.height = Math.round(640 * vp.scale * dpr);
  return vp;
}

function boot() {
  setLang(detectLang(window.navigator));
  const app = document.getElementById('app');
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
  const ui = document.getElementById('ui');
  fit(app, canvas);
  listen(window, 'resize', () => fit(app, canvas));
  const ctx = {
    version: VERSION,
    onTitleTap: () => router.goto('blank'),
  };
  const router = createRouter(ui, ctx);
  router.register({ title, blank });
  router.goto('title');
  listen(window, 'keydown', (e) => router.key(e.key));
}

boot();
