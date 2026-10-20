// Fort Boutique — widgets DOM : création d'éléments, tap dédupliqué, étiquettes kraft.
import { listen } from '../core/events.js';
import { acceptFamily } from '../input/input.js';
import { perfNow } from '../core/time.js';

/**
 * Crée un élément.
 * @param {string} tag « div.classe#id »
 * @param {Record<string, any>} [attrs]
 * @param {Array<Node | string> | string} [children]
 * @returns {HTMLElement}
 */
export function h(tag, attrs, children) {
  if (Array.isArray(attrs) || typeof attrs === 'string' || (attrs && attrs.nodeType)) {
    children = attrs;
    attrs = undefined;
  }
  const m =/^([a-z0-9]+)((?:[.#][\w-]+)*)$/i.exec(tag);
  const el = document.createElement(m ? m[1] : 'div');
  if (m && m[2]) {
    for (const part of m[2].match(/[.#][\w-]+/g)) {
      if (part[0] === '.') el.classList.add(part.slice(1));
      else el.id = part.slice(1);
    }
  }
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  if (children !== undefined) {
    const list = Array.isArray(children) ? children : [children];
    for (const c of list) {
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
  }
  return el;
}

/** Après un geste, le « click » synthétique peut tomber sur l'écran suivant : on l'ignore partout (700 ms). */
let lastGestureAt = -1e9;

/**
 * Tap fiable sur un élément : pointeur, toucher ou clic, jamais traité deux fois.
 * @param {HTMLElement} el
 * @param {(e: Event) => void} fn
 * @param {import('../core/events.js').Disposer} disposer
 */
export function onTap(el, fn, disposer) {
  // Un geste (pointerup ou touchend) déclenche ; le « click » synthétique qui suit est ignoré.
  let pointerDown = false;
  let touchDown = false;
  const fire = (e) => {
    lastGestureAt = perfNow();
    fn(e);
  };
  const press = (on) => el.classList.toggle('pressed', on);
  disposer.listen(el, 'pointerdown', (e) => {
    if (!acceptFamily('pointer')) return;
    pointerDown = true;
    press(true);
    e.stopPropagation();
  });
  disposer.listen(el, 'pointerup', (e) => {
    if (!acceptFamily('pointer')) return;
    press(false);
    if (pointerDown) {
      pointerDown = false;
      e.stopPropagation();
      fire(e);
    }
  });
  disposer.listen(el, 'pointercancel', () => {
    pointerDown = false;
    press(false);
  });
  disposer.listen(el, 'pointerleave', () => press(false));
  disposer.listen(el, 'touchstart', (e) => {
    if (!acceptFamily('touch')) return;
    touchDown = true;
    press(true);
    e.stopPropagation();
  }, { passive: true });
  disposer.listen(el, 'touchend', (e) => {
    if (!acceptFamily('touch')) return;
    press(false);
    if (touchDown) {
      touchDown = false;
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      fire(e);
    }
  });
  disposer.listen(el, 'click', (e) => {
    e.stopPropagation();
    if (perfNow() - lastGestureAt < 700) return;
    fn(e);
  });
}

/**
 * Bouton en forme d'étiquette de prix kraft (G20.1).
 * @param {{ label: string, variant?: 'kraft'|'green'|'gold'|'coral', icon?: string, small?: boolean, id?: string }} opts
 * @returns {HTMLElement}
 */
export function tagButton({ label, variant = 'kraft', icon, small, id }) {
  const b = h('button.tag', { type: 'button', id, 'data-variant': variant });
  if (small) b.classList.add('small');
  b.appendChild(h('span.tag-hole'));
  if (icon) b.appendChild(h('span.tag-icon', { html: icon }));
  b.appendChild(h('span.tag-label', { text: label }));
  return b;
}
