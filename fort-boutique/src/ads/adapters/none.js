// Fort Boutique — adaptateur sans régie (par défaut, B10) : rien n'est prêt, tout échoue proprement et tout de suite.
export default {
  ready: () => false,
  rewarded: async () => ({ rewarded: false, reason: 'unavailable' }),
  interstitial: async () => ({ shown: false }),
};
