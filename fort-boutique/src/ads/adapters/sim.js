// Fort Boutique — adaptateur de test (`?ads=sim` ou menu debug, B10) : écran plein « PUB DE TEST » de 3 s avec compte à
// rebours et bouton Fermer ; fermer avant la fin = pas de récompense.
export default {
  ready: () => true,
  rewarded: (app, id) => new Promise((resolve) => {
    app.router.push('ad', { id, kind: 'rewarded', onEnd: (full) => resolve(full ? { rewarded: true } : { rewarded: false, reason: 'closed' }) });
  }),
  interstitial: (app, id) => new Promise((resolve) => {
    app.router.push('ad', { id, kind: 'interstitial', onEnd: () => resolve({ shown: true }) });
  }),
};
