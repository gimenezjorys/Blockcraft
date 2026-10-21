// Fort Boutique — simulations d'équilibrage (D2) : bots Faible / Moyen / Fort sur la logique pure, en parallèle.
// Usage : npm run sim -- [--runs 300] [--district q1] [--max-cycles 30] [--quiet]
// Écrit docs/sim/SIM_Q1.md et docs/sim/SIM_Q1.json. Code de sortie 1 si un seuil n'est pas tenu.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulateGame, applyOverrides } from './lib/sim-engine.mjs';
import { evaluateQ1, median } from './lib/sim-metrics.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const PROFILE_IDS = ['weak', 'medium', 'strong'];

/** Réglages faits en M10 (aussi notés dans DECISIONS.md et GAME_DESIGN.md). */
const TUNING = [
  ['Budget de menace : base (G8.3)', '5', '6,25', '+25 %'],
  ['Budget de menace : par nuit (G8.3)', '2,5', '3,125', '+25 %'],
  ['PV raton / souris / gloubi / mini-gloubi / termite / raton doré (G10)', '20 / 9 / 50 / 14 / 34 / 40', '25 / 11 / 62 / 17 / 42 / 50', '+21 à +25 % (arrondis)'],
  ['Vitesse du voleur (G8.4)', '× 1,2', '× 1,5', '+25 %'],
  ['Balai : dégâts / intervalle / portée (G8.7)', '6 / 0,8 s / 0,9', '4,5 / 1,0 s / 0,68', '−25 % / +25 % / −24 %'],
  ['Roi Raton : PV / invocation (G10.3)', '900 / 6 s', '1 125 / 4,8 s', '+25 % / −20 %'],
  ['Dégâts des meubles par niveau (G9.1)', '× 1,20', '× 1,12', '−7 %'],
];

/** Résultat allégé (sans le détail des meubles), pour les messages entre workers. */
function slim(r) {
  return { ...r, cycles: r.cycles.map(({ furniture, ...c }) => ({ ...c, furn: furniture.etagere || 1 })) };
}

if (!isMainThread) {
  const out = [];
  applyOverrides(workerData.overrides);
  for (const job of workerData.jobs) out.push(slim(simulateGame(job)));
  parentPort.postMessage(out);
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, def) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : def;
  };
  const runs = Number(arg('runs', 300));
  const district = arg('district', 'q1');
  const maxCycles = Number(arg('max-cycles', 30));
  if (district !== 'q1' && district !== 'all') {
    process.stderr.write(`quartier ${district} : simulation disponible avec son contenu (M16 à M19)\n`);
    process.exit(1);
  }
  const result = await runSims({ runs, maxCycles });
  const md = report(result, { runs, maxCycles });
  mkdirSync(join(ROOT, 'docs/sim'), { recursive: true });
  writeFileSync(join(ROOT, 'docs/sim/SIM_Q1.md'), md);
  writeFileSync(join(ROOT, 'docs/sim/SIM_Q1.json'), JSON.stringify({ runs, maxCycles, rows: result.evaluation.rows, info: result.evaluation.info }, null, 2) + '\n');
  if (!process.argv.includes('--quiet')) process.stdout.write(md);
  process.exit(result.evaluation.ok ? 0 : 1);
}

/**
 * Lance `runs` parties par profil sur plusieurs workers.
 * @param {{ runs: number, maxCycles: number, seedBase?: number, workers?: number, overrides?: Record<string, any> }} o
 */
export async function runSims(o) {
  const jobs = [];
  for (const profile of PROFILE_IDS) for (let i = 0; i < o.runs; i++) jobs.push({ seed: (o.seedBase ?? 1000) + i, profile, maxCycles: o.maxCycles });
  const W = Math.max(1, Math.min(o.workers ?? availableParallelism() - 1, 8, jobs.length));
  const t0 = performance.now();
  const chunks = Array.from({ length: W }, (_, k) => jobs.filter((_, i) => i % W === k));
  const parts = await Promise.all(chunks.map((c) => new Promise((resolve, reject) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs: c, overrides: o.overrides || null } });
    w.once('message', resolve);
    w.once('error', reject);
  })));
  const all = parts.flat();
  const byProfile = Object.fromEntries(PROFILE_IDS.map((p) => [p, all.filter((g) => g.profile === p)]));
  return { byProfile, evaluation: evaluateQ1(byProfile, o.maxCycles), seconds: (performance.now() - t0) / 1000, workers: W };
}

function report(res, o) {
  const ev = res.evaluation;
  const L = [];
  L.push('# Simulation d\'équilibrage — Quartier 1 (L\'Épicerie de Mamie)', '');
  L.push(`${o.runs} parties par profil (Faible, Moyen, Fort), ${o.maxCycles} cycles au plus, ${res.workers} workers, ${res.seconds.toFixed(0)} s. Graine par partie : 1000 + i. Commande : \`npm run sim -- --runs ${o.runs} --district q1\`.`, '');
  L.push('## Seuils (D2.4, G12.5)', '', '| Seuil | Mesure | Résultat |', '|---|---|---|');
  for (const r of ev.rows) L.push(`| ${r.id} — ${r.label} | ${r.value} | ${r.ok ? 'tenu' : '**NON TENU**'} |`);
  L.push('', 'Non applicables avant leurs missions : D2.4.7 (pubs récompensées, M15) et D2.4.8 (Défi du jour, M14). Les quêtes du jour (M12) sont simulées par un modèle provisoire (`scripts/lib/quests-model.mjs` : Faible 1, Moyen 2, Fort 3 quêtes par cycle dès le niveau 4).', '');
  L.push('## Repères', '');
  const i = ev.info;
  L.push(`- Roi Raton battu (médiane) : Faible cycle ${i.bossCycles.weak}, Moyen cycle ${i.bossCycles.medium}, Fort cycle ${i.bossCycles.strong}.`);
  L.push(`- Durée des nuits (Moyen, médiane) : nuit 1 ${i.nightS.n1.toFixed(0)} s, nuit 2 ${i.nightS.n2.toFixed(0)} s, nuit 6 ${i.nightS.n6.toFixed(0)} s.`);
  L.push(`- Nuits à ★★★ (toutes les nuits du Q1, Pleine Lune comprise) : Faible ${Math.round(i.starsShare.weak * 100)} %, Moyen ${Math.round(i.starsShare.medium * 100)} %, Fort ${Math.round(i.starsShare.strong * 100)} %.`);
  L.push(`- Gains par cycle (Moyen, médiane, hors Pleine Lune) : ${Math.round(i.earnedPerCycle)} pièces.`);
  L.push('', '## Niveau de marchand par cycle (médiane)', '', '| Cycle | Faible | Moyen | Fort |', '|---|---|---|---|');
  for (let c = 1; c <= 12; c++) {
    const lv = (p) => median(res.byProfile[p].map((g) => (g.cycles[c - 1] ? g.cycles[c - 1].level : NaN)));
    L.push(`| ${c} | ${lv('weak')} | ${lv('medium')} | ${lv('strong')} |`);
  }
  L.push('', '## Changements faits (M10, marges D2.5)', '', '| Valeur | Avant | Après | Écart |', '|---|---|---|---|');
  for (const c of TUNING) L.push(`| ${c[0]} | ${c[1]} | ${c[2]} | ${c[3]} |`);
  L.push('', 'Hors données : bots corrigés (itinéraire BFS, case d\'accès de la caisse, dépenses du Matin), trois bugs de jeu corrigés (emplacement d\'achat bloqué, pile bloquée par un produit sans étagère, produit d\'étagère modifiable dans l\'éditeur). Voir DECISIONS.md.');
  L.push('', '## Limites connues', '');
  L.push('- Les nuits 2 à 6 de la semaine 1 ne coûtent presque jamais d\'étoile, quel que soit le profil : les voleurs arrivent à la caisse très abîmés et meurent sur le chemin du retour. La difficulté du Q1 repose donc sur la première nuit (voleur scénarisé) et la Pleine Lune, où le Courage de Mamie évite le mur.');
  L.push('- Le Moyen bat le Roi Raton au cycle 10 en médiane : dans la fenêtre 7–10, mais à son bord. Tenir à la fois ce seuil et « Fort ≤ 80 % de ★★★ » laisse peu de marge ; à revoir avec les vraies quêtes (M12) et lors de l\'équilibrage global (M20).');
  L.push('', `Verdict : ${ev.ok ? 'tous les seuils applicables sont tenus.' : 'au moins un seuil n\'est pas tenu.'}`, '');
  return L.join('\n') + '\n';
}
