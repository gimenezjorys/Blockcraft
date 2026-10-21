// Fort Boutique — stockage local avec repli en mémoire (B9) : navigation privée, file:// restrictif, quota plein.
import { note } from '../core/log.js';

/**
 * @typedef {object} Storage
 * @property {'local' | 'memory'} kind
 * @property {boolean} degraded vrai si une écriture a échoué (quota) et a été gardée en mémoire
 * @property {(key: string) => string | null} get
 * @property {(key: string, value: string) => boolean} set
 * @property {(key: string) => void} remove
 */

/**
 * @param {{ localStorage?: globalThis.Storage } | null | undefined} win fenêtre (ou null pour un stockage purement mémoire)
 * @returns {Storage}
 */
export function createStorage(win) {
  const memory = new Map();
  /** @type {globalThis.Storage | null} */
  let ls = null;
  try {
    ls = win ? win.localStorage : null;
    if (ls) {
      const probe = 'fortboutique.probe';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
    }
  } catch (e) {
    note('stockage local indisponible', e && e.name);
    ls = null;
  }
  const st = {
    kind: /** @type {'local' | 'memory'} */ (ls ? 'local' : 'memory'),
    degraded: false,
    lastError: '',
    get(key) {
      if (memory.has(key)) return memory.get(key);
      if (!ls) return null;
      try {
        return ls.getItem(key);
      } catch (e) {
        st.lastError = String(e && e.name);
        return null;
      }
    },
    set(key, value) {
      if (ls) {
        try {
          ls.setItem(key, value);
          memory.delete(key);
          return true;
        } catch (e) {
          st.degraded = true;
          st.lastError = String(e && e.name);
          note('écriture refusée, gardée en mémoire', st.lastError);
        }
      }
      memory.set(key, value);
      return !ls;
    },
    remove(key) {
      memory.delete(key);
      if (!ls) return;
      try {
        ls.removeItem(key);
      } catch {
        /* rien à faire */
      }
    },
  };
  return st;
}
