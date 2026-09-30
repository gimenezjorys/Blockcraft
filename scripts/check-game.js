#!/usr/bin/env node
// Vérifie index.html sans le modifier :
//   1. extrait le JS inline et lance `node --check` dessus ;
//   2. exécute le solveur interne (Solver.validateLevels(LEVELS)) et échoue
//      si au moins un niveau est cassé ou non solvable (❌).
// Les avertissements (⚠️ TRIVIAL pour les niveaux INTRO, etc.) ne font pas échouer.
// Usage : node scripts/check-game.js [chemin/vers/index.html]
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const htmlPath = process.argv[2] || path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m => m[1])
  .filter(s => s.trim());
if (scripts.length === 0) fail('aucun <script> inline trouvé dans ' + htmlPath);
const js = scripts.join('\n;\n');

// 1. node --check
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bcd-')), 'game.js');
fs.writeFileSync(tmp, js);
try {
  execFileSync(process.execPath, ['--check', tmp], { stdio: 'inherit' });
} catch (e) {
  fail('node --check a échoué sur le JS extrait');
}
console.log('✔ node --check : OK (' + js.split('\n').length + ' lignes)');

// 2. Solveur : on isole la partie « données + solveur » du script principal,
//    c'est-à-dire de la déclaration de LEVELS jusqu'au point d'entrée BCD_DEV
//    (le reste du jeu dépend du DOM et n'est pas nécessaire ici).
const start = js.indexOf('const LEVELS = [');
const end = js.indexOf('window.BCD_DEV = {');
if (start < 0 || end < 0 || end < start) {
  fail('impossible de localiser LEVELS / window.BCD_DEV dans le JS');
}
const solverSrc = js.slice(start, end) + '\n;globalThis.__bcd = { LEVELS, Solver };';
const logs = [];
const ctx = vm.createContext({ console: { log: l => logs.push(String(l)) }, window: {} });
try {
  vm.runInContext('"use strict";\n' + solverSrc, ctx, { filename: 'solver.js' });
} catch (e) {
  fail('exécution du solveur impossible : ' + e.message);
}
const { LEVELS, Solver } = ctx.__bcd;
const report = Solver.validateLevels(LEVELS);
logs.forEach(l => console.log(l));

const broken = report.filter(l => l.includes('❌'));
if (broken.length > 0) {
  fail(broken.length + ' niveau(x) cassé(s) :\n' + broken.join('\n'));
}
console.log('✔ Solveur : ' + LEVELS.length + ' niveaux, 0 cassé');

function fail(msg) {
  console.error('✘ ' + msg);
  process.exit(1);
}
