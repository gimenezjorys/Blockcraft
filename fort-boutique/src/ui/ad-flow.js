// Fort Boutique — pubs récompensées dans l'interface (G18.1) : un bouton n'apparaît que lorsque la règle le permet
// (jamais pendant le jeu ni les 10 premières minutes, plafonds) ; sans régie il reste grisé (sauf « +3 rubis », masqué).
// La récompense n'est donnée que si la pub a été vue jusqu'au bout.
import { t } from './i18n.js';
import { SVG } from './icons.js';
import { now } from '../core/time.js';
import { canOfferRewarded, noteRewarded } from '../ads/ad-policy.js';

/**
 * @param {any} app
 * @param {{ game: () => any, save: (force?: boolean) => void }} o
 */
export function createAdFlow(app, o) {
  const ads = () => app.services.ads;
  const ctxOf = (g, ctx) => ({ phase: g.phase.name === 'morning' || g.phase.name === 'dawn' || g.phase.name === 'free' ? 'menu' : g.phase.name, ...ctx });

  /** Le bouton de ce placement doit-il être montré ? */
  function visible(id, ctx = {}) {
    const g = o.game();
    return !!g && canOfferRewarded(g.save, id, now(), ctxOf(g, ctx)).ok;
  }

  /** Une régie est prête (sinon bouton grisé + « Pub indisponible »). */
  function ready(id) {
    return !!(ads() && ads().isRewardedReady(id));
  }

  /**
   * Montre la pub ; `onReward` n'est appelé que si elle a été vue jusqu'au bout.
   * @returns {Promise<boolean>}
   */
  async function watch(id, ctx, onReward) {
    const g = o.game();
    if (!g || !visible(id, ctx)) return false;
    if (!ready(id)) {
      if (app.services.toast) app.services.toast(t('ad.unavailable'), SVG.tvOff);
      return false;
    }
    const r = await ads().showRewardedAd(id);
    if (!r || !r.rewarded) {
      if (r && r.reason !== 'closed' && app.services.toast) app.services.toast(t('ad.unavailable'), SVG.tvOff);
      return false;
    }
    noteRewarded(g.save, id, now(), ctxOf(g, ctx));
    onReward();
    o.save(true);
    return true;
  }

  return { visible, ready, watch };
}
