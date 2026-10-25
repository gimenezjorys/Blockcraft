// Fort Boutique — publicités (B10) : isRewardedReady, showRewardedAd, showInterstitial, setAdapter. Son coupé pendant
// la pub, délai maximum (45 s / 20 s) puis échec propre ; la récompense n'est donnée que si `rewarded` est vrai.
// Les pubs ne se montrent qu'au Matin et à l'Aube (G18.3) : rien ne tourne pendant ce temps.
import { ADS } from '../data/balance.js';
import none from './adapters/none.js';
import sim from './adapters/sim.js';
import poki from './adapters/poki.js';
import crazygames from './adapters/crazygames.js';

const ADAPTERS = { none, sim, poki, crazygames };

/**
 * @param {any} app
 */
export function createAds(app) {
  let name = 'none';
  let busy = false;

  /** Lance une pub avec un délai maximum compté par la boucle du jeu (temps simulé dans les tests). */
  function run(start, fallback, timeoutMs) {
    if (busy) return Promise.resolve(fallback);
    busy = true;
    const audio = app.services.audio;
    if (audio && audio.mute) audio.mute('ad');
    return new Promise((resolve) => {
      let left = timeoutMs / 1000;
      let done = false;
      const finish = (r) => {
        if (done) return;
        done = true;
        busy = false;
        app.stepHooks.splice(app.stepHooks.indexOf(tick), 1);
        if (audio && audio.unmute) audio.unmute('ad');
        resolve(r);
      };
      const tick = (dt) => {
        left -= dt;
        if (left <= 0) {
          if (app.router.has('ad')) app.router.pop();
          finish(fallback);
        }
      };
      app.stepHooks.push(tick);
      // L'écran de la pub s'ouvre tout de suite (pas d'attente d'une micro-tâche).
      let p;
      try {
        p = Promise.resolve(start());
      } catch {
        p = Promise.resolve(fallback);
      }
      p.then((r) => finish(r || fallback), () => finish(fallback));
    });
  }

  return {
    get adapter() {
      return name;
    },
    setAdapter(n) {
      if (ADAPTERS[n]) name = n;
    },
    isRewardedReady(id) {
      return !busy && ADAPTERS[name].ready(app, id);
    },
    showRewardedAd(id) {
      return run(() => ADAPTERS[name].rewarded(app, id), { rewarded: false, reason: 'timeout' }, ADS.rewardedTimeoutMs);
    },
    showInterstitial(id) {
      return run(() => ADAPTERS[name].interstitial(app, id), { shown: false, reason: 'timeout' }, ADS.interstitialTimeoutMs);
    },
  };
}
