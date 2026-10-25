// Fort Boutique — squelette Poki (inactif, B10). Pour le brancher plus tard : charger le SDK Poki dans la page publiée
// (hors de ce fichier autonome), puis `PokiSDK.rewardedBreak()` dans `rewarded` et `PokiSDK.commercialBreak()` dans
// `interstitial` ; `ready` vérifie que le SDK est initialisé. Tant que le SDK n'existe pas, tout reste indisponible.
export default {
  ready: () => false,
  rewarded: async () => ({ rewarded: false, reason: 'unavailable' }),
  interstitial: async () => ({ shown: false }),
};
