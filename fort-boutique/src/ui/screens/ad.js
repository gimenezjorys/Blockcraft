// Fort Boutique — « PUB DE TEST » (adaptateur sim, B10) : écran plein de 3 s avec compte à rebours et bouton Fermer.
// Fermer avant la fin : pas de récompense.
import { h, onTap, tagButton } from '../widgets.js';
import { t } from '../i18n.js';
import { SVG } from '../icons.js';
import { ADS } from '../../data/balance.js';

/**
 * @param {any} app
 * @param {{ id: string, kind: 'rewarded' | 'interstitial', onEnd: (full: boolean) => void }} p
 */
function mount(app, p, d) {
  let left = ADS.simDurationS;
  let ended = false;
  const count = h('div.ad-count', { text: String(Math.ceil(left)) });
  const close = tagButton({ label: t('ad.close'), small: true, variant: 'kraft', id: 'ad-close' });
  const end = (full) => {
    if (ended) return;
    ended = true;
    app.router.pop();
    p.onEnd(full);
  };
  onTap(close, () => end(left <= 0), d);
  const el = h('div.overlay.ad-screen', [
    h('div.slate.ad-panel', [h('div.ad-ico', { html: SVG.tv }), h('h2.sticker', { text: t('ad.test') }), h('div.up-note', { text: p.id }), count, close]),
  ]);
  return {
    el,
    update(dt) {
      if (ended) return;
      left -= dt;
      count.textContent = left > 0 ? String(Math.ceil(left)) : '✓';
      if (left <= 0) end(true);
    },
    onKey(key) {
      if (key === 'Escape') end(left <= 0);
      return true;
    },
  };
}

export default { mount, overlay: true };
