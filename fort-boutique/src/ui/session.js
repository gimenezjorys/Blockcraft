// Fort Boutique — la session de jeu : chargement, reprise (G5.2), transitions de phases, écrans, sauvegardes (B9).
import { now } from '../core/time.js';
import { seedFrom } from '../core/rng.js';
import { loadSave, SaveManager, serialize } from '../save/save.js';
import { defaultSave } from '../save/schema.js';
import { createGame, rebuildShop } from '../game/state.js';
import { resumePoint, enterMorning, openShop, markNightPending, resumeNight, enterDawn, openDawnChest, openExtraChest, leaveDawn } from '../game/cycle.js';
import { startDay } from '../game/day/day.js';
import { startNight } from '../game/night/night.js';
import { upgradeFurniture, canUpgrade } from '../game/economy.js';
import { isUnlocked, unlockedFurniture } from '../game/progression.js';
import { createPlay } from './play.js';
import { ADS } from '../data/balance.js';
import { t, setLang } from './i18n.js';
import { SVG } from './icons.js';
import { createHub, HUB_SCREENS } from './hub.js';
import { createObjective } from './objective.js';
import { forceArrow } from '../game/tutorial.js';
import { refreshQuests, questsClaimable } from '../game/quests.js';
import { calendarState } from '../game/calendar.js';
import { streakCheck } from '../game/streak.js';
import { checkAchievements } from '../game/achievements.js';
import { checkBestiary } from '../game/bestiary.js';
import { collectOffline } from '../game/offline.js';
import { dailyFirstAttempt } from '../game/daily.js';
import { checkEvent, eventState } from '../game/weekly-events.js';
import { createDailyFlow } from './daily-flow.js';
import { createAdFlow } from './ad-flow.js';
import { canShowInterstitial, noteInterstitial, noteCycle } from '../ads/ad-policy.js';
import { retryBossNight } from '../game/cycle.js';
import { grantReward } from '../game/rewards.js';
import { utcDay } from '../core/time.js';

/** G19 2:22 : la pluie de pièces se voit avant que le ticket de l'aube ne s'imprime (plus courte ensuite ; un tap l'abrège). */
const DAWN_DELAY_S = 2.5;
const DAWN_DELAY_LATER_S = 1.2;

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
  /** Compte à rebours avant l'écran de l'aube (pluie de pièces). */
  let dawnDelay = -1;

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

  const sfx = (id) => app.services.audio && app.services.audio.play(id);
  const wiggle = (el) => {
    sfx('error');
    el.classList.remove('nope');
    void el.offsetWidth;
    el.classList.add('nope');
  };

  function showHud() {
    app.router.goto('hud', {
      game: () => g,
      // Tap sur l'objectif pendant le Jour : la flèche dorée montre l'emplacement (G3.5) ; le reste se fait au Matin.
      // Jamais de « non » (P2, Léa) : la flèche dorée montre l'emplacement, ou ce qui est utile maintenant.
      onObjective: (o, el) => {
        sfx('ui_tap');
        forceArrow(g);
        el.classList.remove('pop');
        void el.offsetWidth;
        el.classList.add('pop');
      },
    });
  }

  /** Tap sur l'objectif au Matin : on emmène le joueur à l'endroit concerné (G3.5). */
  function morningObjective(o, el) {
    const pulse = (sel) => {
      const b = document.querySelector(sel);
      if (!b) return wiggle(el);
      sfx('ui_tap');
      b.classList.remove('hint-pulse');
      void b.offsetWidth;
      b.classList.add('hint-pulse');
      return null;
    };
    if (o.kind === 'pad') pulse('#hub-open');
    else if (o.kind === 'upgrade') hub.open('upgrades');
    else if (o.kind === 'moon') hub.open('moon');
    else if (o.kind === 'quest') pulse('#hub-quests');
    else if (o.kind === 'unlock') pulse(o.furniture ? '#hub-catalog' : `#hub-${o.feature}`);
  }

  function showMorning() {
    enterMorning(g);
    rebuildShop(g);
    // Rétention (G14, G15) : jours manqués (gels), quêtes du jour, succès et paliers du bestiaire gagnés.
    const t0 = now();
    streakCheck(g.save, t0);
    refreshQuests(g.save, t0);
    const achieved = checkAchievements(g.save, t0);
    const tiers = checkBestiary(g.save);
    const evWin = checkEvent(g.save, t0);
    if (achieved.length || tiers.length || evWin) save(true);
    renderMorning();
    const toast = (text, icon) => app.services.toast && app.services.toast(text, icon);
    for (const a of achieved) toast(t('ach.unlocked', { n: a.rubies }), SVG.star);
    for (const b of tiers) toast(t('best.tier', { name: t(`mon.${b.type}`), n: b.rubies }), SVG.ruby);
    if (evWin) toast(evWin.cosmetic ? t('event.won') : t('event.wonRubies', { n: evWin.rubies }), SVG.star);
    // Les déblocages se fêtent au Matin suivant (G12.4), puis le ticket « Pendant ton absence » (G16), puis le
    // calendrier s'ouvre seul s'il attend (G19 3:02).
    const calendar = () => session.hubScreens.has('calendar') && isUnlocked(g.save, 'calendar') && hub.autoCalendar();
    const away = () => {
      if (!hub.showAway(calendar)) calendar();
    };
    if (!hub.showUnlocks(away)) away();
  }

  /** Pastilles du hub : Aménager qui vient d'ouvrir (G19 6:50), une amélioration possible. */
  function hubBadges(game) {
    const save = game.save;
    return {
      editor: isUnlocked(save, 'editor') && !save.progress.flags.editorSeen,
      upgrades: unlockedFurniture(save).some((id) => canUpgrade(save, id).ok),
      quests: isUnlocked(save, 'quests') && questsClaimable(save, now()),
      daily: isUnlocked(save, 'daily') && dailyFirstAttempt(save, utcDay(now())),
      calendar: calendarState(save, now()).canClaim,
    };
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
      badges: hubBadges(g),
      onSettings: () => openSettings(),
      objective: (d) => createObjective(() => g, morningObjective, d),
      event: eventState(g.save, now()),
      hintOpen: g.save.stats.cycles < 3,
    });
  }

  const adFlow = createAdFlow(app, { game: () => g, save });
  const hub = createHub(app, { game: () => g, save, refresh: () => renderMorning(), daily: () => daily, ads: () => adFlow });
  const daily = createDailyFlow(app, { game: () => g, play: () => play, save, renderMorning: () => renderMorning() });

  function showDawn(resumed = false) {
    dawnDelay = -1;
    app.router.goto('dawn', {
      dawn: g.shop.phase.dawn,
      save: g.save,
      // Après un rechargement, le ticket s'imprime vite : on ne fait pas attendre deux fois (Sam).
      resumed,
      // Seule la toute première aube suit le rythme lent de G19 ; ensuite le ticket va vite (P2, Hugo).
      quick: g.save.stats.cycles >= 1,
      hints: g.save.stats.cycles < 3,
      onOpenChest: () => {
        const c = openDawnChest(g);
        save(true);
        return c;
      },
      onOpenExtra: (i) => {
        const c = openExtraChest(g, i);
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
        const r = g.shop.phase.dawn && g.shop.phase.dawn.result;
        const bossWin = !!(r && r.bossWin);
        leaveDawn(g);
        noteCycle(g.save);
        save(true);
        const ad = afterDawnAd(bossWin);
        if (ad) ad.then(() => showMorning());
        else showMorning();
      },
      // Pubs récompensées de l'aube (G18.1), toujours au choix du joueur.
      adReady: () => adFlow.ready('rw_double_night'),
      adOffer: () => adFlow.visible('rw_double_night', { night: g.save.stats.nights }),
      onDouble: () => adFlow.watch('rw_double_night', { night: g.save.stats.nights }, () => {
        const dw = g.shop.phase.dawn;
        if (!dw || dw.adDoubled) return;
        g.save.player.coins += dw.result.coins;
        dw.adDoubled = true;
      }),
      extraAds: dawnAds(),
    });
  }

  /** Pubs en plus à l'aube : +1 coffre en bois après ★★★ (3 par jour), revanche d'une Pleine Lune perdue (2 par jour). */
  function dawnAds() {
    const dw = () => g.shop.phase.dawn;
    return [
      {
        id: 'bonus-chest',
        label: t('ads.bonusChest'),
        visible: () => !!dw() && dw().result.stars === 3 && !dw().result.bossNight && !dw().bonusChest && adFlow.visible('rw_bonus_chest'),
        ready: () => adFlow.ready('rw_bonus_chest'),
        onWatch: () => adFlow.watch('rw_bonus_chest', {}, () => {
          const d = dw();
          if (!d || d.bonusChest) return;
          d.bonusChest = true;
          const r = grantReward(g.save, { chest: 'wood' }, { seed: seedFrom(g.save.seed, 'pub coffre', g.save.stats.nights) });
          app.router.push('reward', { title: t('ads.bonusChest'), rewards: [r], onClose: () => app.router.pop() });
        }),
      },
      {
        id: 'boss-retry',
        label: t('ads.bossRetry'),
        visible: () => !!dw() && !!dw().result.bossNight && !dw().result.bossWin && adFlow.visible('rw_boss_retry'),
        ready: () => adFlow.ready('rw_boss_retry'),
        onWatch: () => adFlow.watch('rw_boss_retry', {}, () => {
          if (!retryBossNight(g, ADS.rewarded.rw_boss_retry.dmgBonus)) return;
          startNight(g, { dayTakings: g.shop.phase.dayTakings || 0 });
          showHud();
        }),
      },
    ];
  }

  /**
   * Interstitielle it_dawn (G18.2) au passage Aube -> Matin, seulement si toutes les conditions sont vraies.
   * @returns {Promise<void> | null} null si aucune pub n'est montrée (le Matin s'ouvre tout de suite)
   */
  function afterDawnAd(bossWin) {
    const ads = app.services.ads;
    const unlocked = g.save.progress.pendingUnlocks.length > 0 || g.save.progress.pendingDistricts.length > 0;
    if (!ads || ads.adapter === 'none' || !canShowInterstitial(g.save, now(), { bossWin, unlocked }).ok) return null;
    return ads.showInterstitial('it_dawn').then((r) => {
      if (r && r.shown) {
        noteInterstitial(g.save, now());
        save(true);
      }
    });
  }

  /** Applique les réglages (volumes, grand texte, mode économie, langue). */
  function applySettings() {
    if (!g) return;
    const st = g.save.settings;
    if (app.services.audio) app.services.audio.setVolumes({ music: st.music, sfx: st.sfx });
    if (typeof document !== 'undefined') document.documentElement.style.setProperty('--ui-scale', st.bigText ? '1.15' : '1');
    if (app.economy !== !!st.economy) {
      app.economy = !!st.economy;
      app.refit();
    }
    setLang(st.lang);
  }

  /**
   * Remplace la partie (import ou réinitialisation) : écrit tout de suite (l'ancienne devient la copie de secours),
   * puis retour à l'écran titre ; la partie importée se charge au prochain tap, comme au lancement.
   * @param {any} data
   */
  function replaceSave(data) {
    if (!saver) return;
    dawnDelay = -1;
    saver.replace(data);
    app.loop.resume('menu');
    app.input.cancelAll();
    app.setScene(null);
    g = null;
    play = null;
    saver = null;
    app.router.goto('title');
  }

  /** Paramètres (rouage du Matin ou bouton de la pause), posés par-dessus l'écran courant. */
  function openSettings() {
    if (!g || app.router.has('settings')) return;
    app.router.push('settings', {
      save: g.save,
      version: app.version,
      importCtx: { seed: seedFrom(now(), 'import'), now: now(), lang: g.save.settings.lang },
      onChange: () => {
        applySettings();
        save();
      },
      onLang: (lang) => {
        g.save.settings.lang = lang;
        applySettings();
        save(true);
        // Les écrans se redessinent dans la nouvelle langue, Paramètres rouverts.
        const inPause = app.router.has('pause');
        app.router.pop();
        if (inPause) {
          app.router.pop();
          app.loop.resume('menu');
          pause();
        } else if (app.router.baseId() === 'morning') renderMorning();
        openSettings();
      },
      onReplace: (data) => replaceSave(data),
      onReset: () => {
        // Filet de sécurité : la partie effacée reste lisible sous une clé à part (jamais de perte silencieuse).
        try {
          o.storage.set('fortboutique.save.beforeReset', serialize(g.save));
        } catch {
          /* rien */
        }
        replaceSave(defaultSave({ seed: seedFrom(now(), 'nouvelle partie'), now: now(), lang: g.save.settings.lang }));
      },
      onClose: () => app.router.pop(),
    });
  }

  function pause() {
    if (app.router.has('pause')) return;
    app.loop.pause('menu');
    app.input.cancelAll();
    app.router.push('pause', {
      night: !!g && (g.phase.name === 'night' || g.phase.name === 'dusk'),
      onResume: () => {
        app.router.pop();
        app.loop.resume('menu');
      },
      onSettings: () => (session.onSettings ? session.onSettings() : openSettings()),
      onQuit: () => {
        // La pluie de pièces de l'aube ne doit pas ouvrir l'aube par-dessus l'écran titre.
        dawnDelay = -1;
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
        dawnDelay = g.save.stats.cycles === 0 ? DAWN_DELAY_S : DAWN_DELAY_LATER_S;
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
      case 'intro': {
        // G19 0:02 : la scène de l'enveloppe, puis le Jour 1 commence.
        const reg = g.register || { cx: 2.5, cy: 2.5 };
        app.router.goto('intro', {
          register: play.worldToScreen(reg.cx, reg.cy),
          door: play.worldToScreen(g.grid.door.x + 0.5, g.grid.h),
          onDone: () => {
            g.save.progress.flags.introDone = true;
            openShop(g);
            save(true);
            showHud();
          },
        });
        break;
      }
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
        showDawn(true);
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
    openSettings,
    /** Démarre (ou reprend) la partie depuis le stockage. */
    start() {
      const tNow = now();
      const loaded = loadSave(o.storage, { seed: seedFrom(tNow, 'nouvelle partie'), now: tNow, lang: o.lang });
      const data = loaded.data;
      data.stats.sessions++;
      // Retour après une absence (G16) : réserves pleines, gains du personnel, Coffre de Bienvenue.
      collectOffline(data, tNow);
      g = createGame({ save: data });
      saver = new SaveManager(o.storage, data, { now }, loaded.text);
      saver.beforeWrite.push((d) => {
        d.lastSeenAt = now();
      });
      if (loaded.repaired && app.services.toast) app.services.toast(t('save.repaired'));
      applySettings();
      play = createPlay(app, g, {
        onPause: pause,
        onEvent,
        // Un tap pendant la pluie de pièces passe directement au ticket.
        onTap: () => {
          if (dawnDelay > 0.15) dawnDelay = 0.15;
        },
      });
      app.setScene(play);
      if (session.onLoaded) session.onLoaded(g, loaded);
      route(resumePoint(g));
      save(true);
    },
    /** À chaque pas : sauvegarde automatique et temps de jeu. */
    step(dt) {
      if (!g || !saver) return;
      daily.step();
      if (dawnDelay >= 0) {
        dawnDelay -= dt;
        if (dawnDelay < 0 && app.router.baseId() === 'hud') showDawn();
      }
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
      if (daily.active()) {
        daily.pause();
        return;
      }
      const n = g.phase.name;
      if (n === 'day' || n === 'closing' || n === 'dusk' || n === 'night') pause();
    },
  };
  return session;
}
