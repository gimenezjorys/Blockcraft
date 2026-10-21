// Fort Boutique — écran titre (G19 0:00) : l'enseigne ouvre les yeux, un doigt tape.
import { h, onTap } from '../widgets.js';
import { t } from '../i18n.js';
import { logoSvg, fingerSvg } from '../../render/sprites/logo.js';

export default {
  /**
   * @param {{ onTitleTap: () => void, version?: object }} ctx
   */
  mount(ctx, params, d) {
    const el = h('div.title-screen', { role: 'button', 'aria-label': t('title.tap') }, [
      h('div.title-stars'),
      h('div.title-logo', { html: logoSvg({ animate: true, title: t('game.name') }) }),
      h('p.title-tagline', { text: t('game.tagline') }),
      h('div.title-tap', [h('div.title-finger', { html: fingerSvg() }), h('span', { text: t('title.tap') })]),
    ]);
    onTap(el, () => ctx.onTitleTap(), d);
    return {
      el,
      onKey(key) {
        if (key === 'Enter' || key === ' ') {
          ctx.onTitleTap();
          return true;
        }
        return false;
      },
    };
  },
};
