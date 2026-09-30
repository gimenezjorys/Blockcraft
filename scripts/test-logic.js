#!/usr/bin/env node
// Tests des règles et du contenu généré, sans navigateur.
// Charge la zone « données + solveur + générateur » d'index.html (de
// `const LEVELS = [` jusqu'à `window.BCD_DEV = {`) dans une VM Node, puis
// vérifie :
//   1. les symétries (rotation/miroir) conservent solvabilité ET par sur
//      les 60 niveaux × 8 transformations ;
//   2. le générateur du Sentier produit des plateaux valides, dans la
//      fourchette de par visée, reproductibles à graine égale ;
//   3. la mécanique vedette d'un plateau généré compte réellement ;
//   4. le repli « Écho » fournit toujours un plateau jouable.
// Usage : node scripts/test-logic.js [chemin/vers/index.html]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = process.argv[2] || path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const js = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
const start = js.indexOf('const LEVELS = [');
const end = js.indexOf('window.BCD_DEV = {');
if (start < 0 || end < start) { console.error('✘ zone LEVELS…BCD_DEV introuvable'); process.exit(1); }
const exportsList = 'LEVELS, Solver, makeRng, hashSeed, generateBoard, transformLevel, sentierProfile, ' +
  'buildSentierBoard, buildEchoBoard, mechanicMatters, GEN_MECHANICS, buildDailyBoard, DAILY_RULES';
const ctx = vm.createContext({ console: { log() {} } });
vm.runInContext('"use strict";\n' + js.slice(start, end) + `\n;globalThis.__t = { ${exportsList} };`, ctx, { filename: 'logic.js' });
const T = ctx.__t;

let failures = 0, checks = 0;
function check(cond, msg) {
  checks++;
  if (!cond) { failures++; console.error('✘ ' + msg); }
}
function section(title) { console.log('\n— ' + title); }

// 1. Symétries
section('Symétries des 60 niveaux');
let symChecked = 0;
T.LEVELS.forEach((lvl, i) => {
  for (let t = 0; t < 8; t++) {
    const tl = T.transformLevel(lvl, t);
    const r = T.Solver.analyze(tl);
    check(!r.brokenReason && r.solvable, `niveau ${i + 1} symétrie ${t} : non solvable (${r.brokenReason})`);
    check(r.minMoves === lvl.par, `niveau ${i + 1} symétrie ${t} : par ${r.minMoves} ≠ ${lvl.par}`);
    symChecked++;
  }
});
console.log(`✔ ${symChecked} transformations vérifiées (solvables, par conservé)`);

// 2-3. Générateur
section('Générateur du Sentier');
const ALL = ['rochers', 'ancre', 'portails', 'sens-unique', 'interrupteurs', 'portails-directionnels'];
const perMech = {};
const t0 = Date.now();
let generated = 0, worstMs = 0;
for (const mech of [null].concat(ALL)) {
  for (let s = 0; s < 6; s++) {
    for (const boardNumber of [1, 4, 8, 12, 18]) {
      const profile = T.sentierProfile(boardNumber, 'chrono');
      const rng = T.makeRng(T.hashSeed(`test-${mech}-${s}-${boardNumber}`));
      const g0 = Date.now();
      const lvl = T.generateBoard(rng, { size: profile.size, minPar: profile.minPar, maxPar: profile.maxPar, minStates: profile.minStates, featured: mech, maxAttempts: 300 });
      worstMs = Math.max(worstMs, Date.now() - g0);
      const key = mech || 'murs';
      perMech[key] = perMech[key] || { ok: 0, fail: 0 };
      if (!lvl) { perMech[key].fail++; continue; }
      perMech[key].ok++;
      generated++;
      const r = T.Solver.analyze(lvl);
      check(!r.brokenReason && r.solvable, `plateau généré invalide (${key}) : ${r.brokenReason}`);
      check(r.minMoves === lvl.par, `par incohérent (${key}) : ${r.minMoves} ≠ ${lvl.par}`);
      check(lvl.par >= profile.minPar && lvl.par <= profile.maxPar, `par ${lvl.par} hors fourchette [${profile.minPar},${profile.maxPar}] (${key})`);
      if (mech) check(T.mechanicMatters(lvl, mech, lvl.par), `mécanique vedette décorative (${key})`);
    }
  }
}
Object.keys(perMech).forEach(k => console.log(`  ${k.padEnd(24)} ${perMech[k].ok} générés, ${perMech[k].fail} replis nécessaires`));
console.log(`✔ ${generated} plateaux générés et revalidés en ${Date.now() - t0} ms (pire cas ${worstMs} ms)`);

// Reproductibilité
const a = T.generateBoard(T.makeRng(12345), { size: 5, minPar: 3, maxPar: 4, featured: 'rochers' });
const b = T.generateBoard(T.makeRng(12345), { size: 5, minPar: 3, maxPar: 4, featured: 'rochers' });
check(JSON.stringify(a) === JSON.stringify(b), 'même graine → même plateau');
console.log('✔ reproductible à graine égale');

// 4. Parties complètes simulées (buildSentierBoard avec repli Écho)
section('Parties du Sentier simulées');
const known = ALL.slice();
let boards = 0, echoes = 0;
for (let run = 0; run < 4; run++) {
  const rng = T.makeRng(T.hashSeed('run-' + run));
  for (let n = 1; n <= 20; n++) {
    const lvl = T.buildSentierBoard(rng, n, { known, completedIndices: [...Array(60).keys()], kind: run % 2 ? 'zen' : 'chrono' });
    check(!!lvl, `partie ${run} plateau ${n} : aucun plateau`);
    if (!lvl) continue;
    const r = T.Solver.analyze(lvl);
    check(r.solvable && r.minMoves === lvl.par, `partie ${run} plateau ${n} : invalide`);
    check(r.minMoves >= 2, `partie ${run} plateau ${n} : trivial (${r.minMoves} coup)`);
    boards++;
    if (lvl.tag === 'ECHO') echoes++;
  }
}
// Joueur débutant : ne connaît que murs (Monde 1 terminé) → jamais d'autre mécanique.
const rngNew = T.makeRng(7);
for (let n = 1; n <= 12; n++) {
  const lvl = T.buildSentierBoard(rngNew, n, { known: [], completedIndices: [0, 1, 2, 3, 4, 5, 6, 7], kind: 'chrono' });
  const extra = (lvl.mechanics || []).filter(m => m !== 'glissement' && m !== 'murs');
  check(extra.length === 0, `débutant : mécanique inconnue générée (${extra.join(',')})`);
  boards++;
}
console.log(`✔ ${boards} plateaux de partie valides (${echoes} Échos)`);

// 5. Défi du jour généré : 400 jours consécutifs
section('Défi du jour généré (400 jours)');
const d0 = Date.UTC(2026, 0, 1);
let dailyOk = 0, dailyMs = 0;
const seenBoards = new Set();
for (let i = 0; i < 400; i++) {
  const d = new Date(d0 + i * 86400000);
  const key = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const g0 = Date.now();
  const lvl = T.buildDailyBoard(key, d.getUTCDay());
  dailyMs = Math.max(dailyMs, Date.now() - g0);
  check(!!lvl, `défi ${key} : génération impossible`);
  if (!lvl) continue;
  const r = T.Solver.analyze(lvl);
  check(r.solvable && r.minMoves === lvl.par && lvl.par >= 4 && lvl.par <= 6, `défi ${key} : par ${lvl.par} invalide`);
  const rule = T.DAILY_RULES[d.getUTCDay()];
  if (rule.featured) check((lvl.mechanics || []).includes(rule.featured), `défi ${key} : règle du jour absente (${rule.featured})`);
  const again = T.buildDailyBoard(key, d.getUTCDay());
  check(JSON.stringify(again) === JSON.stringify(lvl), `défi ${key} : non déterministe`);
  seenBoards.add(JSON.stringify({ s: lvl.seed, g: lvl.goal, w: lvl.walls }));
  dailyOk++;
}
check(seenBoards.size > 390, `défis trop répétitifs (${seenBoards.size} distincts sur 400)`);
console.log(`✔ ${dailyOk}/400 défis générés, déterministes, règle du jour respectée (pire cas ${dailyMs} ms, ${seenBoards.size} distincts)`);

console.log(`\n${checks} vérifications, ${failures} échec(s).`);
process.exit(failures ? 1 : 0);
