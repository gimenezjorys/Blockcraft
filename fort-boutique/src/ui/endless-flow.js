// Fort Boutique — déroulé de la Nuit sans fin (G13.2) : écran du record, nuit dans la boutique courante (copie de la
// partie), résultat (vagues tenues, record, coffres). La partie normale reste en mémoire et reprend telle quelle.
import { createEndless, startEndlessNight, recordEndless, endlessRivals } from '../game/endless.js';
import { createPlay } from './play.js';
import { challengePause } from './daily-flow.js';

/**
 * @param {any} app
 * @param {{ game: () => any, play: () => any, save: (force?: boolean) => void, renderMorning: () => void }} o
 */
export function createEndlessFlow(app, o) {
  let eg = null;
  let ended = false;
  let lastShop = null;

  function open(result) {
    const g = o.game();
    const shopId = lastShop && g.save.shops[lastShop] && g.save.shops[lastShop].unlocked ? lastShop : g.shopId;
    app.router.push('endless', {
      save: g.save,
      shopId,
      rivals: endlessRivals(g.save),
      result,
      onPlay: (id) => start(id),
      onClose: () => {
        app.router.pop();
        o.renderMorning();
      },
    });
  }

  function start(shopId) {
    const g = o.game();
    ended = false;
    lastShop = shopId;
    eg = createEndless(g.save, shopId);
    startEndlessNight(eg);
    const scene = createPlay(app, eg, { onPause: pause, onEvent: (e) => { if (e.type === 'dawn') ended = true; } });
    app.setScene(scene);
    app.router.goto('hud', { game: () => eg });
  }

  /** Fin de partie (Bocal vide) : record et coffres sur la vraie partie, puis l'écran du résultat. */
  function finish() {
    const held = eg.night.result.endlessHeld || 0;
    const rec = recordEndless(o.game().save, held);
    o.save(true);
    leave();
    open(rec);
  }

  /** Retour à la partie normale (Matin). Une partie interrompue ne compte pas. */
  function leave() {
    eg = null;
    ended = false;
    app.setScene(o.play());
    o.renderMorning();
  }

  const pause = () => challengePause(app, leave);

  return {
    open,
    active: () => !!eg,
    pause,
    step() {
      if (eg && ended) finish();
    },
  };
}
