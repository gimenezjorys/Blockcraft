// Fort Boutique — déroulé du Défi du jour (G13.3) : carte du jour, aménagement libre des meubles imposés, nuit du défi
// (sa propre scène), résultat. La partie normale reste en mémoire et reprend telle quelle au retour.
import { t } from './i18n.js';
import { SVG } from './icons.js';
import { now, utcDay } from '../core/time.js';
import { dailySetup, dailyScore, recordDaily } from '../game/daily.js';
import { createChallenge, startChallengeNight } from '../game/daily-game.js';
import { openEditor, commitEditor } from '../game/editor.js';
import { createEditorScene } from './editor-scene.js';
import { createPlay } from './play.js';

/**
 * @param {any} app
 * @param {{ game: () => any, play: () => any, save: (force?: boolean) => void, renderMorning: () => void }} o
 */
export function createDailyFlow(app, o) {
  let cg = null;
  let day = -1;
  let ended = false;
  const sfx = (id) => app.services.audio && app.services.audio.play(id);

  function open(result) {
    const g = o.game();
    const d = utcDay(now());
    app.router.push('daily', {
      save: g.save,
      day: d,
      setup: dailySetup(d),
      result,
      onPlay: () => start(d),
      onShare: (text) => share(text),
      onClose: () => {
        app.router.pop();
        o.renderMorning();
      },
    });
  }

  /** Partager : feuille de partage du téléphone, sinon presse-papiers (« Copié ! »). */
  function share(text) {
    const done = () => app.services.toast && app.services.toast(t('daily.copied'), SVG.check);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({ text }).catch(() => {});
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
        return;
      }
    } catch {
      /* repli */
    }
    done();
  }

  /** Aménagement libre des meubles imposés (éditeur, sans Réserve), puis la nuit. */
  function start(d) {
    const g = o.game();
    day = d;
    ended = false;
    cg = createChallenge(g.save, d);
    const ed = openEditor(cg.shop, cg.shopId);
    let inst = null;
    const scene = createEditorScene(app, ed, {
      theme: g.save.cosmetics.equipped.theme,
      onChange: () => {
        sfx('drop');
        if (inst) inst.refresh();
      },
      onSelect: () => inst && inst.refresh(),
      onInvalid: () => {
        sfx('error');
        if (inst) inst.refresh();
      },
    });
    app.setScene(scene);
    inst = app.router.goto('editor', {
      scene,
      ed,
      showAdvice: false,
      hintFirst: false,
      onValidate: () => {
        if (!commitEditor(ed, cg.shop)) {
          sfx('error');
          return;
        }
        night();
      },
      onCancel: () => leave(),
    });
  }

  function night() {
    startChallengeNight(cg);
    const scene = createPlay(app, cg, { onPause: pause, onEvent: (e) => { if (e.type === 'dawn') ended = true; } });
    app.setScene(scene);
    app.router.goto('hud', { game: () => cg });
  }

  /** Fin de la nuit du défi : score, première tentative du jour récompensée, retour à la carte du défi. */
  function finish() {
    const r = cg.night.result;
    const score = dailyScore(r);
    const g = o.game();
    const rec = recordDaily(g.save, day, { score, stars: r.stars, waves: r.waves });
    o.save(true);
    leave();
    open({ score, stars: r.stars, waves: r.waves, first: rec.first, reward: rec.reward, rank: rec.rank });
  }

  /** Retour à la partie normale (Matin). Une tentative interrompue ne compte pas. */
  function leave() {
    cg = null;
    ended = false;
    app.setScene(o.play());
    o.renderMorning();
  }

  function pause() {
    if (app.router.has('pause')) return;
    app.loop.pause('menu');
    app.input.cancelAll();
    app.router.push('pause', {
      night: true,
      onResume: () => {
        app.router.pop();
        app.loop.resume('menu');
      },
      onQuit: () => {
        app.router.pop();
        app.loop.resume('menu');
        leave();
      },
    });
  }

  return {
    open,
    active: () => !!cg,
    pause,
    /** Appelé à chaque pas : la fin de nuit est traitée hors de la boucle d'événements de la scène. */
    step() {
      if (cg && ended) finish();
    },
  };
}
