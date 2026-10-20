// Fort Boutique — petits messages discrets (« Boutique réparée », « Pub indisponible »…), animés par la boucle.
import { h } from './widgets.js';

/**
 * @param {HTMLElement} root conteneur #app
 */
export function createToasts(root) {
  const layer = h('div.toasts');
  root.appendChild(layer);
  /** @type {Array<{ el: HTMLElement, t: number, life: number }>} */
  const list = [];
  // Petite coche « sauvegardé » (sans texte, G19) : clignote 1 s en bas à gauche.
  const saved = h('div.save-tick', { 'aria-hidden': 'true' });
  root.appendChild(saved);
  let savedT = -1;
  let savedShownAt = -1e9;
  let clock = 0;
  return {
    /**
     * Affiche la coche de sauvegarde (au plus une fois toutes les 8 s pour ne pas clignoter sans cesse).
     * @param {string} iconSvg
     */
    flashSaved(iconSvg) {
      if (clock - savedShownAt < 8) return;
      savedShownAt = clock;
      if (!saved.firstChild) saved.innerHTML = iconSvg;
      saved.classList.add('show');
      savedT = 1.1;
    },
    savedVisible: () => saved.classList.contains('show'),
    /**
     * @param {string} text
     * @param {string} [iconSvg]
     * @param {number} [life] secondes
     */
    show(text, iconSvg, life = 2.2) {
      const el = h('div.toast', [iconSvg ? h('span.toast-ico', { html: iconSvg }) : null, h('span', { text })]);
      layer.appendChild(el);
      list.push({ el, t: 0, life });
      if (list.length > 3) {
        const old = list.shift();
        old.el.remove();
      }
    },
    update(dt) {
      clock += dt;
      if (savedT > 0) {
        savedT -= dt;
        if (savedT <= 0) saved.classList.remove('show');
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const it = list[i];
        it.t += dt;
        if (it.t > it.life - 0.3) it.el.classList.add('out');
        if (it.t >= it.life) {
          it.el.remove();
          list.splice(i, 1);
        }
      }
    },
    count: () => list.length,
    texts: () => list.map((x) => x.el.textContent),
  };
}
