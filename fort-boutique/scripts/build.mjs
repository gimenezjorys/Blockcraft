// Fort Boutique — build : src/main.js -> dist/index.html autonome (B4).
// Usage : node scripts/build.mjs [--test] [--quiet]
//   --test  : produit dist-test/index.html avec les hooks de test (B15).
import { build, transform } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderIconPng } from './png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const TEST = args.has('--test');
const QUIET = args.has('--quiet');
const OUT = join(ROOT, TEST ? 'dist-test' : 'dist');
const BUDGET = 600 * 1024;

function gitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'nogit';
  }
}

function utcDateString() {
  // La date du build est la seule date lue hors de src/core/time.js : le build n'est pas le jeu.
  return new Date().toISOString().slice(0, 10);
}

/** Favicon : l'enseigne crénelée (G20.7), en SVG. */
export function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1A1446"/><circle cx="50" cy="13" r="7" fill="#FFF3B0"/><path d="M10 26h8v-6h7v6h6v-6h7v6h6v-6h7v6h3v24a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6z" fill="#B86B3C" stroke="#2B1A33" stroke-width="3" stroke-linejoin="round"/><ellipse cx="25" cy="40" rx="6" ry="7" fill="#fff" stroke="#2B1A33" stroke-width="2"/><ellipse cx="41" cy="40" rx="6" ry="7" fill="#fff" stroke="#2B1A33" stroke-width="2"/><circle cx="26" cy="41" r="3" fill="#2B1A33"/><circle cx="42" cy="41" r="3" fill="#2B1A33"/></svg>`;
}

function manifest() {
  return JSON.stringify({
    name: 'Fort Boutique',
    short_name: 'Fort Boutique',
    description: 'Vends le jour, défends la nuit.',
    start_url: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#2E4B44',
    theme_color: '#2E4B44',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, null, 2);
}

/** Construit le jeu. Renvoie { bytes, path }. */
export async function buildGame({ test = TEST, quiet = QUIET } = {}) {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const version = { version: pkg.version, hash: gitHash(), date: utcDateString() };
  const out = join(ROOT, test ? 'dist-test' : 'dist');

  const js = await build({
    entryPoints: [join(ROOT, 'src/main.js')],
    bundle: true,
    format: 'iife',
    minify: !test,
    target: 'es2020',
    write: false,
    sourcemap: false,
    legalComments: 'none',
    define: {
      __FB_TEST_BUILD__: test ? 'true' : 'false',
      __FB_VERSION__: JSON.stringify(version),
    },
    logLevel: 'silent',
  });
  let code = js.outputFiles[0].text;
  // Un « </script> » dans une chaîne fermerait la balise : on l'échappe.
  code = code.replace(/<\/script/gi, '<\\/script');

  const cssSrc = readFileSync(join(ROOT, 'src/ui/ui.css'), 'utf8');
  const css = (await transform(cssSrc, { loader: 'css', minify: true })).code.trim();
  const favicon = 'data:image/svg+xml,' + encodeURIComponent(faviconSvg());

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="theme-color" content="#2E4B44">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Fort Boutique">
<meta name="description" content="Fort Boutique — le jour, tu vends ; la nuit, tes meubles se battent.">
<title>Fort Boutique</title>
<link rel="icon" href="${favicon}">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="manifest" href="manifest.webmanifest">
<style>${css}</style>
</head>
<body>
<div id="app"><canvas id="game" width="360" height="640"></canvas><div id="ui"></div></div>
<script>${code}</script>
</body>
</html>
`;
  const bytes = Buffer.byteLength(html);
  if (bytes > BUDGET) {
    throw new Error(`dist/index.html dépasse le budget : ${(bytes / 1024).toFixed(1)} Ko > 600 Ko`);
  }
  mkdirSync(join(out, 'icons'), { recursive: true });
  writeFileSync(join(out, 'index.html'), html);
  writeFileSync(join(out, 'manifest.webmanifest'), manifest());
  writeFileSync(join(out, 'icons/icon-192.png'), renderIconPng(192));
  writeFileSync(join(out, 'icons/icon-512.png'), renderIconPng(512));
  writeFileSync(join(out, 'icons/apple-touch-icon.png'), renderIconPng(180));
  if (!quiet) {
    process.stdout.write(`build ${test ? '(test) ' : ''}OK : ${join(out, 'index.html')} — ${(bytes / 1024).toFixed(1)} Ko — v${version.version} ${version.hash} ${version.date}\n`);
  }
  return { bytes, path: join(out, 'index.html') };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildGame().catch((err) => {
    process.stderr.write(`build ÉCHEC : ${err.message}\n`);
    process.exit(1);
  });
}
export { OUT };
