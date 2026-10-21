// Fort Boutique — mini encodeur PNG (zlib natif de Node) + icône dessinée par code (G20.7).
import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/**
 * Encode une image RGBA en PNG.
 * @param {number} w largeur
 * @param {number} h hauteur
 * @param {Uint8Array} rgba pixels (w*h*4)
 * @returns {Buffer}
 */
export function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Formes à distance signée (unités de dessin : 512 × 512) ---
const sdCircle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
function sdRoundBox(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r);
  const qy = Math.abs(y - cy) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdEllipse(x, y, cx, cy, rx, ry) {
  const k = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return (k - 1) * Math.min(rx, ry);
}
function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const INK = '#2B1A33';

/** Calques de l'icône : [sdf(x,y), couleur, épaisseur de contour ou 0]. */
function iconLayers() {
  const merlons = [96, 184, 272, 360].map((x) => [x + 28, 190]);
  const sign = (x, y) => {
    let d = sdRoundBox(x, y, 256, 320, 170, 100, 34);
    for (const [mx, my] of merlons) d = Math.min(d, sdRoundBox(x, y, mx, my, 30, 34, 8));
    return d;
  };
  const layers = [];
  // Étoiles et lune (en haut à droite).
  for (const [sx, sy, r] of [[86, 96, 6], [150, 60, 4], [250, 84, 5], [460, 210, 4], [56, 190, 4]]) {
    layers.push([(x, y) => sdCircle(x, y, sx, sy, r), '#FFF3B0', 0]);
  }
  layers.push([(x, y) => sdCircle(x, y, 404, 104, 56), '#FFF3B0', 0]);
  layers.push([(x, y) => sdCircle(x, y, 388, 92, 12), '#F1DE8C', 0]);
  layers.push([(x, y) => sdCircle(x, y, 420, 126, 8), '#F1DE8C', 0]);
  // Pieds de l'enseigne.
  layers.push([(x, y) => sdRoundBox(x, y, 160, 446, 14, 40, 6), '#8A4A26', 10]);
  layers.push([(x, y) => sdRoundBox(x, y, 352, 446, 14, 40, 6), '#8A4A26', 10]);
  // Enseigne crénelée.
  layers.push([sign, '#B86B3C', 14]);
  layers.push([(x, y) => sdRoundBox(x, y, 256, 268, 150, 4, 2), '#8A4A26', 0]);
  layers.push([(x, y) => sdRoundBox(x, y, 256, 372, 150, 4, 2), '#8A4A26', 0]);
  // Les deux yeux ouverts.
  for (const ex of [196, 316]) {
    layers.push([(x, y) => sdEllipse(x, y, ex, 318, 46, 54), '#FFFFFF', 10]);
    layers.push([(x, y) => sdCircle(x, y, ex + 8, 326, 21), INK, 0]);
    layers.push([(x, y) => sdCircle(x, y, ex + 16, 314, 7), '#FFFFFF', 0]);
  }
  return layers;
}

/**
 * Dessine l'icône du jeu.
 * @param {number} size taille en pixels
 * @returns {Buffer} PNG
 */
export function renderIconPng(size) {
  const rgba = new Uint8Array(size * size * 4);
  const bg = hex('#1A1446');
  const layers = iconLayers().map(([f, c, w]) => [f, hex(c), w]);
  const ink = hex(INK);
  const px = 512 / size;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) * px;
      const y = (j + 0.5) * px;
      let r = bg[0], g = bg[1], b = bg[2];
      for (const [f, col, w] of layers) {
        const d = f(x, y);
        if (d > w + px) continue;
        const a = Math.min(1, Math.max(0, 0.5 - d / px));
        if (a > 0) {
          r += (col[0] - r) * a; g += (col[1] - g) * a; b += (col[2] - b) * a;
        }
        if (w > 0) {
          const s = Math.min(1, Math.max(0, 0.5 - (Math.abs(d) - w / 2) / px));
          if (s > 0) {
            r += (ink[0] - r) * s; g += (ink[1] - g) * s; b += (ink[2] - b) * s;
          }
        }
      }
      const o = (j * size + i) * 4;
      rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}
