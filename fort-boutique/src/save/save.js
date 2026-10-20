// Fort Boutique — sauvegarde versionnée : checksum, 2 copies de secours, copie .corrupt, écritures regroupées (B9).
import { crc32 } from './crc32.js';
import { migrate } from './migrations.js';
import { defaultSave, sanitizeSave } from './schema.js';
import { note } from '../core/log.js';

export const SAVE_KEY = 'fortboutique.save';
export const BAK1_KEY = 'fortboutique.save.bak1';
export const BAK2_KEY = 'fortboutique.save.bak2';
export const CORRUPT_KEY = 'fortboutique.save.corrupt';

/** Délai minimal entre deux écritures (ms). */
export const WRITE_INTERVAL_MS = 500;

/**
 * Sérialise avec checksum (CRC32 du reste).
 * @param {object} data
 * @returns {string}
 */
export function serialize(data) {
  const { checksum: _ignored, ...rest } = data;
  const body = JSON.stringify(rest);
  return JSON.stringify({ ...rest, checksum: crc32(body) });
}

/**
 * Lit et vérifie un texte de sauvegarde.
 * @param {string | null} text
 * @returns {{ ok: true, data: any } | { ok: false, reason: string }}
 */
export function parseAndVerify(text) {
  if (typeof text !== 'string' || !text) return { ok: false, reason: 'absent' };
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'json' };
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, reason: 'format' };
  const { checksum, ...rest } = obj;
  if (typeof checksum !== 'string' || crc32(JSON.stringify(rest)) !== checksum) return { ok: false, reason: 'checksum' };
  return { ok: true, data: obj };
}

/**
 * Charge la meilleure sauvegarde disponible : principale -> bak1 -> bak2 -> nouvelle partie.
 * @param {import('./storage.js').Storage} storage
 * @param {{ seed: number, now: number, lang?: string }} ctx
 * @returns {{ data: any, source: 'main' | 'bak1' | 'bak2' | 'new', repaired: boolean, migratedFrom: number | null, text: string | null }}
 */
export function loadSave(storage, ctx) {
  const mainText = storage.get(SAVE_KEY);
  const candidates = [
    ['main', mainText],
    ['bak1', storage.get(BAK1_KEY)],
    ['bak2', storage.get(BAK2_KEY)],
  ];
  let mainBroken = false;
  for (const [source, text] of candidates) {
    const r = parseAndVerify(text);
    if (!r.ok) {
      if (source === 'main' && r.reason !== 'absent') mainBroken = true;
      continue;
    }
    try {
      const m = migrate(r.data);
      const data = sanitizeSave(m.data, ctx);
      if (mainBroken) keepCorrupt(storage, mainText);
      return { data, source, repaired: source !== 'main', migratedFrom: m.from !== m.to ? m.from : null, text };
    } catch (e) {
      note('sauvegarde illisible', e && e.message);
      if (source === 'main') mainBroken = true;
    }
  }
  if (mainBroken) keepCorrupt(storage, mainText);
  const anyText = mainText || candidates[1][1] || candidates[2][1];
  return { data: defaultSave(ctx), source: 'new', repaired: !!anyText, migratedFrom: null, text: null };
}

/** Garde une copie de la sauvegarde illisible ; une copie existante n'est jamais écrasée. */
function keepCorrupt(storage, text) {
  if (!text || storage.get(CORRUPT_KEY)) return;
  storage.set(CORRUPT_KEY, text);
}

/**
 * Gestionnaire d'écritures : regroupe les demandes (une écriture toutes les 500 ms au plus),
 * fait tourner les copies de secours à chaque écriture réussie.
 */
export class SaveManager {
  /**
   * @param {import('./storage.js').Storage} storage
   * @param {any} data objet de sauvegarde vivant (muté par le jeu)
   * @param {{ now: () => number }} clock
   * @param {string | null} [loadedText] texte de la sauvegarde chargée (jamais une copie illisible)
   */
  constructor(storage, data, clock, loadedText = null) {
    this.storage = storage;
    this.data = data;
    this.clock = clock;
    this.lastWriteAt = -1e12;
    this.pending = false;
    this.lastText = loadedText;
    this.writes = 0;
    this.failures = 0;
    /** @type {Array<(data: any) => void>} */
    this.beforeWrite = [];
  }

  /** Demande une écriture (regroupée). */
  request() {
    this.pending = true;
    if (this.clock.now() - this.lastWriteAt >= WRITE_INTERVAL_MS) this.flush();
  }

  /** À appeler régulièrement : exécute l'écriture en attente quand le délai est passé. */
  tick() {
    if (this.pending && this.clock.now() - this.lastWriteAt >= WRITE_INTERVAL_MS) this.flush();
  }

  /** Écrit tout de suite. @returns {boolean} succès */
  flush() {
    this.pending = false;
    this.lastWriteAt = this.clock.now();
    for (const fn of this.beforeWrite) fn(this.data);
    let text;
    try {
      text = serialize(this.data);
    } catch (e) {
      this.failures++;
      note('sérialisation impossible', e && e.message);
      return false;
    }
    if (text === this.lastText) return true;
    const ok = this.storage.set(SAVE_KEY, text);
    if (!ok) {
      this.failures++;
      return false;
    }
    if (this.lastText) {
      const prev1 = this.storage.get(BAK1_KEY);
      if (prev1) this.storage.set(BAK2_KEY, prev1);
      this.storage.set(BAK1_KEY, this.lastText);
    }
    this.lastText = text;
    this.writes++;
    return true;
  }

  /** Remplace les données (import) et écrit. */
  replace(data) {
    this.data = data;
    this.flush();
  }
}
