// Fort Boutique — point d'entrée du navigateur : assemble l'interface, le jeu, le rendu et l'audio.
import { setLang, detectLang } from './ui/i18n.js';
import { createApp } from './ui/app.js';
import { createDemoScene } from './render/demo-scene.js';
import title from './ui/screens/title.js';
import blank from './ui/screens/blank.js';
import { installTestHooks } from './debug/test-hooks.js';

const VERSION = typeof __FB_VERSION__ !== 'undefined' ? __FB_VERSION__ : { version: 'dev', hash: '', date: '' };


function boot() {
  setLang(detectLang(window.navigator));
  const app = createApp({ testBuild: __FB_TEST_BUILD__, version: VERSION });
  // Constante de compilation : ce bloc disparaît de dist/index.html.
  if (__FB_TEST_BUILD__) installTestHooks(app);
  app.onTitleTap = () => {
    app.router.goto('blank');
    app.setScene(createDemoScene(app));
  };
  app.router.register({ title, blank });
  app.router.goto('title');
  app.loop.start();
}

boot();
