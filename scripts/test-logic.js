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
  'buildSentierBoard, buildEchoBoard, mechanicMatters, GEN_MECHANICS, buildDailyBoard, DAILY_RULES, ' +
  'GARDEN_ZONES, GARDEN_TOTAL_TASKS, GARDEN_TOTAL_COST, sanitizeGardenSave, gardenStatus, gardenRestoreNext, ' +
  'ROSEE, roseeForLevelWin, roseeForDaily, roseeForSentier, RITUAL_POOL, ritualMissionsFor, ritualFresh, ' +
  'sanitizeRitual, ritualApply, ritualAllDone, AD_PLACEMENTS, AD_DAILY_CAP, AD_MIN_INTERVAL_MS, sanitizeAdState, ' +
  'adCanOffer, adRecordShown, sanitizeRetention, retentionBump, retentionSummary, dayDiff';
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


{ // 5. Le Jardin endormi, le rituel, les pubs (logique pure)
section('Jardin endormi : économie et restauration');
check(T.GARDEN_TOTAL_TASKS === 25, `25 chantiers attendus (${T.GARDEN_TOTAL_TASKS})`);
check(T.GARDEN_ZONES.every(z => z.tasks.every((t, i) => i === 0 || t.cost >= z.tasks[i - 1].cost)), 'coûts croissants dans chaque zone');
check(T.GARDEN_ZONES[0].tasks[0].cost <= 3, '1er chantier atteignable dès le 1er niveau à 3★');
check(T.GARDEN_TOTAL_COST >= 600 && T.GARDEN_TOTAL_COST <= 900, `coût total dans la cible 3-6 semaines (${T.GARDEN_TOTAL_COST})`);
// Données corrompues : jamais de plantage, valeurs saines.
for (const bad of [null, 42, 'x', [], { rosee: -5, done: 999, earned: 'NaN' }, { rosee: 1e99 }]) {
  const s = T.sanitizeGardenSave(bad);
  check(s.rosee >= 0 && Number.isInteger(s.rosee) && s.done >= 0 && s.done <= 25, `sauvegarde corrompue assainie (${JSON.stringify(bad)})`);
}
// Parcours complet : on paie exactement le coût total, zones terminées dans l'ordre.
let gs = T.sanitizeGardenSave({ rosee: T.GARDEN_TOTAL_COST });
let zonesDone = 0;
for (let i = 0; i < 25; i++) {
  const r = T.gardenRestoreNext(gs);
  check(r.ok, `chantier ${i} restaurable`);
  if (r.zoneCompleted) zonesDone++;
  gs = r.save;
}
check(gs.rosee === 0 && gs.done === 25 && zonesDone === 5, `jardin complet : 0 rosée restante, 5 zones (${gs.rosee}, ${zonesDone})`);
check(T.gardenStatus(25).complete && !T.gardenRestoreNext(gs).ok, 'plus rien à restaurer une fois complet');
const poor = T.gardenRestoreNext({ rosee: 2, done: 0 });
check(!poor.ok && poor.reason === 'rosee' && poor.missing === 1 && poor.save.rosee === 2, 'pas assez de rosée : rien ne change, manque exact');
check(T.gardenStatus(7).zoneIndex === 1 && T.gardenStatus(7).zoneDone === 2, 'statut : zone 2, 2 chantiers faits');
check(T.roseeForLevelWin(0, 3) === 3 && T.roseeForLevelWin(2, 3) === 1 && T.roseeForLevelWin(3, 2) === 0, 'rosée = étoiles NOUVELLES seulement (anti-farm)');
check(T.roseeForDaily(true, 3) === 6 && T.roseeForDaily(true, 1) === 4 && T.roseeForDaily(false, 3) === 0, 'rosée du défi : 1re réussite du jour seulement');
let sen = T.roseeForSentier({}, 8, '20260930');
check(sen.gain === 8, 'Sentier : 8 parfaits → 8 💧');
sen = T.roseeForSentier(sen.save, 10, '20260930');
check(sen.gain === T.ROSEE.sentierDailyCap - 8, 'Sentier : plafond quotidien respecté');
check(T.roseeForSentier(sen.save, 3, '20261001').gain === 3, 'Sentier : plafond remis à zéro le lendemain');
console.log(`✔ jardin : 25 chantiers, ${T.GARDEN_TOTAL_COST} 💧 au total, barème et plafonds vérifiés`);

section('Rituel du jour');
let ritualDays = 0;
const r0 = Date.UTC(2026, 0, 1);
for (let i = 0; i < 120; i++) {
  const rd = new Date(r0 + i * 86400000);
  const key = `${rd.getUTCFullYear()}${String(rd.getUTCMonth() + 1).padStart(2, '0')}${String(rd.getUTCDate()).padStart(2, '0')}`;
  const ids = T.ritualMissionsFor(key, { sentier: true, gardenNext: true });
  check(ids.length === 3 && ids[0] === 'daily' && new Set(ids).size === 3, `rituel ${key} : 3 missions distinctes dont le défi`);
  check(JSON.stringify(ids) === JSON.stringify(T.ritualMissionsFor(key, { sentier: true, gardenNext: true })), `rituel ${key} déterministe`);
  const noSentier = T.ritualMissionsFor(key, { sentier: false, gardenNext: false });
  check(!noSentier.includes('sentier4') && !noSentier.includes('restore1'), `rituel ${key} : jamais de mission impossible`);
  ritualDays++;
}
let rit = T.ritualFresh('20260930', { sentier: true, gardenNext: true });
rit.ids = ['daily', 'levels3', 'perfect3']; rit.prog = [0, 0, 0];
let res = T.ritualApply(rit, { type: 'level_win', stars: 3, perfect: true, hint: false });
check(res.rit.prog.join() === '0,1,1' && res.completed.length === 0, 'victoire parfaite : niveaux +1, parfaits +1');
res = T.ritualApply(res.rit, { type: 'daily_win', stars: 3, perfect: true });
check(res.completed.includes(0) && res.rit.prog[2] === 2, 'défi : mission 1 accomplie, parfaits +1');
res = T.ritualApply(res.rit, { type: 'level_win', stars: 2, perfect: false });
res = T.ritualApply(res.rit, { type: 'level_win', stars: 3, perfect: true });
check(T.ritualAllDone(res.rit), 'les 3 missions accomplies → coffre prêt');
const after = T.ritualApply(res.rit, { type: 'level_win', stars: 3, perfect: true });
check(after.completed.length === 0 && after.rit.prog.join() === res.rit.prog.join(), 'progression plafonnée, rien de compté deux fois');
check(T.sanitizeRitual(res.rit, '20261001', {}).day === '20261001' && T.sanitizeRitual(res.rit, '20261001', {}).prog.every(p => p === 0), 'nouveau jour = nouveau rituel');
check(T.sanitizeRitual({ day: '20260930', ids: ['zzz'], prog: [1] }, '20260930', {}).ids[0] === 'daily', 'rituel corrompu → rituel neuf');
console.log(`✔ rituel : ${ritualDays} jours générés, missions possibles et déterministes`);

section('Pubs récompensées : plafonds');
let ad = T.sanitizeAdState(null, '20260930');
let t = 1e12, shown = 0;
for (let i = 0; i < 20; i++) {
  const pl = ['victory_double', 'hint_bonus', 'garden_boost', 'ritual_chest_bonus', 'sentier_double'][i % 5];
  if (T.adCanOffer(ad, pl, t).ok) { ad = T.adRecordShown(ad, pl, t); shown++; }
  t += T.AD_MIN_INTERVAL_MS;
}
check(shown <= T.AD_DAILY_CAP, `plafond quotidien global (${shown} ≤ ${T.AD_DAILY_CAP})`);
check(Object.keys(T.AD_PLACEMENTS).every(k => (ad.counts[k] || 0) <= T.AD_PLACEMENTS[k].cap), 'plafond par emplacement');
const fresh = T.adRecordShown(T.sanitizeAdState(null, '20260930'), 'victory_double', 1000);
check(T.adCanOffer(fresh, 'hint_bonus', 1000 + T.AD_MIN_INTERVAL_MS - 1).reason === 'interval', 'intervalle minimal entre deux pubs');
check(T.sanitizeAdState(ad, '20261001').total === 0, 'compteurs remis à zéro le lendemain');
check(!T.adCanOffer(ad, 'inconnu', t).ok, 'emplacement inconnu refusé');

section('Compteurs de rétention');
let ret = T.retentionBump(null, '20260901', 's');
ret = T.retentionBump(ret, '20260901', 'l', 4);
ret = T.retentionBump(ret, '20260902', 's');
ret = T.retentionBump(ret, '20260908', 's');
ret = T.retentionBump(ret, '20260908', 'ao', 2);
ret = T.retentionBump(ret, '20260908', 'aa', 1);
const sum = T.retentionSummary(ret);
check(sum.returnedD1 && sum.returnedD7 && !sum.returnedD30 && sum.activeDays === 3, 'retours J1 et J7 détectés, pas J30');
check(sum.winsPerSession === 1.33 && sum.adAcceptRate === 0.5, `moyennes calculées (${sum.winsPerSession}, ${sum.adAcceptRate})`);
check(T.retentionSummary('garbage').activeDays === 0 && T.dayDiff('20260228', '20260301') === 1, 'données corrompues tolérées, écart de jours en UTC');
console.log('✔ pubs plafonnées, rétention J1/J7/J30 calculée');
}

console.log(`\n${checks} vérifications, ${failures} échec(s).`);
process.exit(failures ? 1 : 0);
