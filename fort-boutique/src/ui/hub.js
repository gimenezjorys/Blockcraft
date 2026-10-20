// Fort Boutique — écrans ouverts depuis le Matin (Catalogue, Améliorer, G20.8) et cartes de déblocage (G12.4).
import { t } from './i18n.js';
import { SVG } from './icons.js';
import { buyFurniture, autoPlaceFromStorage } from '../game/catalog.js';
import { upgradeFurniture } from '../game/economy.js';
import { buyMerchantUpgrade, upgradeRecipe, expandShop } from '../game/upgrades.js';
import { rebuildShop } from '../game/state.js';
import { unlockCards } from './screens/unlocks.js';

/** Écrans du hub déjà branchés (les autres boutons disent « Bientôt »). */
export const HUB_SCREENS = ['catalog', 'upgrades'];

/**
 * @param {any} app
 * @param {{ game: () => any, save: (force?: boolean) => void, refresh: () => void }} o
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
      const pending = g.save.progress.pendingUnlocks;
      if (!pending.length) return false;
      const levels = pending.slice();
      const clear = () => {
        for (const l of levels) if (!g.save.progress.unlocksSeen.includes(l)) g.save.progress.unlocksSeen.push(l);
        g.save.progress.pendingUnlocks = pending.filter((l) => !levels.includes(l));
        o.save(true);
      };
      if (!unlockCards(levels).length) {
        clear();
        return false;
      }
      app.router.push('unlocks', {
        levels,
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
