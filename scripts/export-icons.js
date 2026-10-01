#!/usr/bin/env node
// Export reproductible des icônes de Seedrift depuis les sources SVG.
//
//   NODE_PATH=$(npm root -g) node scripts/export-icons.js [variante]
//
// variante : a (défaut, retenue), b ou c — voir icons/src/ et ICON.md.
// Rendu : Chromium (Playwright, déjà utilisé par les tests) dessine le SVG
// dans un <canvas> ; les pixels sont réencodés ici en PNG, en RGB SANS
// canal alpha pour les formats qui doivent être opaques (App Store,
// Google Play, apple-touch-icon, fond adaptatif). Aucune dépendance en plus.
//
// Les SVG source séparent le fond (<!--BG-->…<!--/BG-->) du sujet
// (<!--FG-->…<!--/FG-->) : on peut ainsi produire l'avant-plan d'une icône
// adaptative Android (sujet seul, réduit dans la zone de sécurité) et une
// version « maskable » (sujet réduit à 80 %).
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'icons', 'src');
const VARIANTS = { a: 'icon-a-mascotte.svg', b: 'icon-b-plateau.svg', c: 'icon-c-pousse.svg' };
const chosen = (process.argv[2] || 'a').toLowerCase();
if (!VARIANTS[chosen]) { console.error('Variante inconnue : ' + chosen); process.exit(1); }

// ---- PNG minimal (RGB ou RGBA, 8 bits) ----
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(rgba, w, h, withAlpha) {
  const ch = withAlpha ? 4 : 3;
  // Pixels réorganisés (RGB ou RGBA), puis filtre PNG « Paeth » sur chaque
  // ligne : les dégradés se compressent bien mieux qu'avec le filtre nul.
  const stride = w * ch;
  const px = Buffer.alloc(stride * h);
  for (let i = 0, d = 0; i < w * h; i++) {
    px[d++] = rgba[i * 4]; px[d++] = rgba[i * 4 + 1]; px[d++] = rgba[i * 4 + 2];
    if (withAlpha) px[d++] = rgba[i * 4 + 3];
  }
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : (pb <= pc ? b : c); };
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    const o = y * (stride + 1), r = y * stride;
    raw[o] = 4;
    for (let x = 0; x < stride; x++) {
      const left = x >= ch ? px[r + x - ch] : 0;
      const up = y > 0 ? px[r - stride + x] : 0;
      const ul = (y > 0 && x >= ch) ? px[r - stride + x - ch] : 0;
      raw[o + 1 + x] = (px[r + x] - paeth(left, up, ul)) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = withAlpha ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---- Composition SVG (fond / sujet / réduction du sujet) ----
function parts(svg) {
  const take = (a, b) => { const i = svg.indexOf(a), j = svg.indexOf(b); if (i < 0 || j < i) throw new Error('marqueur absent : ' + a); return svg.slice(i + a.length, j); };
  return { defs: take('<defs>', '</defs>'), bg: take('<!--BG-->', '<!--/BG-->'), fg: take('<!--FG-->', '<!--/FG-->') };
}
function compose(p, { bg = true, fg = true, fgScale = 1 } = {}) {
  const t = fgScale === 1 ? '' : ` transform="translate(512 512) scale(${fgScale}) translate(-512 -512)"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><defs>${p.defs}</defs>` +
    (bg ? p.bg : '') + (fg ? `<g${t}>${p.fg}</g>` : '') + '</svg>';
}

async function main() {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  // Rendu d'un SVG à la taille demandée → pixels RGBA.
  async function raster(svg, size) {
    const b64 = await page.evaluate(async ({ svg, size }) => {
      const img = new Image();
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = size;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, size, size);
      const d = ctx.getImageData(0, 0, size, size).data;
      let s = ''; const CH = 0x8000;
      for (let i = 0; i < d.length; i += CH) s += String.fromCharCode.apply(null, d.subarray(i, i + CH));
      return btoa(s);
    }, { svg, size });
    return Buffer.from(b64, 'base64');
  }
  async function write(rel, svg, size, alpha) {
    const out = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, encodePNG(await raster(svg, size), size, size, alpha));
    console.log('✔ ' + rel + ` (${size}×${size}${alpha ? ', transparent' : ', opaque'})`);
  }

  // 1. Aperçus des 3 variantes (planche contact).
  for (const [k, file] of Object.entries(VARIANTS)) {
    const svg = fs.readFileSync(path.join(SRC, file), 'utf8');
    for (const s of [1024, 120, 60, 40]) await write(`icons/variants/${k}-${s}.png`, svg, s, false);
  }

  // 2. Jeu complet pour la variante retenue.
  const full = fs.readFileSync(path.join(SRC, VARIANTS[chosen]), 'utf8');
  const p = parts(full);
  const all = compose(p);
  await write('icons/store/appstore-1024.png', all, 1024, false);        // App Store : opaque, sans coins arrondis
  await write('icons/store/googleplay-512.png', all, 512, false);        // Google Play
  await write('icons/android/adaptive-background-432.png', compose(p, { fg: false }), 432, false);
  await write('icons/android/adaptive-foreground-432.png', compose(p, { bg: false, fgScale: 0.62 }), 432, true); // zone de sécurité ≈ 66 %
  await write('icons/icon-512.png', all, 512, false);                    // PWA « any »
  await write('icons/icon-192.png', all, 192, false);
  await write('icons/icon-maskable-512.png', compose(p, { fgScale: 0.8 }), 512, false); // sujet dans le cercle de 80 %
  await write('icons/apple-touch-icon.png', all, 180, false);
  await write('icons/favicon-32.png', all, 32, false);
  await write('icons/favicon-16.png', all, 16, false);
  fs.copyFileSync(path.join(SRC, VARIANTS[chosen]), path.join(ROOT, 'icons', 'favicon.svg'));
  console.log('✔ icons/favicon.svg');
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
