#!/usr/bin/env node
// Planche contact des 3 variantes d'icône (à lancer après export-icons.js) :
//   NODE_PATH=$(npm root -g) node scripts/icon-contact-sheet.js
// Produit icons/compare/planche.html et icons/compare/planche.png.
// Les icônes « voisines » du faux écran d'accueil sont des formes
// génériques dessinées ici (aucune marque réelle n'est imitée).
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'icons', 'compare');
fs.mkdirSync(OUT, { recursive: true });
const V = [
  { k: 'a', name: 'A · La mascotte qui glisse' },
  { k: 'b', name: 'B · Le plateau' },
  { k: 'c', name: 'C · La pousse de lune' }
];
// Icônes voisines génériques : dégradé saturé + un glyphe simple.
const NEIGH = [
  ['#ff5f6d', '#ffc371', 'Fruits', '<circle cx="50" cy="55" r="22" fill="#fff"/>'],
  ['#4facfe', '#00f2fe', 'Blocs', '<rect x="28" y="28" width="20" height="20" rx="4" fill="#fff"/><rect x="52" y="28" width="20" height="20" rx="4" fill="#fff" opacity=".8"/><rect x="28" y="52" width="20" height="20" rx="4" fill="#fff" opacity=".8"/><rect x="52" y="52" width="20" height="20" rx="4" fill="#fff"/>'],
  ['#a18cd1', '#fbc2eb', 'Mots', '<text x="50" y="66" font-size="44" font-weight="900" text-anchor="middle" fill="#fff" font-family="Arial">W</text>'],
  ['#f7971e', '#ffd200', 'Royaume', '<path d="M24 66 L30 34 L42 50 L50 28 L58 50 L70 34 L76 66 Z" fill="#fff"/>'],
  ['#43e97b', '#38f9d7', 'Ferme', '<path d="M50 24 C 70 40, 70 70, 50 76 C 30 70, 30 40, 50 24 Z" fill="#fff"/>'],
  ['#fa709a', '#fee140', 'Bulles', '<circle cx="38" cy="58" r="14" fill="#fff"/><circle cx="62" cy="44" r="16" fill="#fff" opacity=".85"/>'],
  ['#30cfd0', '#330867', 'Course', '<path d="M24 62 L50 30 L76 62 Z" fill="#fff"/>'],
  ['#ff9a9e', '#fecfef', 'Cuisine', '<rect x="30" y="40" width="40" height="28" rx="8" fill="#fff"/>'],
  ['#667eea', '#764ba2', 'Étoiles', '<path d="M50 24 L57 43 L77 43 L61 55 L67 75 L50 63 L33 75 L39 55 L23 43 L43 43 Z" fill="#fff"/>'],
  ['#f6d365', '#fda085', 'Cartes', '<rect x="32" y="26" width="30" height="44" rx="5" fill="#fff"/><rect x="40" y="32" width="30" height="44" rx="5" fill="#fff" opacity=".7"/>'],
  ['#0ba360', '#3cba92', 'Golf', '<circle cx="50" cy="50" r="18" fill="#fff"/>']
];
const neighIcon = (n, size) => `<div class="app"><div class="ic" style="width:${size}px;height:${size}px;background:linear-gradient(135deg,${n[0]},${n[1]})"><svg viewBox="0 0 100 100" width="${size}" height="${size}">${n[3]}</svg></div><span>${n[2]}</span></div>`;
const ourIcon = (k, size) => `<div class="app"><div class="ic ours" style="width:${size}px;height:${size}px"><img src="../variants/${k}-${size >= 100 ? 120 : 60}.png" width="${size}" height="${size}"></div><span>Seedrift</span></div>`;

let html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Seedrift — planche des icônes</title><style>
body{margin:0;padding:24px;font-family:-apple-system,system-ui,sans-serif;background:#e9e9ee;color:#111;}
h1{font-size:22px;margin:0 0 4px;} p.sub{margin:0 0 18px;color:#555;font-size:13px;}
.variant{display:grid;grid-template-columns:240px 1fr 1fr 290px;gap:16px;align-items:center;background:#fff;border-radius:16px;padding:16px;margin-bottom:16px;}
.variant h2{grid-column:1/-1;margin:0;font-size:16px;}
.big img{width:220px;height:220px;border-radius:48px;display:block;box-shadow:0 6px 18px rgba(0,0,0,.25);}
.sizes{display:flex;gap:18px;align-items:flex-end;padding:18px;border-radius:12px;}
.sizes.light{background:#f2f2f7;} .sizes.dark{background:#000;color:#ddd;}
.sizes figure{margin:0;text-align:center;font-size:11px;}
.sizes img{display:block;border-radius:22.5%;}
.phone{width:240px;height:300px;border-radius:28px;padding:18px 14px;background:linear-gradient(160deg,#2b5876,#4e4376);display:grid;grid-template-columns:repeat(4,1fr);gap:12px 6px;align-content:start;}
.app{display:flex;flex-direction:column;align-items:center;gap:4px;}
.app span{font-size:9.5px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.6);white-space:nowrap;}
.ic{border-radius:22.5%;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.3);}
.ic img{display:block;}
</style></head><body><h1>Seedrift — planche des icônes</h1>
<p class="sub">Chaque variante en 1024 px (réduite à l'affichage), puis aux tailles réelles 120 / 60 / 40 px sur fond clair et sombre, et sur un faux écran d'accueil entouré d'icônes génériques.</p>`;
for (const v of V) {
  const sizes = cls => `<div class="sizes ${cls}">${[120, 60, 40].map(s => `<figure><img src="../variants/${v.k}-${s}.png" width="${s}" height="${s}"><figcaption>${s} px</figcaption></figure>`).join('')}</div>`;
  const grid = [];
  for (let i = 0; i < 16; i++) grid.push(i === 5 ? ourIcon(v.k, 46) : neighIcon(NEIGH[i % NEIGH.length], 46));
  html += `<section class="variant"><h2>${v.name}</h2><div class="big"><img src="../variants/${v.k}-1024.png"></div>${sizes('light')}${sizes('dark')}<div class="phone">${grid.join('')}</div></section>`;
}
html += '</body></html>';
fs.writeFileSync(path.join(OUT, 'planche.html'), html);
console.log('✔ icons/compare/planche.html');

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(OUT, 'planche.html'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'planche.png'), fullPage: true });
  console.log('✔ icons/compare/planche.png');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
