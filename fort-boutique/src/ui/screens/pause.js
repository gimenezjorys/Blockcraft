// Fort Boutique — pause (ardoise) : reprendre, son, quitter vers l'écran titre. Paramètres complets en M25.
import { h, onTap, tagButton } from '../widgets.js';
import { t } from '../i18n.js';
import { SVG } from '../icons.js';

/**
 * @param {any} app
 * @param {{ onResume: () => void, onSettings?: (() => void) | null, onQuit: () => void }} p
 */
function mount(app, p, d) {
  const resume = tagButton({ label: t('pause.resume'), variant: 'green', id: 'pause-resume' });
  const settings = tagButton({ label: t('hub.settings'), variant: 'kraft', id: 'pause-settings' });
  // Paramètres complets en M25 : d'ici là, le bouton dit « Bientôt » au lieu de ne rien faire.
  if (!p.onSettings) {
    settings.classList.add('locked', 'soon');
    settings.insertBefore(h('span.tag-icon.lock-ico', { html: SVG.lock }), settings.querySelector('.tag-label'));
  }
  const quit = tagButton({ label: t('pause.quit'), variant: 'coral', small: true, id: 'pause-quit' });
  // Sam (P1) : on peut tout fermer sans rien perdre, et on le dit.
  const saved = h('div.pause-saved', [h('span.pause-saved-ico', { html: SVG.check }), h('span', { text: t('pause.saved') })]);
  const panel = h('div.slate.pause-panel', [h('h2.sticker.pause-title', { text: t('pause.title') }), resume, settings, quit, saved]);
  const el = h('div.overlay', [panel]);
  onTap(resume, () => p.onResume(), d);
  onTap(settings, () => {
    if (p.onSettings) {
      p.onSettings();
      return;
    }
    if (app.services.audio) app.services.audio.play('error');
    settings.classList.remove('nope');
    void settings.offsetWidth;
    settings.classList.add('nope');
    if (app.services.toast) app.services.toast(t('hub.soon'), SVG.lock);
  }, d);
  onTap(quit, () => p.onQuit(), d);
  return {
    el,
    onKey(key) {
      if (key === 'Escape' || key === 'Enter') {
        p.onResume();
        return true;
      }
      return true;
    },
  };
}

export default { mount, overlay: true };
