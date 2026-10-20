// Fort Boutique — aperçu de la Pleine Lune (G8.9) : le boss qui arrive, le nombre de nuits, le Courage de Mamie.
// Ouvert en touchant la lune du Matin (P1, Hugo) ; un tap n'importe où ferme.
import { h, onTap } from '../widgets.js';
import { t } from '../i18n.js';
import { SVG, monsterIcon } from '../icons.js';

/**
 * @param {any} app
 * @param {{ boss: string, nightsLeft: number, courage: number, onClose: () => void }} p
 */
function mount(app, p, d) {
  const when = p.nightsLeft <= 1 ? t('moon.tonight') : t('moon.in', { n: p.nightsLeft });
  const dots = h('div.moon-dots', Array.from({ length: 7 }, (_, i) => h('span.moon-dot', { 'data-on': i < 7 - (p.nightsLeft - 1) ? '1' : '0' })));
  const panel = h('div.slate.moon-panel', [
    h('div.moon-big', { html: SVG.moon }),
    h('div.moon-boss', [monsterIcon(p.boss, 110)]),
    h('h2.sticker.moon-name', { text: t(`mon.${p.boss}`) }),
    h('div.moon-when', { text: when }),
    dots,
    p.courage > 0 ? h('div.moon-courage', { text: t('night.courage', { n: Math.round(p.courage * 100) }) }) : null,
  ]);
  const el = h('div.overlay', [panel]);
  onTap(el, () => p.onClose(), d);
  return {
    el,
    onKey() {
      p.onClose();
      return true;
    },
  };
}

export default { mount, overlay: true };
