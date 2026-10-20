// Fort Boutique — la session de jeu : chargement, reprise (G5.2), transitions de phases, écrans, sauvegardes (B9).
import { now } from '../core/time.js';
import { seedFrom } from '../core/rng.js';
import { loadSave, SaveManager } from '../save/save.js';
import { createGame, rebuildShop } from '../game/state.js';
import { resumePoint, enterMorning, openShop, markNightPending, resumeNight, enterDawn, openDawnChest, leaveDawn } from '../game/cycle.js';
import { startDay } from '../game/day/day.js';
import { startNight } from '../game/night/night.js';
import { upgradeFurniture } from '../game/economy.js';
import { createPlay } from './play.js';
import { ADS } from '../data/balance.js';
import { t } from './i18n.js';
import { SVG } from './icons.js';
import { createHub, HUB_SCREENS } from './hub.js';

/** Sauvegarde automatique pendant le jeu (B9). */
const AUTOSAVE_S = 10;

/**
 * @param {any} app
 * @param {{ storage: import('../save/storage.js').Storage, lang: string }} o
 */
export function createSession(app, o) {
  /** @type {any} */
  let g = null;
  /** @type {SaveManager | null} */
  let saver = null;
  let play = null;
  let autosaveT = 0;
  let persistAsked = false;
  /** Une sauvegarde de transition attend d'être écrite : la coche « sauvegardé » clignotera. */
  let flashPending = false;
  let lastWrites = 0;

  /**
   * Sauvegarde. Même « forcée » (transition de phase), l'écriture respecte B9 : au plus une toutes les 500 ms ;
   * sinon elle part au tick suivant le délai. Seuls la mise en arrière-plan et pagehide écrivent sans attendre.
   * @param {boolean} [force] transition importante : écrire dès que le délai le permet, puis montrer la coche
   */
  function save(force = false) {
    if (!saver) return;
    if (force) flashPending = true;
    saver.request();
    checkWrites();
  }

  function checkWrites() {
    if (!saver || saver.writes === lastWrites) return;
    lastWrites = saver.writes;
    if (flashPending && app.services.toasts) app.services.toasts.flashSaved(SVG.check);
    flashPending = false;
  }

  function showHud() {
    app.router.goto('hud');
  }

  function showMorning() {
    enterMorning(g);
    rebuildShop(g);
    renderMorning();
    // Les déblocages se fêtent au Matin suivant (G12.4).
    hub.showUnlocks();
  }

  /** (Re)dessine le hub du Matin, par exemple au retour du Catalogue. */
  function renderMorning() {
    app.router.goto('morning', {
      g,
      onOpen: () => {
        openShop(g);
        save(true);
        showHud();
      },
      onButton: (id) => {
        if (session.onHubButton) session.onHubButton(id);
        else hub.open(id);
      },
      ready: session.hubScreens,
      onSettings: () => pause(),
    });
  }

  const hub = createHub(app, { game: () => g, save, refresh: () => renderMorning() });

  function showDawn() {
    app.router.goto('dawn', {
      dawn: g.shop.phase.dawn,
      save: g.save,
      onOpenChest: () => {
        const c = openDawnChest(g);
        save(true);
        return c;
      },
      onUpgrade: (id) => {
        const ok = upgradeFurniture(g.save, id);
        if (ok) {
          for (const f of g.furn) if (f.id === id) f.level = g.save.furniture[id].level;
          save(true);
        }
        return ok;
      },
      onContinue: () => {
        leaveDawn(g);
        save(true);
        showMorning();
      },
      adReady: () => !!(app.services.ads && app.services.ads.isRewardedReady('rw_double_night')),
      adOffer: () => g.save.stats.playtimeMs >= ADS.quietPlaytimeMs,
    });
  }

  function pause() {
    if (app.router.has('pause')) return;
    app.loop.pause('menu');
    app.input.cancelAll();
    app.router.push('pause', {
      onResume: () => {
        app.router.pop();
        app.loop.resume('menu');
      },
      onSettings: session.onSettings ? () => session.onSettings() : null,
      onQuit: () => {
        save(true);
        app.router.pop();
        app.loop.resume('menu');
        app.setScene(null);
        app.router.goto('title');
      },
    });
  }

  function onEvent(e) {
    switch (e.type) {
      case 'day_end':
        markNightPending(g);
        save(true);
        break;
      case 'night_start':
        save(true);
        break;
      case 'dawn':
        enterDawn(g);
        save(true);
        if (!persistAsked && typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
          // Après la première nuit terminée : demande de stockage persistant (B9).
          persistAsked = true;
          try {
            navigator.storage.persist().catch(() => {});
          } catch {
            /* rien */
          }
        }
        showDawn();
        break;
      case 'save':
        save();
        break;
      default:
    }
  }

  /** Reprend exactement là où la partie s'était arrêtée (G5.2). */
  function route(point) {
    switch (point) {
      case 'intro':
        g.save.progress.flags.introDone = true;
        openShop(g);
        save(true);
        showHud();
        break;
      case 'day':
        startDay(g, { resume: true });
        showHud();
        break;
      case 'night': {
        const takings = resumeNight(g);
        for (const f of g.furn) f.eyes = 1;
        startNight(g, { dayTakings: takings });
        showHud();
        break;
      }
      case 'dawn':
        if (!g.shop.phase.dawn) {
          showMorning();
          break;
        }
        g.phase = { name: 'dawn', t: 10 };
        showDawn();
        break;
      default:
        showMorning();
    }
  }

  const session = {
    /** Écrans du hub déjà branchés (les autres boutons affichent « Bientôt »). */
    hubScreens: new Set(HUB_SCREENS),
    /** Remplace l'ouverture des écrans du hub (tests, debug). @type {((id: string) => void) | null} */
    onHubButton: null,
    hub: () => hub,
    game: () => g,
    saver: () => saver,
    save,
    pause,
    /** Démarre (ou reprend) la partie depuis le stockage. */
    start() {
      const tNow = now();
      const loaded = loadSave(o.storage, { seed: seedFrom(tNow, 'nouvelle partie'), now: tNow, lang: o.lang });
      const data = loaded.data;
      data.stats.sessions++;
      g = createGame({ save: data });
      saver = new SaveManager(o.storage, data, { now }, loaded.text);
      saver.beforeWrite.push((d) => {
        d.lastSeenAt = now();
      });
      if (loaded.repaired && app.services.toast) app.services.toast(t('save.repaired'));
      play = createPlay(app, g, { onPause: pause, onEvent });
      app.setScene(play);
      if (session.onLoaded) session.onLoaded(g, loaded);
      route(resumePoint(g));
      save(true);
    },
    /** À chaque pas : sauvegarde automatique et temps de jeu. */
    step(dt) {
      if (!g || !saver) return;
      const name = g.phase.name;
      if (name === 'day' || name === 'closing' || name === 'night' || name === 'dusk') {
        g.save.stats.playtimeMs += dt * 1000;
        autosaveT += dt;
        if (autosaveT >= AUTOSAVE_S) {
          autosaveT = 0;
          save();
        }
      }
      saver.tick();
      checkWrites();
    },
    flush() {
      if (saver) saver.flush();
    },
    /**
     * La page passe en arrière-plan (téléphone verrouillé, appel) : en pleine action, on ouvre la pause,
     * pour que ce soit le joueur qui relance au retour (Sam, P1).
     */
    autoPause() {
      if (!g || !play || app.router.currentId() === 'title') return;
      const n = g.phase.name;
      if (n === 'day' || n === 'closing' || n === 'dusk' || n === 'night') pause();
    },
  };
  return session;
}
