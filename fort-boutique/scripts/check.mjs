// Fort Boutique — vérifications maison (B13). Échoue au moindre écart.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SRC = join(ROOT, 'src');
const problems = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|mjs|css)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const usedKeys = new Map();
// Liens autorisés : le lien de partage et les crédits vivent dans src/data/links.js.
const URL_ALLOWED = new Set([join('src', 'data', 'links.js')]);

for (const file of files) {
  const rel = relative(ROOT, file);
  const relSrc = relative(SRC, file).split(sep).join('/');
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  if (lines.length > 600) problems.push(`${rel} : ${lines.length} lignes (> 600)`);
  if (!file.endsWith('.js')) continue;
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((l) => l.replace(/(^|[^:"'`\\])\/\/.*$/, '$1'))
    .join('\n');
  const codeLines = code.split('\n');
  codeLines.forEach((line, i) => {
    const where = `${rel}:${i + 1}`;
    if (/console\.log\s*\(/.test(line) && !relSrc.startsWith('debug/')) problems.push(`${where} : console.log hors src/debug/`);
    if (/Math\.random\s*\(/.test(line) && /^(game|data|core)\//.test(relSrc) && relSrc !== 'core/rng.js') {
      problems.push(`${where} : Math.random dans la logique (utiliser core/rng.js)`);
    }
    if (/new Date\s*\(|Date\.now\s*\(/.test(line) && relSrc !== 'core/time.js') problems.push(`${where} : date lue hors core/time.js`);
    const urls = line.match(/https?:\/\/[^\s'"`)]+/g) || [];
    for (const u of urls) {
      if (u.startsWith('http://www.w3.org/')) continue; // espaces de noms SVG
      if (!URL_ALLOWED.has(rel)) problems.push(`${where} : URL ${u} hors lien de partage et crédits`);
    }
  });
  for (const m of code.matchAll(/(?<![\w.$])t\(\s*['"]([\w.\-]+)['"]/g)) {
    if (!usedKeys.has(m[1])) usedKeys.set(m[1], rel);
  }
}

const fr = (await import(pathToFileURL(join(SRC, 'ui/strings/fr.js')).href)).default;
const en = (await import(pathToFileURL(join(SRC, 'ui/strings/en.js')).href)).default;
for (const [k, where] of usedKeys) {
  if (!(k in fr)) problems.push(`clé i18n « ${k} » absente en FR (${where})`);
  if (!(k in en)) problems.push(`clé i18n « ${k} » absente en EN (${where})`);
}
for (const k of Object.keys(fr)) if (!(k in en)) problems.push(`clé i18n « ${k} » présente en FR mais absente en EN`);
for (const k of Object.keys(en)) if (!(k in fr)) problems.push(`clé i18n « ${k} » présente en EN mais absente en FR`);

if (problems.length) {
  process.stderr.write(`npm run check : ${problems.length} problème(s)\n` + problems.map((p) => `  - ${p}`).join('\n') + '\n');
  process.exit(1);
}
process.stdout.write(`npm run check OK : ${files.length} fichiers, ${usedKeys.size} clés i18n utilisées, ${Object.keys(fr).length} clés traduites\n`);
