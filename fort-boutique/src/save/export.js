// Fort Boutique — export / import : « FB1- » + base64url(JSON) + « - » + CRC32 (B9).
import { crc32, utf8, fromUtf8 } from './crc32.js';
import { migrate } from './migrations.js';
import { sanitizeSave, CURRENT_VERSION } from './schema.js';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const REV = (() => {
  const r = new Int16Array(128).fill(-1);
  for (let i = 0; i < ALPHA.length; i++) r[ALPHA.charCodeAt(i)] = i;
  return r;
})();

/** @param {Uint8Array} bytes @returns {string} */
export function base64urlEncode(bytes) {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += ALPHA[(n >> 18) & 63] + ALPHA[(n >> 12) & 63] + ALPHA[(n >> 6) & 63] + ALPHA[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += ALPHA[(n >> 18) & 63] + ALPHA[(n >> 12) & 63];
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += ALPHA[(n >> 18) & 63] + ALPHA[(n >> 12) & 63] + ALPHA[(n >> 6) & 63];
  }
  return out;
}

/** @param {string} s @returns {Uint8Array | null} null si invalide */
export function base64urlDecode(s) {
  if (s.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const c = [0, 1, 2, 3].map((k) => (i + k < s.length ? REV[s.charCodeAt(i + k) & 127] : 0));
    for (let k = 0; k < 4 && i + k < s.length; k++) {
      if (s.charCodeAt(i + k) > 127 || REV[s.charCodeAt(i + k)] < 0) return null;
    }
    const n = (c[0] << 18) | (c[1] << 12) | (c[2] << 6) | c[3];
    const len = Math.min(3, s.length - i - 1);
    if (len >= 1) out[o++] = (n >> 16) & 255;
    if (len >= 2) out[o++] = (n >> 8) & 255;
    if (len >= 3) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

/**
 * Code d'export d'une sauvegarde.
 * @param {object} data
 * @returns {string}
 */
export function exportCode(data) {
  const { checksum: _c, ...rest } = data;
  const json = JSON.stringify(rest);
  return `FB1-${base64urlEncode(utf8(json))}-${crc32(json)}`;
}

/**
 * Lit un code d'export : valide, migre, remet en état. Ne remplace rien.
 * @param {string} code
 * @param {{ seed: number, now: number, lang?: string }} ctx
 * @returns {{ ok: true, data: any } | { ok: false, reason: string }}
 */
export function importCode(code, ctx) {
  const s = String(code || '').trim().replace(/\s+/g, '');
  const m = /^FB1-([A-Za-z0-9_-]+)-([0-9a-f]{8})$/.exec(s);
  if (!m) return { ok: false, reason: 'format' };
  const bytes = base64urlDecode(m[1]);
  if (!bytes) return { ok: false, reason: 'base64' };
  let json;
  try {
    json = fromUtf8(bytes);
  } catch {
    return { ok: false, reason: 'utf8' };
  }
  if (crc32(json) !== m[2]) return { ok: false, reason: 'checksum' };
  let obj;
  try {
    obj = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'json' };
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, reason: 'format' };
  if (Number.isInteger(obj.version) && obj.version > CURRENT_VERSION) return { ok: false, reason: 'future' };
  try {
    return { ok: true, data: sanitizeSave(migrate(obj).data, ctx) };
  } catch {
    return { ok: false, reason: 'migration' };
  }
}

/**
 * Résumé pour l'écran de comparaison avant import (niveau, quartiers, pièces).
 * @param {any} data
 */
export function summarizeSave(data) {
  const shops = data && data.shops ? Object.values(data.shops).filter((s) => s && s.unlocked).length : 0;
  return {
    level: (data && data.player && data.player.level) || 1,
    districts: Math.max(1, shops),
    coins: (data && data.player && data.player.coins) || 0,
    rubies: (data && data.player && data.player.rubies) || 0,
  };
}
