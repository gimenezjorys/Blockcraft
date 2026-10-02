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
  'streakRepairStatus, streakApplyRepair, streakAlive, welcomeBackDue, sanitizeTips, INTERSTITIAL_RULES, interstitialAllowed, ' +
  'weekKeyFor, seasonKeyFor, DAILY_GIFTS, sanitizeGift, giftStatus, giftClaim, WEEKLY_POOL, WEEKLY_COUNT, weeklyMission, weeklyMissionsFor, ' +
  'sanitizeWeekly, weeklyApply, weeklyClaimable, weeklyClaim, weeklyChestReady, SEASON_TIERS, SEASON_XP_PER_TIER, seasonReward, sanitizeSeason, ' +
  'seasonTier, seasonClaimable, seasonRoll, seasonAddXP, seasonClaim, seasonDaysLeft, marketDailyOffer, marketWeeklyPack, sanitizeMarket, ' +
  'COLLECTION_MILESTONES, collectionMilestones, sanitizeNav, navBadgeCounts, dailyPersonalRank, tomorrowPreview, bundleText, buildEndlessLevel, endlessWorldOf, BOUQUET, gardenBouquet, streakCreditDay, endlessProfile, ENDLESS_WORLDS, ENDLESS_LEVELS_PER_WORLD, ENDLESS_FIRST_WORLD';
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
check(T.coachLine('tour_shop', { coins: 42 }) === 'Tu as 42 pièces ! Viens voir ta Collection.', 'variables remplacées');
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
check(T.tutorialNextTour(t, Object.assign({}, ctx0, { levelsDone: 2, giftAvailable: true })) === 'market', 'Marché présenté dès qu\'un cadeau du jour attend');
check(T.tutorialNextTour(t, Object.assign({}, ctx0, { levelsDone: 2, giftAvailable: false })) === null, 'Marché : jamais présenté sans cadeau à ouvrir');
check(T.tutorialNextTour(t, Object.assign({}, ctx0, { levelsDone: 5, achievements: 1, dailyDoneToday: true })) === 'profile', 'Profil (missions, saison, succès) présenté après le premier succès');
check(T.TUTO_TOURS.join() === 'garden,shop,daily,market,profile', 'visites de la nouvelle interface (Succès et Profil fusionnés, Marché ajouté)');
check(fresh.look2 === true && old.look2 === false && T.sanitizeTutorial({ intro: 'done', tours: {} }, {}).look2 === false && T.sanitizeTutorial({ intro: 'done', look2: true }, {}).look2 === true,
  'annonce du nouveau look : jamais pour un nouveau joueur, une fois pour une ancienne sauvegarde');
const all = Object.assign({}, t, { tours: { garden: 'done', shop: 'done', daily: 'gone', market: 'done', profile: 'done' } });
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

{ // 8. Le hub : cadeau du jour, missions de la semaine, saison, marché, collection, pastilles (A7)
  section('Le hub (A7)');
  // Semaines et saisons UTC.
  check(T.weekKeyFor('20261001') === '20260928' && T.weekKeyFor('20260928') === '20260928' && T.weekKeyFor('20261004') === '20260928' && T.weekKeyFor('20261005') === '20261005', 'semaine = son lundi (UTC)');
  check(T.weekKeyFor('20270101') === '20261228' && T.weekKeyFor('x') === '', 'semaine à cheval sur deux années ; clé invalide');
  check(T.seasonKeyFor('20261031') === '202610' && T.seasonKeyFor('nope') === '', 'saison = mois UTC');
  // Cadeau du jour : une fois par jour, le cycle avance, jamais de remise à zéro.
  let gs = T.sanitizeGift(null);
  check(T.giftStatus(gs, '20261001').available && T.giftStatus(gs, '20261001').step === 0, 'premier cadeau disponible');
  let r = T.giftClaim(gs, '20261001');
  check(r.ok && r.index === 0 && r.gift.coins === 15 && r.save.step === 1, 'cadeau du jour 1 récupéré');
  check(!T.giftClaim(r.save, '20261001').ok, 'une seule fois par jour');
  check(T.giftClaim(r.save, '20261009').ok && T.giftClaim(r.save, '20261009').index === 1, 'jours manqués : le calendrier attend (pas de remise à zéro)');
  check(!T.giftStatus(r.save, '20260930').available, 'horloge reculée : rien ne se rouvre');
  gs = T.sanitizeGift(null); let day = Date.UTC(2026, 9, 1); const got = [];
  for (let i = 0; i < 15; i++) { const k = new Date(day + i * 864e5).toISOString().slice(0, 10).replace(/-/g, ''); const c = T.giftClaim(gs, k); got.push(c.index); gs = c.save; }
  check(got.join(',') === '0,1,2,3,4,5,6,0,1,2,3,4,5,6,0' && gs.cycles === 2 && gs.total === 15, 'cycle de 7 cadeaux, compteur de cycles');
  check(T.DAILY_GIFTS[6].chest && T.DAILY_GIFTS.every(g => (g.coins || 0) + (g.rosee || 0) + (g.freeze || 0) > 0), 'chaque cadeau donne quelque chose ; le 7e est un coffre');
  check(T.sanitizeGift({ step: 99, lastDay: 'abc', total: -3 }).step === 6 && T.sanitizeGift({ lastDay: 'abc' }).lastDay === '', 'cadeau : données corrompues → valeurs saines');
  // Missions de la semaine.
  const wk = '20260928';
  const ids = T.weeklyMissionsFor(wk, { sentier: true, gardenNext: true });
  check(ids.length === T.WEEKLY_COUNT && new Set(ids).size === ids.length && JSON.stringify(ids) === JSON.stringify(T.weeklyMissionsFor(wk, { sentier: true, gardenNext: true })), '4 missions distinctes, déterministes');
  check(!T.weeklyMissionsFor(wk, {}).some(id => T.weeklyMission(id).needs), 'pas de mission impossible (Sentier fermé, jardin fini)');
  let weekOk = 0;
  for (let i = 0; i < 60; i++) { const k = T.weekKeyFor(new Date(Date.UTC(2026, 0, 5) + i * 7 * 864e5).toISOString().slice(0, 10).replace(/-/g, '')); const m = T.weeklyMissionsFor(k, { sentier: true, gardenNext: true }); if (m.length === 4 && new Set(m).size === 4) weekOk++; }
  check(weekOk === 60, '60 semaines : toujours 4 missions');
  let w = T.sanitizeWeekly(null, wk, { sentier: true, gardenNext: true });
  const forcedIds = ['w_daily5', 'w_stars15', 'w_dew12', 'w_levels8'];
  w = T.sanitizeWeekly({ week: wk, ids: forcedIds, prog: [0, 0, 0, 0], claimed: [false, false, false, false] }, wk, {});
  let a1 = T.weeklyApply(w, { type: 'level_win', newStars: 3 });
  check(a1.w.prog[1] === 3 && a1.w.prog[3] === 1 && a1.w.prog[0] === 0, 'une victoire compte ses étoiles nouvelles et le niveau');
  a1 = T.weeklyApply(a1.w, { type: 'level_win', newStars: 0 });
  check(a1.w.prog[1] === 3 && a1.w.prog[3] === 2, 'aucune étoile nouvelle : pas de progrès « étoiles »');
  let ww = a1.w; for (let i = 0; i < 20; i++) ww = T.weeklyApply(ww, { type: 'dew' }).w;
  check(ww.prog[2] === 12, 'progrès plafonné à l\'objectif');
  check(T.weeklyClaimable(ww).join() === '2' && T.weeklyClaim(ww, 2).ok && !T.weeklyClaim(ww, 0).ok, 'seule une mission finie se récupère');
  ww = T.weeklyClaim(ww, 2).w;
  check(!T.weeklyClaim(ww, 2).ok && !T.weeklyChestReady(ww), 'pas deux fois ; coffre fermé tant que tout n\'est pas récupéré');
  let full = Object.assign({}, ww, { prog: [5, 15, 12, 8] });
  [0, 1, 3].forEach(i => { full = T.weeklyClaim(full, i).w; });
  check(T.weeklyChestReady(full) && !T.weeklyChestReady(Object.assign({}, full, { chest: true })), 'coffre de la semaine prêt quand tout est récupéré');
  check(T.sanitizeWeekly(full, '20261005', {}).week === '20261005' && T.sanitizeWeekly(full, '20261005', {}).prog.every(v => v === 0), 'nouvelle semaine : nouvelles missions');
  check(T.sanitizeWeekly({ week: wk, ids: ['inconnu'], prog: [3] }, wk, {}).ids.every(id => T.weeklyMission(id)), 'missions corrompues → semaine neuve');
  // Saison.
  let ss = T.sanitizeSeason(null, '202610');
  check(ss.season === '202610' && ss.xp === 0 && T.seasonTier(0) === 0, 'saison neuve');
  let add = T.seasonAddXP(ss, T.SEASON_XP_PER_TIER * 3 + 5);
  check(add.tierUp && add.tier === 3 && T.seasonClaimable(add.save).join() === '1,2,3', 'XP → paliers à récupérer');
  let cl = T.seasonClaim(add.save, 2);
  check(cl.ok && cl.reward.rosee === 3 && T.seasonClaimable(cl.save).join() === '1,3' && !T.seasonClaim(cl.save, 2).ok && !T.seasonClaim(cl.save, 4).ok, 'palier récupéré une fois ; jamais un palier non atteint');
  check(T.seasonTier(1e7) === T.SEASON_TIERS && T.seasonReward(T.SEASON_TIERS).final && T.seasonReward(10).freeze === 1, 'dernier palier = grande récompense ; palier 10 = gel');
  let tot = 0; for (let k = 1; k <= T.SEASON_TIERS; k++) { const rw = T.seasonReward(k); tot += (rw.coins || 0); check((rw.coins || 0) + (rw.rosee || 0) + (rw.freeze || 0) > 0, 'palier ' + k + ' utile'); }
  check(tot > 200 && tot < 800, `récompenses en pièces de la saison raisonnables (${tot} 🪙)`);
  const roll = T.seasonRoll(cl.save, '202611');
  check(roll.save.season === '202611' && roll.save.xp === 0 && roll.carried.length === 2, 'nouveau mois : paliers non récupérés rendus (rien ne se perd)');
  const roll2 = T.seasonRoll(T.seasonAddXP(ss, 1e6).save, '202611');
  check(roll2.save.done === 1 && roll2.carried.length === T.SEASON_TIERS, 'saison terminée comptée');
  check(T.seasonRoll(cl.save, '202610').carried.length === 0, 'même mois : rien ne change');
  check(T.seasonDaysLeft('20261001') === 31 && T.seasonDaysLeft('20261031') === 1, 'jours restants dans la saison');
  check(T.sanitizeSeason({ season: 'zz', xp: 'a', claimed: [3, 3, 99, -1] }, '202610').claimed.join() === '3,20', 'saison corrompue → valeurs saines');
  // Marché.
  const cat = [{ cat: 'seed', id: 'a', price: 30 }, { cat: 'seed', id: 'b', price: 40 }, { cat: 'move', id: 'c', price: 25 }, { cat: 'frame', id: 'd', price: 45 }, { cat: 'seed', id: 'z', price: 0 }];
  const off = T.marketDailyOffer('20261001', cat, new Set());
  check(off && off.price < off.base && off.price === Math.round(off.base * 0.7) && off.id !== 'z', 'offre du jour : −30 %, jamais un objet gratuit');
  check(JSON.stringify(off) === JSON.stringify(T.marketDailyOffer('20261001', cat, new Set())), 'offre déterministe (la même pour le jour)');
  let dist = new Set(); for (let i = 1; i <= 28; i++) dist.add(T.marketDailyOffer('202610' + String(i).padStart(2, '0'), cat, new Set()).id);
  check(dist.size >= 3, 'l\'offre change selon les jours');
  check(T.marketDailyOffer('20261001', cat, new Set(['seed:a', 'seed:b', 'move:c', 'frame:d'])) === null, 'tout possédé : pas d\'offre');
  const pack = T.marketWeeklyPack('20260928', cat, new Set());
  check(pack.items.length === 3 && new Set(pack.items.map(i => i.cat)).size === 3 && pack.price === Math.round(pack.base * 0.75), 'lot de la semaine : 3 objets de catégories variées, −25 %');
  check(T.marketWeeklyPack('20260928', cat, new Set(['seed:a', 'seed:b', 'move:c'])) === null, 'moins de 2 objets libres : pas de lot');
  check(T.sanitizeMarket({ dailyBought: 7, seenDay: '20261001' }).dailyBought === '' && T.sanitizeMarket(null).seenDay === '', 'marché : données corrompues → valeurs saines');
  // Collection.
  const ms = T.collectionMilestones(11, [5]);
  check(ms[0].state === 'claimed' && ms[1].state === 'ready' && ms[2].state === 'locked' && T.COLLECTION_MILESTONES.length === 5, 'paliers de collection');
  check(T.sanitizeNav({ seenItems: ['seed:a', 'seed:a', 3], colClaimed: [5, 'x', -2], dewDays: 'y' }).seenItems.length === 1 && T.sanitizeNav({ colClaimed: [5, 'x', -2] }).colClaimed.join() === '5', 'navigation : données saines');
  // Pastilles.
  const b0 = T.navBadgeCounts({});
  check(Object.values(b0).every(v => v === 0), 'rien à signaler : aucune pastille');
  const b1 = T.navBadgeCounts({ giftAvailable: true, dailyOfferNew: true, newItems: 2, collectionReady: 1, dailyTodo: true, dewLeft: 3, restoreReady: true, ritualChestReady: true, weeklyClaimable: 2, weeklyChestReady: true, seasonClaimable: 1, newAchievements: 1 });
  check(b1.market === 2 && b1.cosmetics === 3 && b1.home === 1 && b1.garden === 2 && b1.profile === 5, 'pastilles comptées par page (une action = 1)');
  const b2 = T.navBadgeCounts({ newAchievements: 12, seasonClaimable: 6, dewLeft: 5 });
  // « À demain ! » : seulement après le défi ET le cadeau du jour ; uniquement des faits.
  const tday = '20261002'; // vendredi → demain samedi (Ruines)
  check(T.tomorrowPreview({}, tday, true, 3, 5 * 3600e3) === null, 'demain : rien tant que le cadeau du jour attend');
  check(T.tomorrowPreview({ step: 1, lastDay: tday }, tday, false, 3, 5 * 3600e3) === null, 'demain : rien tant que le défi du jour attend');
  const tp = T.tomorrowPreview({ step: 1, lastDay: tday }, tday, true, 3, 5 * 3600e3 - 1);
  check(tp && tp.hours === 5 && /Cadeau 2\/7 : 3 💧/.test(tp.items[0].text) && /Ruines/.test(tp.items[1].text) && /3 → 4/.test(tp.items[2].text), 'demain : cadeau suivant, défi de demain, série, heures');
  check(T.tomorrowPreview({ step: 0, lastDay: tday }, tday, true, 0, 0).items.length === 2 && T.tomorrowPreview({ step: 0, lastDay: tday }, tday, true, 0, 0).hours === 1, 'demain : sans série, pas de flamme ; au moins 1 h');
  check(T.tomorrowPreview({ step: 1, lastDay: tday }, 'pas-une-date', true, 1, 1) === null, 'demain : date invalide = rien');
  check(b2.profile === 1 && b2.garden === 1, 'pastilles : succès déjà fêtés hors onglet, saison et rosée comptent pour 1 (jamais « 9+ » coincé)');
  check(T.navBadgeCounts({ newItems: 'x', dewLeft: -4 }).cosmetics === 0 && T.navBadgeCounts(null).garden === 0, 'pastilles : entrées corrompues ignorées');
  // Classement personnel du défi.
  const hist = [{ date: '20260925', stars: 3, time: 40 }, { date: '20260926', stars: 2, time: 30 }, { date: '20260927', stars: 3, time: 20 }, { date: '20260928', stars: 3, time: 25 }];
  check(T.dailyPersonalRank(hist, '20260928').rank === 2 && T.dailyPersonalRank(hist, '20260928').of === 4, 'défi : 2e meilleur sur 4 (étoiles puis temps)');
  check(T.dailyPersonalRank(hist.slice(0, 2), '20260926') === null && T.dailyPersonalRank(hist, '20261001') === null, 'pas de classement sans assez d\'historique ni sans résultat');
  console.log('✔ hub : cadeau du jour, missions de la semaine, saison, marché, collection, pastilles, classement personnel');
}

// ---------- BFS INDÉPENDANT (règle 3) ----------
// Réécrit de zéro, sans rien partager avec le Solver du jeu (grilles 2D,
// pas de Map/Set de clés texte, pas de buildPortalMap…), à partir des règles
// écrites : glissement jusqu'à l'obstacle, rochers poussés dans l'ordre du
// sens du coup, ancre = arrêt net, portail = téléportation (sortie occupée →
// arrêt sur le portail), sens unique / portail directionnel = entrée filtrée,
// porte fermée sauf si son interrupteur est occupé AVANT le coup.
function independentMinMoves(L, cap) {
  const N = L.size, idx = (x, y) => y * N + x;
  const wall = new Uint8Array(N * N), anchor = new Uint8Array(N * N);
  (L.walls || []).forEach(w => { wall[idx(w.x, w.y)] = 1; });
  (L.anchors || []).forEach(a => { anchor[idx(a.x, a.y)] = 1; });
  const tele = new Int32Array(N * N).fill(-1), entry = new Array(N * N).fill(null);
  const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  (L.portals || []).forEach(p => { tele[idx(p.ax, p.ay)] = idx(p.bx, p.by); tele[idx(p.bx, p.by)] = idx(p.ax, p.ay);
    if (p.dirA) entry[idx(p.ax, p.ay)] = V[p.dirA]; if (p.dirB) entry[idx(p.bx, p.by)] = V[p.dirB]; });
  (L.oneways || []).forEach(o => { entry[idx(o.x, o.y)] = V[o.dir]; });
  const door = new Int32Array(N * N).fill(-1);
  (L.switches || []).forEach(s => { door[idx(s.doorX, s.doorY)] = idx(s.x, s.y); });
  const goal = idx(L.goal.x, L.goal.y);
  const enc = (seed, rocks) => seed + ':' + rocks.slice().sort((a, b) => a - b).join(',');
  const step = (seed, rocks, dx, dy) => {
    const pieces = [{ s: true, c: seed }].concat(rocks.map(c => ({ s: false, c })));
    const filled = new Uint8Array(N * N); filled.set(wall);
    const onSwitch = new Set(pieces.map(p => p.c));
    const key = p => { const x = p.c % N, y = (p.c / N) | 0; return dx > 0 ? -x : dx < 0 ? x : dy > 0 ? -y : y; };
    const order = pieces.map((p, i) => [key(p), i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(e => pieces[e[1]]);
    let moved = false; const out = [];
    for (const p of order) {
      let x = p.c % N, y = (p.c / N) | 0, hops = 0;
      for (;;) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) break;
        const n = idx(nx, ny);
        if (filled[n]) break;
        if (entry[n] && (entry[n][0] !== dx || entry[n][1] !== dy)) break;
        if (door[n] >= 0 && !onSwitch.has(door[n])) break;
        x = nx; y = ny;
        if (anchor[n]) break;
        if (tele[n] >= 0) {
          if (filled[tele[n]]) break;
          x = tele[n] % N; y = (tele[n] / N) | 0;
          if (anchor[tele[n]]) break;
          if (++hops > 20) break;
        }
      }
      const c = idx(x, y);
      if (c !== p.c) moved = true;
      filled[c] = 1; out.push({ s: p.s, c });
    }
    if (!moved) return null;
    return { seed: out.find(o => o.s).c, rocks: out.filter(o => !o.s).map(o => o.c) };
  };
  const s0 = idx(L.seed.x, L.seed.y), r0 = (L.rocks || []).map(r => idx(r.x, r.y));
  if (s0 === goal) return 0;
  const seen = new Set([enc(s0, r0)]);
  let frontier = [{ seed: s0, rocks: r0 }];
  for (let d = 1; d <= (cap || 40) && frontier.length; d++) {
    const next = [];
    for (const st of frontier) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const r = step(st.seed, st.rocks, dx, dy);
      if (!r) continue;
      if (r.seed === goal) return d;
      const k = enc(r.seed, r.rocks);
      if (!seen.has(k)) { seen.add(k); next.push(r); }
    }
    frontier = next;
  }
  return -1;
}
{
  let bad = T.LEVELS.map((l, i) => [i, independentMinMoves(l)]).filter(([i, m]) => m !== T.LEVELS[i].par);
  check(bad.length === 0, `BFS indépendant : les 60 niveaux faits main ont le par annoncé${bad.length ? ' (écarts : ' + bad.map(b => (b[0] + 1) + '→' + b[1]).join(', ') + ')' : ''}`);
  // ---------- Les Terres sauvages (campagne infinie) ----------
  const NE = 80; const endless = [];
  for (let n = 0; n < NE; n++) endless.push(T.buildEndlessLevel(n));
  bad = endless.filter(l => { const a = T.Solver.analyze(l); return !a.solvable || a.minMoves !== l.par || a.brokenReason; });
  check(bad.length === 0, `Terres sauvages : ${NE} niveaux générés valides pour le solveur interne (par exact)`);
  bad = endless.filter(l => independentMinMoves(l) !== l.par);
  check(bad.length === 0, `Terres sauvages : ${NE} niveaux confirmés par le BFS indépendant${bad.length ? ' (' + bad.map(l => l.name).join(', ') + ')' : ''}`);
  check(endless.every(l => l.par >= 3), 'Terres sauvages : jamais trivial (par ≥ 3)');
  const again = T.buildEndlessLevel(13);
  check(JSON.stringify(again) === JSON.stringify(endless[13]), 'Terres sauvages : même numéro, même plateau (pour tout le monde)');
  check(endless.filter(l => l.featured).every(l => T.mechanicMatters(l, l.featured, l.par)), 'Terres sauvages : la mécanique vedette compte toujours');
  const w = T.endlessWorldOf(0), w2 = T.endlessWorldOf(8 * 8 + 3);
  check(w.world === 9 && w.slot === 0 && endless[0].world === 1 && w2.world === 9 + 8 && / II$/.test(w2.name) && w2.slot === 3, 'Terres sauvages : monde 9, 10… ; après 8 mondes, le tour suivant (« II »)');
  // Dents de scie : le dernier niveau d'un monde est plus long que le premier.
  const saw = [0, 1, 2, 3, 4, 5].every(wi => endless[wi * 8 + 7].par > endless[wi * 8].par);
  check(saw, 'Terres sauvages : dans chaque monde, le niveau « ultime » est plus exigeant que le premier');
  const mechs = new Set(endless.map(l => l.featured).filter(Boolean));
  check(mechs.size === 6, `Terres sauvages : toutes les mécaniques reviennent (${[...mechs].join(', ')})`);
  // Le Sentier et le défi du jour aussi, contre le BFS indépendant.
  const sent = []; for (let s = 1; s <= 30; s++) sent.push(T.buildSentierBoard(T.makeRng(T.hashSeed('ind-' + s)), 1 + (s % 16), { known: T.GEN_MECHANICS.slice(), completedIndices: T.LEVELS.map((_, i) => i), kind: 'chrono' }));
  bad = sent.filter(l => independentMinMoves(l) !== (l.par || T.Solver.analyze(l).minMoves));
  check(bad.length === 0, 'BFS indépendant : 30 plateaux du Sentier confirmés');
  const daily = []; for (let d = 0; d < 21; d++) { const k = '202610' + String(1 + d).padStart(2, '0'); daily.push(T.buildDailyBoard(k, d % 7)); }
  bad = daily.filter(l => l && independentMinMoves(l) !== l.par);
  check(bad.length === 0, 'BFS indépendant : 21 défis du jour confirmés');
  const sc = T.streakCreditDay({ current: 3, best: 5, totalWins: 9, lastSuccessDate: '20261008' }, '20261009');
  check(sc.current === 4 && sc.lastSuccessDate === '20261009' && sc.totalWins === 10 && sc.best === 5, 'série créditée pour un jour précis (lendemain : +1)');
  check(T.streakCreditDay({ current: 3, lastSuccessDate: '20261005' }, '20261009').current === 1 && T.streakCreditDay({ current: 3, lastSuccessDate: '20261009' }, '20261009').current === 3 && T.streakCreditDay({ current: 3, lastSuccessDate: '20261010' }, '20261009').lastSuccessDate === '20261010', 'série créditée : trou = 1, même jour ou passé = inchangée');
  // Bouquets : la rosée sert encore, seulement une fois le jardin fini.
  check(!T.gardenBouquet({ done: T.GARDEN_TOTAL_TASKS - 1, rosee: 99 }).ok, 'bouquet : seulement quand le jardin est entièrement réveillé');
  check(T.gardenBouquet({ done: T.GARDEN_TOTAL_TASKS, rosee: T.BOUQUET.cost - 1 }).reason === 'rosee', 'bouquet : pas assez de rosée');
  const bq = T.gardenBouquet({ done: T.GARDEN_TOTAL_TASKS, rosee: 40, bouquets: 2 });
  check(bq.ok && bq.save.rosee === 40 - T.BOUQUET.cost && bq.save.bouquets === 3 && bq.coins === T.BOUQUET.coins && bq.save.done === T.GARDEN_TOTAL_TASKS, 'bouquet : rosée dépensée, pièces gagnées, compteur');
  check(T.sanitizeGardenSave({ bouquets: 'x' }).bouquets === 0, 'bouquet : compteur corrompu = 0');
  console.log('\n— BFS indépendant et Terres sauvages\n✔ 60 niveaux, 80 niveaux sauvages, 30 plateaux du Sentier, 21 défis : par confirmé par un second solveur écrit de zéro');
}

console.log(`\n${checks} vérifications, ${failures} échec(s).`);
process.exit(failures ? 1 : 0);
