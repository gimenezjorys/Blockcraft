// Fort Boutique — gestionnaire d'écrans DOM : mount() / unmount() systématiques (B5).
import { Disposer } from '../core/events.js';

/**
 * @typedef {object} ScreenInstance
 * @property {HTMLElement} el
 * @property {() => void} [unmount]
 * @property {(dt: number) => void} [update] appelé à chaque pas de simulation
 * @property {(key: string) => boolean} [onKey] renvoie vrai si la touche est consommée
 */

/**
 * @typedef {object} ScreenDef
 * @property {(ctx: object, params: object, d: Disposer) => ScreenInstance} mount
 * @property {boolean} [overlay] écran posé par-dessus le précédent (pause, coffre…)
 */

/**
 * @param {HTMLElement} root
 * @param {object} ctx contexte partagé passé à chaque écran
 */
export function createRouter(root, ctx) {
  /** @type {Record<string, ScreenDef>} */
  const defs = {};
  /** @type {Array<{ id: string, inst: ScreenInstance, d: Disposer }>} */
  const stack = [];

  function unmountTop() {
    const top = stack.pop();
    if (!top) return;
    if (top.inst.unmount) top.inst.unmount();
    top.d.dispose();
    if (top.inst.el && top.inst.el.parentNode) top.inst.el.parentNode.removeChild(top.inst.el);
  }

  function mount(id, params) {
    const def = defs[id];
    if (!def) throw new Error(`écran inconnu : ${id}`);
    const d = new Disposer();
    const inst = def.mount(ctx, params || {}, d);
    inst.el.classList.add('screen', `screen-${id}`);
    inst.el.setAttribute('data-screen', id);
    root.appendChild(inst.el);
    stack.push({ id, inst, d });
    return inst;
  }

  return {
    /** @param {Record<string, ScreenDef>} map */
    register(map) {
      Object.assign(defs, map);
    },
    /** Remplace toute la pile par l'écran demandé. */
    goto(id, params) {
      while (stack.length) unmountTop();
      return mount(id, params);
    },
    /** Pose un écran par-dessus (fenêtre, coffre…). */
    push(id, params) {
      return mount(id, params);
    },
    /** Retire l'écran du dessus. */
    pop() {
      unmountTop();
    },
    /** @returns {string | null} */
    currentId() {
      return stack.length ? stack[stack.length - 1].id : null;
    },
    baseId() {
      return stack.length ? stack[0].id : null;
    },
    ids() {
      return stack.map((s) => s.id);
    },
    has(id) {
      return stack.some((s) => s.id === id);
    },
    update(dt) {
      for (let i = 0; i < stack.length; i++) {
        const inst = stack[i].inst;
        if (inst.update) inst.update(dt);
      }
    },
    /** @param {string} key */
    key(key) {
      for (let i = stack.length - 1; i >= 0; i--) {
        const inst = stack[i].inst;
        if (inst.onKey && inst.onKey(key)) return true;
      }
      return false;
    },
  };
}
