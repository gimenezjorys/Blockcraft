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
  'adCanOffer, adRecordShown, sanitizeRetention, retentionBump, retentionSummary, dayDiff, ' +
  'COACH_LINES, coachLine, TUTO_TOURS, sanitizeTutorial, tutorialActive, tutorialNextTour, tutorialAllSeen, tutorialNudgeDue, tutorialTourFailed, ' +
  'gardenTimeOfDay, GARDEN_WEATHERS, gardenWeatherFor, DEW, dewTotalFor, dewLeft, dewCollect, dewSpotsFor, ' +
  'sanitizePlantSeen, plantGrowthEvents, GARDENER_RANKS, gardenerXP, gardenerRank, STREAK_REPAIR_COOLDOWN, ' +
  'streakRepairStatus, streakApplyRepair, streakAlive, welcomeBackDue, sanitizeTips, INTERSTITIAL_RULES, interstitialAllowed';
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

{ // 6. Tutoriel de Germain (logique pure)
section('Tutoriel de Germain');
const lines = T.COACH_LINES.fr;
let longOnes = Object.keys(lines).filter(k => !k.startsWith('btn_') && lines[k].replace(/\{\w+\}/g, 'X').split(/\s+/).filter(Boolean).length > 12);
check(longOnes.length === 0, `répliques de 12 mots max (${longOnes.join(', ')})`);
check(Object.keys(lines).every(k => !/undefined|NaN/.test(T.coachLine(k, {}))), 'aucune réplique ne montre undefined ou NaN, même sans variables');
check(T.coachLine('tour_shop', { coins: 42 }) === 'Tu as 42 pièces ! Viens voir l\'Atelier.', 'variables remplacées');
check(T.coachLine('clé_inconnue') === '', 'clé inconnue → texte vide, jamais la clé brute');
check(T.coachLine('nudge_streak', { n: NaN }) .indexOf('NaN') < 0, 'NaN jamais affiché');
const fresh = T.sanitizeTutorial(null, {});
check(fresh.intro === 'pending' && !fresh.existing && T.TUTO_TOURS.every(k => fresh.tours[k] === 'pending'), 'nouveau joueur : intro et visites à faire');
const old = T.sanitizeTutorial(null, { existingPlayer: true });
check(old.intro === 'done' && old.existing && old.news === 'pending' && T.TUTO_TOURS.every(k => old.tours[k] === 'done'), 'joueur existant : aucune intro imposée, visite des nouveautés proposée');
check(old.done && !old.graduated && !fresh.done, 'joueur existant : rien à présenter, mais pas de diplôme sans tutoriel');
for (const bad of ['x', 42, [], { intro: 'zzz', tours: { garden: 'bof' }, attempts: { garden: 'NaN' } }]) {
  const t = T.sanitizeTutorial(bad, {});
  check(['pending', 'level1', 'done'].includes(t.intro) && T.TUTO_TOURS.every(k => ['pending', 'done', 'gone'].includes(t.tours[k])) && T.TUTO_TOURS.every(k => Number.isInteger(t.attempts[k])), `état corrompu assaini (${JSON.stringify(bad)})`);
}
let t = T.sanitizeTutorial(null, {}); t.intro = 'done';
const ctx0 = { levelsDone: 1, coins: 0, rosee: 0, gardenCost: 3, achievements: 0, dailyDoneToday: false };
check(T.tutorialNextTour(t, ctx0) === null, 'rien à présenter trop tôt');
check(T.tutorialNextTour(t, Object.assign({}, ctx0, { levelsDone: 2, rosee: 3 })) === 'garden', 'Jardin présenté dès qu\'il y a de quoi réveiller un coin');
check(T.tutorialNextTour(t, Object.assign({}, ctx0, { levelsDone: 3, coins: 30 })) === 'shop', 'Atelier présenté dès 30 pièces');
check(T.tutorialNextTour(Object.assign({}, t, { intro: 'pending' }), Object.assign({}, ctx0, { levelsDone: 9, coins: 99 })) === null, 'aucune visite avant la fin de l\'intro');
check(T.tutorialNextTour(Object.assign({}, t, { skipped: true }), Object.assign({}, ctx0, { levelsDone: 9, coins: 99 })) === null, 'tutoriel passé : plus rien n\'est imposé');
let f = T.tutorialTourFailed(t, 'garden');
check(f.tours.garden === 'pending' && f.attempts.garden === 1, '1er échec (cible absente) : on réessaiera');
f = T.tutorialTourFailed(f, 'garden');
check(f.tours.garden === 'gone', '2e échec : étape abandonnée proprement (jamais de boucle)');
const all = Object.assign({}, t, { tours: { garden: 'done', shop: 'done', daily: 'gone', achievements: 'done', profile: 'done' } });
check(T.tutorialAllSeen(all) && !T.tutorialAllSeen(t), 'fin du tutoriel quand tout est vu ou abandonné');
const n = Object.assign({}, t, { firstDay: '20261001' });
check(!T.tutorialNudgeDue(n, '20261001', {}) && T.tutorialNudgeDue(n, '20261002', {}) && !T.tutorialNudgeDue(n, '20261002', { dailyDoneToday: true }), 'rappel du défi : dès le lendemain, jamais si déjà fait');
check(!T.tutorialNudgeDue(Object.assign({}, n, { lastNudge: '20261002' }), '20261002', {}) && !T.tutorialNudgeDue(n, '20261015', {}), 'rappel : une fois par jour, première semaine seulement');
console.log(`✔ tutoriel : ${Object.keys(lines).length} répliques, états, visites, rappel`);
}

{ // 7. Le Jardin vivant (logique pure, section A6)
  section('Le Jardin vivant');
  // Heures → moments du ciel (heure locale : lumière, pas date).
  const tod = h => T.gardenTimeOfDay(h);
  check(tod(7) === 'aube' && tod(12) === 'jour' && tod(19) === 'crepuscule' && tod(23) === 'nuit' && tod(3) === 'nuit', 'moments de la journée');
  check(tod(NaN) === 'nuit' && tod('x') === 'nuit' && tod(-1) === 'nuit' && tod(33) === 'jour', 'heures invalides ou hors bornes : jamais d\'exception');
  // Météo : déterministe, toutes les météos apparaissent, proportions proches des poids.
  const wc = {};
  const day0 = Date.UTC(2026, 0, 1);
  const key = i => { const d = new Date(day0 + i * 86400000); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`; };
  for (let i = 0; i < 1000; i++) { const w = T.gardenWeatherFor(key(i)); wc[w.id] = (wc[w.id] || 0) + 1; check(T.gardenWeatherFor(key(i)).id === w.id, 'météo déterministe ' + key(i)); }
  const totalW = T.GARDEN_WEATHERS.reduce((a, w) => a + w.w, 0);
  T.GARDEN_WEATHERS.forEach(w => { const share = (wc[w.id] || 0) / 1000, want = w.w / totalW; check(Math.abs(share - want) < 0.06, `météo ${w.id} : ${(share * 100).toFixed(1)} % (visé ${(want * 100).toFixed(1)} %)`); });
  check(T.gardenWeatherFor(undefined) && T.gardenWeatherFor('') && T.gardenWeatherFor('xx'), 'météo : clé invalide → valeur saine');
  // Rosée du matin : 3 à 6 gouttes, plus avec la série, +1 les jours de pluie.
  for (let i = 0; i < 400; i++) {
    const k = key(i), rain = T.gardenWeatherFor(k).id === 'pluie' ? 1 : 0;
    check(T.dewTotalFor(k, 0) === 3 + rain, 'rosée sans série ' + k);
    check(T.dewTotalFor(k, 3) === 4 + rain && T.dewTotalFor(k, 7) === 5 + rain && T.dewTotalFor(k, 999) === 5 + rain, 'rosée selon la série ' + k);
    const spots = T.dewSpotsFor(k, T.dewTotalFor(k, 7));
    check(spots.length === T.dewTotalFor(k, 7) && new Set(spots).size === spots.length && spots.every(x => x >= 0 && x < T.DEW.spots), 'emplacements de gouttes distincts ' + k);
    check(JSON.stringify(spots) === JSON.stringify(T.dewSpotsFor(k, T.dewTotalFor(k, 7))), 'emplacements déterministes ' + k);
  }
  check(T.dewTotalFor('20260101', -5) >= 3 && T.dewTotalFor('20260101', 'abc') >= 3, 'série corrompue → base');
  // Cueillette : une goutte à la fois, plafonnée, remise à zéro le lendemain.
  let g = T.sanitizeGardenSave({ rosee: 2 });
  const dk = '20261001', tot = T.dewTotalFor(dk, 3);
  let picked = 0;
  for (let i = 0; i < 20; i++) { const r = T.dewCollect(g, dk, 3); if (r.ok) { picked++; g = r.save; check(r.left === tot - picked, 'gouttes restantes'); } }
  check(picked === tot && g.rosee === 2 + tot && g.earned === tot, `cueillette plafonnée : ${picked}/${tot}`);
  check(T.dewLeft(g, dk, 3) === 0 && T.dewLeft(g, '20261002', 3) === T.dewTotalFor('20261002', 3), 'nouvelle rosée le lendemain (UTC)');
  check(T.dewCollect(g, dk, 7).ok === (T.dewTotalFor(dk, 7) > tot), 'la série qui grandit fait perler une goutte de plus');
  // Sauvegarde : nouveaux champs, corruption, anciennes sauvegardes.
  const s0 = T.sanitizeGardenSave({ rosee: 9, done: 3 });
  check(s0.dewDay === '' && s0.dewTaken === 0 && s0.plantSeen === null && s0.rankSeen === -1 && s0.welcomeDay === '' && s0.repairDay === '', 'sauvegarde v1 : champs du jardin vivant par défaut');
  const bad = T.sanitizeGardenSave({ dewDay: 42, dewTaken: 'x', plantSeen: 'abc', rankSeen: 1e9, welcomeDay: '2026-10-01', repairDay: null });
  check(bad.dewDay === '' && bad.dewTaken === 0 && bad.plantSeen === null && bad.rankSeen === 99 && bad.welcomeDay === '' && bad.repairDay === '', 'champs corrompus → valeurs saines');
  // Plantes vues → événements de croissance.
  check(T.sanitizePlantSeen(null, 8) === null && T.sanitizePlantSeen([1, 9, -2, 'a'], 4).join() === '1,4,0,0', 'stades vus bornés');
  const ev = T.plantGrowthEvents([0, 1, 4, 2, 0, 0, 0, 0], [1, 1, 4, 4, 0, 0, 0, 2]);
  check(ev.length === 3 && ev[0].world === 1 && ev[1].world === 4 && ev[1].from === 2 && ev[1].to === 4 && ev[2].world === 8, 'croissance détectée (et jamais à rebours)');
  check(T.plantGrowthEvents(null, [1, 2]).length === 0 && T.plantGrowthEvents([4, 4], [1, 2]).length === 0, 'pas de fête rétroactive ni de décroissance');
  // Rangs du jardinier : barème absolu, croissant, bornes.
  check(T.GARDENER_RANKS.every((r, i) => i === 0 || r.xp > T.GARDENER_RANKS[i - 1].xp), 'paliers croissants');
  check(T.gardenerRank(0).name === 'Graine' && T.gardenerRank(59).index === 0 && T.gardenerRank(60).index === 1, 'premier palier');
  const top = T.gardenerRank(1e9);
  check(top.index === T.GARDENER_RANKS.length - 1 && top.next === null && top.pct === 100 && top.toNext === 0, 'dernier palier');
  check(T.gardenerRank(-5).index === 0 && T.gardenerRank('x').index === 0, 'XP corrompue → Graine');
  const maxCampaign = T.gardenerXP({ stars: T.LEVELS.length * 3, gardenDone: T.GARDEN_TOTAL_TASKS });
  check(maxCampaign < T.GARDENER_RANKS[T.GARDENER_RANKS.length - 1].xp, 'le dernier rang demande aussi de la régularité (pas seulement la campagne)');
  const month = T.gardenerXP({ stars: 120, gardenDone: 14, dailyWins: 25, sentierPerfect: 60, bestStreak: 12, achievements: 15 });
  check(T.gardenerRank(month).index >= 4 && T.gardenerRank(month).index <= 6, `un mois régulier ≈ rang 4 à 6 (obtenu : ${T.gardenerRank(month).index})`);
  check(T.gardenerXP({ stars: 'a', dailyWins: -3 }) === 0, 'XP : entrées corrompues ignorées');
  // Rattrapage de série.
  const keys = { today: '20261010', yesterday: '20261009', dayBefore: '20261008' };
  const st = { current: 6, best: 8, totalWins: 30, lastSuccessDate: '20261008' };
  let r = T.streakRepairStatus(st, keys, { freezes: 0, lastRepairDay: '' });
  check(r.offer && r.free, 'série de 6 interrompue hier : rattrapage gratuit proposé');
  check(T.streakRepairStatus(st, keys, { freezes: 0, lastRepairDay: '20261005' }).reason === 'ad', 'moins de 7 jours après le dernier : via pub seulement');
  check(T.streakRepairStatus(st, keys, { freezes: 0, lastRepairDay: '20261003' }).free, 'au bout de 7 jours : de nouveau gratuit');
  check(!T.streakRepairStatus(st, keys, { freezes: 1 }).offer, 'un gel couvre déjà le jour manqué');
  check(!T.streakRepairStatus(Object.assign({}, st, { current: 1 }), keys, {}).offer, 'série trop courte : rien à sauver');
  check(!T.streakRepairStatus(Object.assign({}, st, { lastSuccessDate: '20261009' }), keys, {}).offer, 'série intacte : rien à rattraper');
  check(!T.streakRepairStatus(Object.assign({}, st, { lastSuccessDate: '20261005' }), keys, {}).offer, 'plusieurs jours manqués : pas de rattrapage');
  check(!T.streakRepairStatus(st, keys, { dailyDoneToday: true }).offer && !T.streakRepairStatus(null, keys, null).offer, 'défi déjà fait / données absentes');
  const fixed = T.streakApplyRepair(st, keys.yesterday);
  check(fixed.current === 7 && fixed.best === 8 && fixed.totalWins === 31 && fixed.lastSuccessDate === keys.yesterday, 'rattrapage appliqué : hier compte');
  check(T.streakApplyRepair({ current: 9, best: 9, lastSuccessDate: 'x' }, keys.yesterday).best === 10, 'le record suit');
  // Série vivante (affichage) : jamais de série morte affichée.
  check(T.streakAlive(st, keys) === 6 && T.streakAlive(Object.assign({}, st, { lastSuccessDate: '20261009' }), keys) === 6, 'série en cours ou en pause');
  check(T.streakAlive(Object.assign({}, st, { lastSuccessDate: '20261011' }), keys) === 6, 'clé future (ancienne heure locale) : série conservée');
  check(T.streakAlive(Object.assign({}, st, { lastSuccessDate: '20261001' }), keys) === 0 && T.streakAlive({}, keys) === 0, 'série perdue : 0 affiché');
  // Bon retour.
  check(T.welcomeBackDue('20261001', '20261004', '').due && T.welcomeBackDue('20261001', '20261004', '').days === 3, 'retour après 3 jours');
  check(!T.welcomeBackDue('20261002', '20261004', '').due && !T.welcomeBackDue('20261001', '20261004', '20261004').due && !T.welcomeBackDue('', '20261004', '').due, 'pas de cadeau en double ni sans historique');
  // Aides contextuelles.
  const tp = T.sanitizeTips({ seen: { dew: true, rank: 'oui', 'X Y': true, plant_grow: true } });
  check(tp.seen.dew === true && tp.seen.plant_grow === true && !tp.seen.rank && !tp.seen['X Y'], 'aides vues : seules les clés sûres restent');
  check(Object.keys(T.sanitizeTips('n\'importe quoi').seen).length === 0 && Object.keys(T.sanitizeTips(null).seen).length === 0, 'aides corrompues → aucune vue');
  // Interstitiel : désactivé par défaut, jamais trop tôt ni trop souvent.
  const R = T.INTERSTITIAL_RULES, now = 1e12;
  const base = { enabled: true, levelsDone: 20, nowMs: now, dayKey: '20261010', breaks: R.everyBreaks };
  check(!T.interstitialAllowed({}, Object.assign({}, base, { enabled: false })).ok, 'interstitiel désactivé → jamais');
  check(T.interstitialAllowed({}, base).ok, 'interstitiel activé, conditions réunies');
  check(T.interstitialAllowed({}, Object.assign({}, base, { levelsDone: R.minLevelsDone - 1 })).reason === 'too_early', 'jamais avant le niveau ' + R.minLevelsDone);
  check(T.interstitialAllowed({ lastAt: now - 60000 }, base).reason === 'interval', 'jamais deux fois en 5 minutes');
  check(T.interstitialAllowed({ day: '20261010', count: R.dailyCap }, base).reason === 'daily_cap', 'plafond quotidien');
  check(T.interstitialAllowed({ day: '20261009', count: R.dailyCap }, base).ok, 'plafond remis à zéro le lendemain');
  check(T.interstitialAllowed({}, Object.assign({}, base, { breaks: R.everyBreaks + 1 })).reason === 'not_this_break', 'une pause sur ' + R.everyBreaks + ' seulement');
  check(!T.interstitialAllowed(null, null).ok, 'données absentes → jamais');
  console.log('✔ jardin vivant : ciel, météo (1000 jours), rosée du matin, croissance, rangs, rattrapage, bon retour, aides, interstitiel');
}

console.log(`\n${checks} vérifications, ${failures} échec(s).`);
process.exit(failures ? 1 : 0);
