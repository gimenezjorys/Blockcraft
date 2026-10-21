// Fort Boutique — étiquette kraft « Prochain objectif » (G3.5), au Matin et pendant le Jour.
// Pendant les 10 premières minutes, aucun mot (G19) : une icône, un nombre, une barre. Le nom est dans aria-label.
import { h, onTap } from './widgets.js';
import { t, fmt } from './i18n.js';
import { SVG, furnitureIcon } from './icons.js';
import { nextObjective, objectiveKey } from '../game/objectives.js';

/** Icône d'une fonction débloquée (sans texte). */
const FEATURE_ICON = { editor: SVG.rotate, quests: SVG.scroll, daily: SVG.star, calendar: SVG.check, merchantUpgrades: SVG.arrowUp };

/**
 * @param {() => any} game
 * @param {(o: ReturnType<typeof nextObjective>) => void} onPick tap : « emmène à l'endroit concerné »
 * @param {import('../core/events.js').Disposer} d
 */
export function createObjective(game, onPick, d) {
  const el = h('button.objective.interactive', { type: 'button', 'aria-label': t('hud.objective'), id: 'objective' });
  let key = '';
  let current = null;
  // Les icônes de meubles sont des petits canvas : on les garde pour ne pas les redessiner à chaque pièce payée.
  const icons = new Map();
  const icon = (id, sil) => {
    const k = `${id}:${sil ? 1 : 0}`;
    if (!icons.has(k)) {
      const c = furnitureIcon(id, 26);
      if (sil) c.classList.add('silhouette');
      icons.set(k, c);
    }
    return icons.get(k);
  };

  function render(o) {
    el.innerHTML = '';
    el.dataset.kind = o.kind;
    el.appendChild(h('span.tag-hole'));
    const ico = h('span.obj-ico');
    let num = null;
    if (o.kind === 'pad') {
      ico.appendChild(icon(o.furniture, false));
      num = h('span.obj-num', [h('span.money-ico', { html: SVG.coin }), h('span', { text: fmt(o.remaining) })]);
    } else if (o.kind === 'upgrade') {
      ico.appendChild(icon(o.furniture, false));
      num = h('span.obj-num.up', { html: SVG.arrowUp });
    } else if (o.kind === 'quest') {
      ico.innerHTML = SVG.scroll;
    } else if (o.kind === 'unlock') {
      if (o.furniture) ico.appendChild(icon(o.furniture, true));
      else ico.innerHTML = FEATURE_ICON[o.feature] || SVG.lock;
      num = h('span.obj-num.lvl', [h('span.req-ico', { html: SVG.lock }), h('span', { text: String(o.level) })]);
    } else {
      ico.innerHTML = SVG.moon;
      num = h('span.obj-num', { text: String(o.nights) });
    }
    const fill = h('span.obj-fill');
    fill.style.width = `${Math.round(o.progress * 100)}%`;
    el.append(ico, h('span.obj-body', [num, h('span.obj-bar', [fill])].filter(Boolean)));
  }

  function update() {
    const g = game();
    if (!g) return;
    const o = nextObjective(g);
    current = o;
    const k = objectiveKey(o);
    if (k === key) return;
    const changed = key && key.split(':')[0] + key.split(':')[1] !== k.split(':')[0] + k.split(':')[1];
    key = k;
    render(o);
    if (changed) {
      // Nouvel objectif : petit saut de l'étiquette.
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    }
  }

  onTap(el, () => current && onPick(current), d);
  update();
  return { el, update, current: () => current };
}
