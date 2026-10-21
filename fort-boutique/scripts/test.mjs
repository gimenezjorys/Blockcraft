// Fort Boutique — lance tous les tests node:test de tests/ (unit, integration, ui, save, sim).
// Usage : node scripts/test.mjs [filtre]   (filtre = morceau de chemin)
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const filter = process.argv[2] || '';

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.test.js')) out.push(p);
  }
  return out;
}

const files = walk(join(ROOT, 'tests'), []).filter((f) => relative(ROOT, f).includes(filter)).sort();
if (!files.length) {
  process.stderr.write('aucun fichier de test\n');
  process.exit(1);
}
const t0 = Date.now();
const r = spawnSync(process.execPath, ['--test', '--test-reporter=dot', ...files], { stdio: 'inherit', cwd: ROOT });
const sec = ((Date.now() - t0) / 1000).toFixed(1);
process.stdout.write(`\n${files.length} fichiers de test, ${sec} s\n`);
if (r.status === 0 && Number(sec) > 90) {
  process.stderr.write('npm test dépasse 90 s (D1.6)\n');
  process.exit(1);
}
process.exit(r.status ?? 1);
