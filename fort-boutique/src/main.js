// Fort Boutique — point d'entrée du navigateur : assemble l'interface, le jeu, le rendu et l'audio.
import { setLang, detectLang } from './ui/i18n.js';
import { createApp } from './ui/app.js';
import { createDemoScene } from './render/demo-scene.js';
import { createStorage } from './save/storage.js';
import { now, setClock } from './core/time.js';
import { createAudio } from './audio/audio.js';
import { buildCheats } from './debug/cheats.js';
import { installTestHooks } from './debug/test-hooks.js';
import { createSession } from './ui/session.js';
import { createToasts } from './ui/toast.js';
import title from './ui/screens/title.js';
import blank from './ui/screens/blank.js';
import morning from './ui/screens/morning.js';
import dawn from './ui/screens/dawn.js';
import pause from './ui/screens/pause.js';

const VERSION = typeof __FB_VERSION__ !== 'undefined' ? __FB_VERSION__ : { version: 'dev', hash: '', date: '' };

function boot() {
  const lang = detectLang(window.navigator);
  setLang(lang);
  const app = createApp({ testBuild: __FB_TEST_BUILD__, version: VERSION });
  // Constante de compilation : ce bloc disparaît de dist/index.html.
  if (__FB_TEST_BUILD__) installTestHooks(app);
  const storage = createStorage(window);
  app.services.storage = storage;
  const audio = createAudio(window);
  audio.attach();
  app.services.audio = audio;
  const toasts = createToasts(document.getElementById('app'));
  app.services.toast = (text, icon) => toasts.show(text, icon);
  app.services.toasts = toasts;
  const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const session = createSession(app, { storage, lang });
  app.services.session = session;
  app.services.settings = {
    get reducedMotion() {
      const g = session.game();
      return reduced || !!(g && !g.save.settings.shake);
    },
    get leftHanded() {
      const g = session.game();
      return !!(g && g.save.settings.leftHanded);
    },
  };
  app.services.vibrate = (ms) => {
    const g = session.game();
    if (g && !g.save.settings.vibration) return;
    if (typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(ms);
      } catch {
        /* rien */
      }
    }
  };
  app.services.onVisibility = (hidden) => {
    if (hidden) {
      audio.mute('hidden');
      session.autoPause();
      session.flush();
    } else audio.unmute('hidden');
  };
  app.services.onPageHide = () => session.flush();
  app.stepHooks.push((dt) => {
    session.step(dt);
    toasts.update(dt);
  });
  // Outils debug (?debug=1).
  let clockShift = 0;
  app.services.cheats = () => buildCheats({
    game: () => session.game(),
    advanceClock: (ms) => {
      clockShift += ms;
      setClock(null);
      const real = now;
      setClock(() => real() + clockShift);
    },
    onChange: () => session.save(true),
  });
  app.services.debugStats = () => {
    const g = session.game();
    return {
      entities: g ? (g.night ? g.night.monsters.active.length : 0) + (g.day ? g.day.customers.length : 0) : 0,
      seed: g ? g.save.seed : '-',
      phase: g ? g.phase.name : app.router.currentId(),
    };
  };
  app.services.testState = () => {
    const snap = app.snapshot();
    snap.toasts = toasts.texts();
    snap.storageKind = storage.kind;
    return snap;
  };
  const demo = /[?&]demo=1(?:&|$)/.test(window.location.search);
  app.onTitleTap = () => {
    if (demo) {
      // Scène de démonstration du moteur (tests d'entrées M1).
      app.router.goto('blank');
      app.setScene(createDemoScene(app));
      return;
    }
    session.start();
  };
  app.router.register({ title, blank, hud: blank, morning, dawn, pause });
  app.router.goto('title');
  app.loop.start();
}

boot();
