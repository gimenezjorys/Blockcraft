// Fort Boutique — overlay debug (?debug=1, B14) : mesures + panneau de triche. Inactif sans le paramètre.
import { h, onTap } from '../ui/widgets.js';
import { Disposer } from '../core/events.js';

/**
 * @typedef {object} DebugHost
 * @property {() => { fps: number, updateMs: number, entities: number, seed: number | string, phase: string }} stats
 * @property {Array<{ id: string, label: string, run: () => void }>} cheats
 */

/**
 * @param {string} search location.search
 * @returns {boolean}
 */
export function debugEnabled(search) {
  return /[?&]debug=1(?:&|$)/.test(search || '');
}

/**
 * Monte l'overlay debug.
 * @param {HTMLElement} root
 * @param {DebugHost} host
 */
export function mountDebug(root, host) {
  const d = new Disposer();
  const stats = h('pre.debug-stats');
  const panel = h('div.debug-panel');
  const toggle = h('button.debug-toggle', { type: 'button', text: '🐞' });
  const cheats = h('div.debug-cheats');
  cheats.hidden = true;
  // Les triches sont construites à l'ouverture : les services du jeu existent alors.
  const fill = () => {
    if (cheats.childElementCount) return;
    for (const c of host.cheats) {
      const b = h('button.debug-cheat', { type: 'button', text: c.label, 'data-cheat': c.id });
      onTap(b, () => c.run(), d);
      cheats.appendChild(b);
    }
  };
  onTap(toggle, () => {
    fill();
    cheats.hidden = !cheats.hidden;
  }, d);
  panel.append(stats, toggle, cheats);
  root.appendChild(panel);
  let acc = 0;
  function refresh() {
    const s = host.stats();
    stats.textContent = `FPS ${s.fps.toFixed(0)}  maj ${s.updateMs.toFixed(2)} ms\nentités ${s.entities}  graine ${s.seed}\nphase ${s.phase}`;
  }
  refresh();
  return {
    el: panel,
    update(dt) {
      acc += dt;
      if (acc >= 0.5) {
        acc = 0;
        refresh();
      }
    },
    dispose() {
      d.dispose();
      panel.remove();
    },
  };
}
