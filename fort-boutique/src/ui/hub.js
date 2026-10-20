// Fort Boutique — écrans ouverts depuis le Matin (Catalogue, Améliorer, G20.8) et cartes de déblocage (G12.4).
import { t } from './i18n.js';
import { SVG } from './icons.js';
import { buyFurniture, autoPlaceFromStorage } from '../game/catalog.js';
import { upgradeFurniture } from '../game/economy.js';
import { buyMerchantUpgrade, upgradeRecipe, expandShop } from '../game/upgrades.js';
import { rebuildShop } from '../game/state.js';
import { unlockCards } from './screens/unlocks.js';
import { openEditor, commitEditor } from '../game/editor.js';
import { createEditorScene } from './editor-scene.js';
import { NIGHT } from '../data/night.js';

/** Écrans du hub déjà branchés (les autres boutons disent « Bientôt »). */
export const HUB_SCREENS = ['catalog', 'upgrades', 'editor', 'map', 'moon'];

/** Quartiers dont le contenu est prêt (M16 à M19 ajoutent les suivants). */
export const PLAYABLE_DISTRICTS = ['q1'];

/**
 * @param {any} app
 * @param {{ game: () => any, save: (force?: boolean) => void, refresh: () => void, switchShop?: (id: string) => void }} o
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

  const screens = {
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
        onClose: close,
      });
    },
    /** Aperçu de la Pleine Lune (G8.9) en touchant la lune du Matin. */
    moon(g) {
      app.router.push('moon', {
        boss: g.district.boss,
        nightsLeft: Math.max(1, 8 - g.shop.night),
        courage: Math.min(NIGHT.assistMax, NIGHT.assistPerFail * (g.shop.bossAssist || 0)),
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
    catalog(g) {
      app.router.push('catalog', {
        g,
        onBuy: (id) => {
          if (!buyFurniture(g.save, g.shopId, id)) return false;
          // Acheter puis placer : le meuble se pose à la meilleure place libre ; sinon il attend dans la Réserve (Aménager).
          const spot = autoPlaceFromStorage(g.save, g.shopId, id);
          rebuildShop(g);
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
    showUnlocks(onDone) {
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
