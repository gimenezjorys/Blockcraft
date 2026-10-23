// Fort Boutique — écrans ouverts depuis le Matin (Catalogue, Améliorer, G20.8) et cartes de déblocage (G12.4).
import { t } from './i18n.js';
import { SVG } from './icons.js';
import { buyFurniture, autoPlaceFromStorage } from '../game/catalog.js';
import { upgradeFurniture } from '../game/economy.js';
import { buyMerchantUpgrade, upgradeRecipe, expandShop } from '../game/upgrades.js';
import { rebuildShop } from '../game/state.js';
import { syncSlots } from '../game/plans.js';
import { unlockCards } from './screens/unlocks.js';
import { openEditor, commitEditor } from '../game/editor.js';
import { createEditorScene } from './editor-scene.js';
import { NIGHT, courageThin, courageAssist } from '../data/night.js';
import { countdown } from './screens/quests.js';
import { refreshQuests, claimQuest, claimWeekly, rerollQuest } from '../game/quests.js';
import { calendarState, claimCalendar } from '../game/calendar.js';
import { relightStreak } from '../game/streak.js';
import { levelUpCat } from '../game/cat.js';
import { hireStaff, upgradeStaff } from '../game/staff.js';
import { buyCosmetic, equipCosmetic } from '../game/cosmetics.js';
import { ADS } from '../data/balance.js';
import { now, utcDay } from '../core/time.js';
import { trackQuest } from '../game/quest-track.js';
import { startFranchise } from '../game/franchise.js';

/** Écrans du hub déjà branchés (les autres boutons disent « Bientôt »). */
export const HUB_SCREENS = ['catalog', 'upgrades', 'plans', 'editor', 'map', 'moon', 'quests', 'calendar', 'daily', 'wardrobe', 'endless'];

/** Quartiers dont le contenu est prêt (M16 à M19 ajoutent les suivants). */
export const PLAYABLE_DISTRICTS = ['q1', 'q2', 'q3', 'q4', 'q5'];

/**
 * @param {any} app
 * @param {{ game: () => any, save: (force?: boolean) => void, refresh: () => void, switchShop?: (id: string) => void,
 *   daily?: () => any, endless?: () => any, ads?: () => any }} o
 */
export function createHub(app, o) {
  const toast = (text, icon) => app.services.toast && app.services.toast(text, icon);

  /** Le niveau global d'un meuble a changé : les exemplaires posés le prennent tout de suite. */
  function syncLevel(g, id) {
    const st = g.save.furniture[id];
    for (const f of g.furn) if (f.id === id && st) f.level = st.level;
  }

  function close() {
    app.router.pop();
    o.refresh();
  }

  /** Après un changement de plan (V4) : chaque meuble glisse de son ancienne place vers la nouvelle. */
  function slideFrom(g, before) {
    const used = new Set();
    const pick = (f) => {
      let k = before.findIndex((b, i) => !used.has(i) && b.id === f.id && b.x === f.x && b.y === f.y);
      if (k < 0) k = before.findIndex((b, i) => !used.has(i) && b.id === f.id);
      if (k >= 0) used.add(k);
      return k >= 0 ? before[k] : null;
    };
    for (const f of g.furn) {
      const b = pick(f);
      if (b && (b.x !== f.x || b.y !== f.y)) f.slide = { dx: b.x - f.x, dy: b.y - f.y, t: 1 };
      else if (!b) f.jump = 1;
    }
  }

  /** Pubs récompensées (ad-flow.js) ; sans elles, rien n'est proposé. */
  const ads = () => (o.ads ? o.ads() : null);
  function adOption(id, onReward) {
    const a = ads();
    if (!a) return null;
    return { visible: () => a.visible(id), ready: () => a.ready(id), watch: (done) => a.watch(id, {}, () => { onReward(); if (done) done(); }) };
  }

  /** Fenêtre de gains par-dessus l'écran courant (un tap ferme). */
  function showReward(title, rewards) {
    app.router.push('reward', { title, rewards, onClose: () => app.router.pop() });
  }

  const screens = {
    /** Garde-robe (G17) : acheter avec des rubis, porter ; +3 rubis avec une pub (masqué sans régie). */
    wardrobe(g, tab) {
      let inst = null;
      const a = ads();
      inst = app.router.push('wardrobe', {
        save: g.save,
        tab,
        onBuy: (id) => {
          const ok = buyCosmetic(g.save, id, now());
          if (ok) o.save(true);
          return ok;
        },
        onEquip: (id) => {
          const ok = equipCosmetic(g.save, id);
          if (ok) o.save(true);
          return ok;
        },
        adRubies: a ? {
          visible: a.visible('rw_daily_rubies') && a.ready('rw_daily_rubies'),
          ready: true,
          onWatch: () => a.watch('rw_daily_rubies', {}, () => {
            g.save.player.rubies += ADS.rewarded.rw_daily_rubies.rubies;
            if (inst && inst.refresh) inst.refresh();
          }),
        } : null,
        onClose: close,
      });
    },
    /** Défi du jour (G13.3) : déroulé dans daily-flow.js. */
    daily() {
      if (o.daily) o.daily().open();
    },
    /** Quêtes du jour et de la semaine, succès, bestiaire (G14). */
    quests(g, tab) {
      refreshQuests(g.save, now());
      app.router.push('quests', {
        save: g.save,
        tab,
        onClaim: (i) => {
          const r = claimQuest(g.save, i);
          if (!r) return null;
          o.save(true);
          showReward(t('quests.done'), [r.reward, r.bonus].filter(Boolean));
          return r;
        },
        onClaimWeekly: (i) => {
          const r = claimWeekly(g.save, i);
          if (!r) return null;
          o.save(true);
          showReward(t('quests.done'), [r.reward, r.bonus].filter(Boolean));
          return r;
        },
        onReroll: (i) => {
          const ok = rerollQuest(g.save, i);
          if (ok) o.save(true);
          return ok;
        },
        // Relance par pub (rw_quest_reroll, 1 par jour) une fois la relance gratuite utilisée.
        adReroll: ads() ? { visible: () => ads().visible('rw_quest_reroll'), ready: () => ads().ready('rw_quest_reroll'),
          watch: (i, done) => ads().watch('rw_quest_reroll', {}, () => { if (rerollQuest(g.save, i, { ad: true })) done(); }) } : null,
        onClose: close,
      });
    },
    /** Calendrier de 7 jours et flamme de la boutique (G15). */
    calendar(g) {
      app.router.push('calendar', {
        save: g.save,
        onClaim: (choiceId) => {
          const r = claimCalendar(g.save, now(), choiceId);
          if (!r) return null;
          o.save(true);
          showReward(t('calendar.day', { n: r.day }), [r.reward]);
          return r;
        },
        onRelight: () => {
          const ok = relightStreak(g.save, now());
          if (ok) o.save(true);
          return ok;
        },
        // Rallumer avec une pub (rw_streak_restore, une fois par semaine).
        adRelight: adOption('rw_streak_restore', () => relightStreak(g.save, now(), { ad: true })),
        onClose: close,
      });
    },
    /** Carte des quartiers (G13.1). */
    map(g) {
      app.router.push('map', {
        save: g.save,
        current: g.shopId,
        playable: PLAYABLE_DISTRICTS,
        onGo: (id) => {
          app.router.pop();
          if (o.switchShop) o.switchShop(id);
        },
        onEndless: o.endless ? () => {
          app.router.pop();
          o.endless().open();
        } : undefined,
        // Franchise (G13.4) : semaine 1, Lune rouge ; la disposition et les meubles restent.
        onFranchise: (id) => {
          if (!startFranchise(g.save, id)) return;
          o.save(true);
          close();
          toast(t('map.franchised'), SVG.check);
        },
        onClose: close,
      });
    },
    /** Aperçu de la Pleine Lune (G8.9) en touchant la lune du Matin. */
    moon(g) {
      app.router.push('moon', {
        boss: g.district.boss,
        nightsLeft: Math.max(1, 8 - g.shop.night),
        courage: courageAssist(g.shop.bossAssist || 0),
        thin: 1 - courageThin(g.shop.bossAssist || 0),
        onClose: () => app.router.pop(),
      });
    },
    /** Aménager (G6.5) : la scène canvas remplace la boutique le temps de l'édition. */
    editor(g) {
      const ed = openEditor(g.shop, g.shopId);
      const prev = app.scene();
      const flags = g.save.progress.flags;
      let inst = null;
      const refresh = () => inst && inst.refresh();
      const scene = createEditorScene(app, ed, {
        theme: g.save.cosmetics.equipped.theme,
        onChange: () => {
          if (app.services.audio) app.services.audio.play('drop');
          refresh();
        },
        onSelect: () => refresh(),
        onInvalid: () => {
          if (app.services.audio) app.services.audio.play('error');
          if (app.services.vibrate) app.services.vibrate(20);
          refresh();
        },
      });
      // Plein écran (G6.5) : l'éditeur remplace le hub, qui est redessiné au retour.
      const leave = () => {
        app.setScene(prev);
        o.refresh();
      };
      app.setScene(scene);
      inst = app.router.goto('editor', {
        scene,
        ed,
        // Conseil de Mamie si la dernière nuit était à une étoile (ou perdue).
        showAdvice: g.shop.lastNightStars !== undefined && g.shop.lastNightStars !== null && g.shop.lastNightStars <= 1 && g.save.stats.nights > 0,
        // Première ouverture : la main fantôme propose un déplacement (G19 6:50).
        hintFirst: !flags.editorSeen,
        onValidate: () => {
          if (!commitEditor(ed, g.shop)) {
            if (app.services.audio) app.services.audio.play('error');
            return;
          }
          flags.editorSeen = true;
          g.save.stats.moved = (g.save.stats.moved || 0) + ed.moves;
          trackQuest(g.save, 'move', ed.moves);
          rebuildShop(g);
          if (app.services.audio) app.services.audio.play('upgrade');
          o.save(true);
          leave();
        },
        onCancel: () => {
          flags.editorSeen = true;
          o.save(true);
          leave();
        },
      });
    },
    /** Plans de boutique (V4) : choisir un plan, échanger deux meubles. Gratuit, au Matin. */
    plans(g) {
      app.router.push('plans', {
        g,
        onChoose: (planId, layout, storage, moves) => {
          const shop = g.shop;
          const before = shop.layout.map((it) => ({ ...it }));
          shop.layout = layout.map((it) => ({ ...it }));
          shop.storage = storage.slice();
          shop.plan = planId;
          syncSlots(g.shopId, shop);
          g.save.progress.flags.planChosen = true;
          if (moves > 0) {
            g.save.stats.moved = (g.save.stats.moved || 0) + moves;
            trackQuest(g.save, 'move', moves);
          }
          rebuildShop(g);
          slideFrom(g, before);
          o.save(true);
          close();
        },
        onClose: close,
      });
    },
    catalog(g) {
      app.router.push('catalog', {
        g,
        onBuy: (id) => {
          if (!buyFurniture(g.save, g.shopId, id)) return false;
          // Acheter puis placer : le meuble se pose à la meilleure place libre ; sinon il attend dans la Réserve (Aménager).
          const spot = autoPlaceFromStorage(g.save, g.shopId, id);
          rebuildShop(g);
          // v1.1 (V3) : il tombe à sa place prévue (animation de chute).
          const f = spot && g.furn.find((x) => x.x === spot.x && x.y === spot.y);
          if (f) f.jump = 1;
          toast(t(spot ? 'catalog.placed' : 'catalog.stored', { name: t(`furn.${id}`) }), spot ? SVG.check : SVG.lock);
          o.save(true);
          return true;
        },
        onClose: close,
      });
    },
    upgrades(g, tab) {
      app.router.push('upgrades', {
        g,
        tab,
        onUpgradeFurniture: (id) => {
          if (!upgradeFurniture(g.save, id)) return false;
          syncLevel(g, id);
          o.save(true);
          return true;
        },
        onMerchant: (id) => {
          if (!buyMerchantUpgrade(g.save, id)) return false;
          o.save(true);
          return true;
        },
        onRecipe: (product) => {
          if (!upgradeRecipe(g.save, g.shopId, product)) return false;
          o.save(true);
          return true;
        },
        onCat: () => {
          if (!levelUpCat(g.save)) return false;
          o.save(true);
          return true;
        },
        onStaff: (action, role, i) => {
          const ok = action === 'hire' ? hireStaff(g.save, g.shopId, role) : upgradeStaff(g.save, g.shopId, role, i);
          if (ok) o.save(true);
          return ok;
        },
        onExpand: () => {
          if (!expandShop(g.save, g.shopId)) return false;
          rebuildShop(g);
          o.save(true);
          return true;
        },
        onClose: close,
      });
    },
  };

  return {
    /**
     * Ticket « Pendant ton absence » (G16), une fois : réserves pleines, pièces du personnel, lettre de Mamie et Coffre
     * de Bienvenue. Les gains sont déjà versés au chargement (rien ne se perd si l'onglet se ferme).
     * @returns {boolean}
     */
    showAway(onDone) {
      const g = o.game();
      const pd = g.save.offline.pendingDelivery;
      if (!pd) return false;
      g.save.offline.pendingDelivery = null;
      o.save(true);
      // ×2 avec une pub (rw_morning_delivery, une fois par retour) quand le personnel a rapporté des pièces.
      const double = pd.coins > 0 ? adOption('rw_morning_delivery', () => {
        g.save.player.coins += pd.coins;
      }) : null;
      app.router.push('reward', {
        title: t('offline.title'),
        action: double && double.visible() ? { label: t('ads.double'), ready: double.ready(), watch: double.watch } : null,
        subtitle: countdown(pd.minutes * 60000),
        lines: [t('offline.stock'), pd.welcome ? t('offline.letter') : null].filter(Boolean),
        rewards: [pd.coins ? { coins: pd.coins } : null, pd.welcome ? { chest: pd.welcome } : null].filter(Boolean),
        onClose: () => {
          app.router.pop();
          if (onDone) onDone();
        },
      });
      return true;
    },
    /**
     * Le calendrier s'ouvre seul une fois par jour UTC quand une récompense attend (G19 3:02).
     * @returns {boolean}
     */
    autoCalendar() {
      const g = o.game();
      const flags = g.save.progress.flags;
      const today = utcDay(now());
      if (flags.calendarAutoDay === today || !calendarState(g.save, now()).canClaim) return false;
      flags.calendarAutoDay = today;
      screens.calendar(g);
      return true;
    },
    /**
     * Ouvre l'écran d'un bouton du hub.
     * @param {string} id
     * @returns {boolean} vrai si un écran s'est ouvert
     */
    open(id, arg) {
      const fn = screens[id];
      if (!fn) return false;
      fn(o.game(), arg);
      return true;
    },
    /**
     * Cartes des déblocages gagnés depuis le dernier Matin (au plus 3, G12.4). La liste n'est vidée qu'une fois les
     * cartes vues : si l'onglet se ferme avant, elles reviennent au prochain Matin.
     * @param {() => void} [onDone]
     * @returns {boolean} vrai si des cartes sont affichées
     */
    showUnlocks(onDone, { celebrated = true } = {}) {
      const g = o.game();
      const prog = g.save.progress;
      const pending = prog.pendingUnlocks;
      const pendingD = prog.pendingDistricts;
      if (!pending.length && !pendingD.length) return false;
      const levels = pending.slice();
      const districts = pendingD.slice();
      const clear = () => {
        for (const l of levels) if (!prog.unlocksSeen.includes(l)) prog.unlocksSeen.push(l);
        prog.pendingUnlocks = prog.pendingUnlocks.filter((l) => !levels.includes(l));
        prog.pendingDistricts = prog.pendingDistricts.filter((id) => !districts.includes(id));
        o.save(true);
      };
      if (!unlockCards(levels, { save: g.save, districts }).length) {
        clear();
        return false;
      }
      app.router.push('unlocks', {
        levels,
        districts,
        save: g.save,
        // Les niveaux viennent de l'aube (ruban et fanfare déjà vus) ; les quêtes du Matin (M12) passeront false.
        celebrated,
        onDone: () => {
          clear();
          app.router.pop();
          if (onDone) onDone();
        },
      });
      return true;
    },
  };
}
