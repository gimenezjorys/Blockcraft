// Fort Boutique — point d'entrée du navigateur : assemble l'interface, le jeu, le rendu et l'audio.
import { setLang, detectLang } from './ui/i18n.js';
import { createApp } from './ui/app.js';
import { createPlay } from './ui/play.js';
import { createDemoScene } from './render/demo-scene.js';
import { createGame } from './game/state.js';
import { createStorage } from './save/storage.js';
import { loadSave } from './save/save.js';
import { now } from './core/time.js';
import { seedFrom } from './core/rng.js';
import title from './ui/screens/title.js';
import blank from './ui/screens/blank.js';
import { installTestHooks } from './debug/test-hooks.js';
import { createAudio } from './audio/audio.js';
import { startDay } from './game/day/day.js';
import { buildCheats } from './debug/cheats.js';
import { setClock } from './core/time.js';

const VERSION = typeof __FB_VERSION__ !== 'undefined' ? __FB_VERSION__ : { version: 'dev', hash: '', date: '' };

function boot() {
  const lang = detectLang(window.navigator);
  setLang(lang);
  const app = createApp({ testBuild: __FB_TEST_BUILD__, version: VERSION });
  // Constante de compilation : ce bloc disparaît de dist/index.html.
  if (__FB_TEST_BUILD__) installTestHooks(app);
  const storage = createStorage(window);
  const audio = createAudio(window);
  audio.attach();
  app.services.audio = audio;
  let current = null;
  let clockShift = 0;
  app.services.cheats = () => buildCheats({
    game: () => current,
    advanceClock: (ms) => {
      clockShift += ms;
      const base = now;
      void base;
      setClock(null);
      const real = now;
      setClock(() => real() + clockShift);
    },
    onChange: () => {},
  });
  app.services.debugStats = () => ({
    entities: current ? (current.night ? current.night.monsters.active.length : 0) + (current.day ? current.day.customers.length : 0) : 0,
    seed: current ? current.save.seed : '-',
    phase: current ? current.phase.name : app.router.currentId(),
  });
  const demo = /[?&]demo=1(?:&|$)/.test(window.location.search);
  app.onTitleTap = () => {
    if (demo) {
      // Scène de démonstration du moteur (tests d'entrées M1).
      app.router.goto('blank');
      app.setScene(createDemoScene(app));
      return;
    }
    const t = now();
    const loaded = loadSave(storage, { seed: seedFrom(t, 'nouvelle partie'), now: t, lang });
    const g = createGame({ save: loaded.data });
    current = g;
    startDay(g);
    app.router.goto('blank');
    app.setScene(createPlay(app, g));
  };
  app.router.register({ title, blank });
  app.router.goto('title');
  app.loop.start();
}

boot();
