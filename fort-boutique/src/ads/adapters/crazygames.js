// Fort Boutique — squelette CrazyGames (inactif, B10). Pour le brancher plus tard : SDK CrazyGames v3 chargé par la page
// publiée, puis `window.CrazyGames.SDK.ad.requestAd('rewarded', callbacks)` dans `rewarded` et `requestAd('midgame')`
// dans `interstitial` ; `ready` vérifie la présence du SDK. Tant qu'il n'existe pas, tout reste indisponible.
export default {
  ready: () => false,
  rewarded: async () => ({ rewarded: false, reason: 'unavailable' }),
  interstitial: async () => ({ shown: false }),
};
