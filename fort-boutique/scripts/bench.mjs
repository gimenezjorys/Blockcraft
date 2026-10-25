// Fort Boutique — npm run bench (B5, M24) : budgets mesurés dans Node sur la scène la plus chargée (nuit de boss,
// 120 Grignotins, 300 particules) : temps de mise à jour par pas (≤ 4 ms) et appels de dessin par image (≤ 1 200,
// compteur du canvas simulé). Écrit docs/sim/BENCH.md ; code de sortie 1 si un budget est dépassé.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { newGame } from '../tests/helpers/game.js';
import { makeNodeCanvas, CanvasStats } from '../tests/helpers/canvas.js';
import { defaultShop } from '../src/save/schema.js';
import { startNight } from '../src/game/night/night.js';
import { spawnMonster } from '../src/game/night/monsters.js';
import { stepGame } from '../src/game/phases.js';
import { lightSources } from '../src/game/night/light.js';
import { createRenderer } from '../src/render/renderer.js';
import { Particles } from '../src/render/particles.js';
import { PALETTE as P } from '../src/data/palette.js';
import { DISTRICTS } from '../src/data/districts.js';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const BUDGET = { updateMs: 4, drawCalls: 1200 };

/** Nuit de boss du Q5 : boutique E3 pleine, 120 Grignotins, Reine Phalène. */
function heavyNight() {
  const g = newGame(77, (s) => {
    s.shops.q5 = defaultShop('q5');
    Object.assign(s.shops.q5, { unlocked: true, night: 7, week: 3, expansion: 3 });
    s.shops.q5.layout = [
      { id: 'caisse', x: 3, y: 6, rot: 0 },
      ...[[0, 1], [1, 1], [5, 1], [6, 1], [0, 4], [6, 4], [2, 8], [4, 8]].map(([x, y], i) => ({ id: ['etagere', 'lanterne', 'plante', 'bonbons'][i % 4], x, y, rot: 0 })),
    ];
    s.currentShop = 'q5';
    s.player.level = 30;
  });
  for (const f of g.furn) f.eyes = 1;
  startNight(g, { dayTakings: 3000 });
  const types = Object.keys(DISTRICTS.q5.weights);
  const kinds = g.grid.entrances.map((e) => e.kind);
  for (let i = 0; g.night.monsters.active.length < 120 && i < 400; i++) {
    const m = spawnMonster(g, types[i % types.length], kinds[i % kinds.length]);
    if (m) m.hp = m.maxHp = 1e7;
  }
  spawnMonster(g, 'reine_phalene', 'backdoor');
  return g;
}

const g = heavyNight();
const monsters = g.night.monsters.active.length;

// 1. Mise à jour : 600 pas (10 s de jeu), après 60 pas de chauffe.
for (let i = 0; i < 60; i++) stepGame(g, 1 / 60);
const times = [];
for (let i = 0; i < 600; i++) {
  const t0 = performance.now();
  stepGame(g, 1 / 60);
  times.push(performance.now() - t0);
  g.events.clear();
}
times.sort((a, b) => a - b);
const avg = times.reduce((a, b) => a + b, 0) / times.length;
const p95 = times[Math.floor(times.length * 0.95)];

// 2. Dessin : une image complète (scène, éclairage, particules) sur le canvas simulé.
const stats = new CanvasStats();
const screen = makeNodeCanvas(stats).getContext('2d');
const renderer = createRenderer({ makeCanvas: (w, h) => makeNodeCanvas(new CanvasStats(), w, h), pixelScale: () => 2 });
const fx = new Particles();
for (let i = 0; i < 300; i++) {
  const p = fx.spawn('spark', 40 + (i % 280), 80 + ((i * 7) % 480));
  if (p) p.life = 10;
}
const frame = () => {
  stats.reset();
  renderer.draw(screen, g, { night: true, veil: 0.62, tint: P.voileNuit, lights: lightSources(g, []) });
  fx.draw(screen);
  return stats.drawCalls;
};
frame();
const calls = frame();

const rows = [
  ['Mise à jour (moyenne par pas)', `${avg.toFixed(2)} ms`, `≤ ${BUDGET.updateMs} ms`, avg <= BUDGET.updateMs],
  ['Mise à jour (95e centile)', `${p95.toFixed(2)} ms`, '—', true],
  ['Appels de dessin par image', String(calls), `≤ ${BUDGET.drawCalls}`, calls <= BUDGET.drawCalls],
];
const md = [
  '# Banc de performances (B5)',
  '',
  `Scène : nuit de boss du Q5 (semaine 3, boutique E3), ${monsters} Grignotins + la Reine Phalène, 300 particules. Node ${process.version}. Commande : \`npm run bench\`.`,
  '',
  '| Mesure | Valeur | Budget | Résultat |',
  '|---|---|---|---|',
  ...rows.map(([a, b, c, ok]) => `| ${a} | ${b} | ${c} | ${ok ? 'tenu' : '**DÉPASSÉ**'} |`),
  '',
  'Les appels de dessin comptent les tracés du canvas simulé (rectangles, chemins, images, textes) ; les sprites pré-rendus en cache comptent pour un seul appel.',
  '',
].join('\n');
writeFileSync(join(ROOT, 'docs/sim/BENCH.md'), md);
process.stdout.write(md);
process.exit(rows.every((r) => r[3]) ? 0 : 1);
