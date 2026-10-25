// Fort Boutique — écran titre (v1.1, V7) : la boutique de Bourg-Lanterne au soir, dessinée et animée sur un canvas
// (render/title-scene.js). Un tap n'importe où : la porte s'ouvre, une lumière chaude envahit l'écran, puis le jeu.
// En bas : version, son, paramètres (en bois). Le nom reste lisible par les lecteurs d'écran (aria-label).
import { h, onTap } from '../widgets.js';
import { t } from '../i18n.js';
import { createTitleScene, TITLE_HITS } from '../../render/title-scene.js';
import { currentSeason } from '../../game/weekly-events.js';

const DOOR_S = 0.8;

export default {
  /**
   * @param {any} ctx l'application
   * @param {{ version?: object }} params
   */
  mount(ctx, params, d) {
    const v = ctx.version || {};
    const name = t('game.name');
    const words = name.split(' ');
    const scene = createTitleScene({
      season: (currentSeason() || {}).id || null,
      title: [words[0], words.slice(1).join(' ')],
      tap: t('title.tap'),
      version: `v${v.version || '?'}`,
    });
    const audio = () => ctx.services && ctx.services.audio;
    scene.soundOn = !(audio() && audio().muted);
    const canvas = h('canvas.title-canvas', { width: 720, height: 1280, 'aria-hidden': 'true' });
    const el = h('div.title-screen', { role: 'button', 'aria-label': `${name} — ${t('title.tap')}` }, [canvas]);
    const c2 = canvas.getContext ? canvas.getContext('2d') : null;
    const draw = () => {
      if (!c2) return;
      c2.setTransform(2, 0, 0, 2, 0, 0);
      scene.draw(c2);
    };
    let started = false;
    const play = () => {
      if (started) return;
      started = true;
      scene.opening = true;
      if (audio()) audio().play('door_bell');
      // La porte s'ouvre ; la lumière chaude reste par-dessus l'écran suivant le temps du fondu (0,8 s).
      const light = h('div.title-door-light');
      const root = el.parentNode || document.body;
      root.appendChild(light);
      setTimeout(() => light.remove(), DOOR_S * 1000 + 50);
      ctx.onTitleTap();
    };
    // Position du tap en pixels logiques (le canvas est mis à l'échelle de l'écran).
    const logical = (e) => {
      const pt = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
      const r = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: 360, height: 640 };
      const k = (r.width || 360) / 360;
      return { x: ((pt.clientX ?? 180) - r.left) / k, y: ((pt.clientY ?? 320) - r.top) / k };
    };
    const near = (p, b) => Math.hypot(p.x - b.x, p.y - b.y) <= b.r + 6;
    onTap(el, (e) => {
      const p = logical(e);
      if (near(p, TITLE_HITS.sound)) {
        const a = audio();
        scene.soundOn = !scene.soundOn;
        if (a) {
          if (scene.soundOn) a.unmute('user');
          else a.mute('user');
          a.play('ui_tap');
        }
        return;
      }
      if (near(p, TITLE_HITS.gear)) {
        play();
        const s = ctx.services && ctx.services.session;
        if (s && s.openSettings) setTimeout(() => s.openSettings(), 0);
        return;
      }
      play();
    }, d);
    draw();
    return {
      el,
      update(dt) {
        scene.update(dt);
        draw();
      },
      onKey(key) {
        if (key === 'Enter' || key === ' ') {
          play();
          return true;
        }
        return false;
      },
    };
  },
};
