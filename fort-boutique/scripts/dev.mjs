// Fort Boutique — serveur local http://localhost:5173 qui reconstruit à chaque sauvegarde.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, watch } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGame } from './build.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 5173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.json': 'application/json',
};

let building = false;
let again = false;
async function rebuild() {
  if (building) {
    again = true;
    return;
  }
  building = true;
  try {
    await buildGame({ test: false, quiet: false });
  } catch (e) {
    process.stderr.write(`build ÉCHEC : ${e.message}\n`);
  }
  building = false;
  if (again) {
    again = false;
    rebuild();
  }
}

await rebuild();
let timer = null;
watch(join(ROOT, 'src'), { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 120);
});

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let p = normalize(join(DIST, decodeURIComponent(url.pathname)));
  if (!p.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) {
    res.writeHead(404).end('introuvable');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(p));
}).listen(PORT, () => process.stdout.write(`Fort Boutique : http://localhost:${PORT}\n`));
