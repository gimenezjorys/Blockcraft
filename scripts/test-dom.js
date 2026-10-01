#!/usr/bin/env node
// Tests du jeu complet dans Node.js + jsdom (sans navigateur), avec de vrais
// KeyboardEvent et PointerEvent. Complète l'E2E Chromium (e2e-*.js) :
//   1. nouveau joueur : Germain, « Passer », niveau 1 au clavier, victoire ;
//   2. glissement au doigt (PointerEvent) sur le plateau ;
//   3. Jardin vivant : 5 tableaux, rosée du matin cueillie, chantier réveillé ;
//   4. ancienne sauvegarde (schéma 1, clé de série « future ») : rien n'est perdu ;
//   5. dates UTC : le jour change à minuit UTC, pas à minuit local ;
//   6. rattrapage de série : rejouer le défi d'hier sauve la série ;
//   7. bon retour après 3 jours, rang du jardinier, aides vues une seule fois ;
//   8. points d'accroche publicitaires (récompensée, interstitiel désactivé) ;
//   9. aucune erreur JavaScript.
// Usage : node scripts/test-dom.js [chemin/vers/index.html]
// jsdom doit être installé (npm i --no-save jsdom) ou visible par NODE_PATH.
'use strict';
const fs = require('fs');
const path = require('path');
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require('jsdom')); }
catch (e) { console.error('✘ jsdom introuvable : npm i --no-save jsdom (ou NODE_PATH vers un dossier qui le contient)'); process.exit(1); }

const htmlPath = process.argv[2] || path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

let failures = 0, checks = 0;
function check(cond, msg) { checks++; if (cond) console.log('✔ ' + msg); else { failures++; console.error('✘ ' + msg); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const utcKey = d => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
const dayOffset = n => { const d = new Date(); return utcKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n))); };
const env = v => JSON.stringify({ schemaVersion: 1, data: v });

// Ouvre le jeu dans un jsdom neuf. storage : clés localStorage à poser AVANT le chargement.
async function openGame(storage, opts) {
  opts = opts || {};
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented/.test(String(e && e.message))) errors.push('jsdom: ' + (e && e.message)); });
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  vc.on('warn', (...a) => errors.push('console.warn: ' + a.join(' ')));
  const dom = new JSDOM(html, {
    url: 'https://seedrift.test/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      Object.entries(storage || {}).forEach(([k, v]) => w.localStorage.setItem(k, v));
      // Ce que jsdom n'implémente pas (mise en page, médias, défilement).
      w.matchMedia = q => ({ matches: !!(opts.reducedMotion && /reduce/.test(q)), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.scrollTo = () => {};
      w.HTMLElement.prototype.scrollIntoView = function () {};
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.navigator.vibrate = () => true;
      w.Element.prototype.scrollTo = function (o) { if (o && typeof o.left === 'number') this.scrollLeft = o.left; };
    }
  });
  const w = dom.window;
  await sleep(opts.wait || 300);
  return { dom, w, d: w.document, errors };
}
const screenOf = d => { const s = d.querySelector('.screen.active'); return s ? s.id : ''; };
const key = (w, k) => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
async function solveCurrent(g) {
  const moves = g.w.BCD_DEV.solutionFromHere();
  for (const m of moves) { key(g.w, m); await sleep(60); }
  await sleep(450); // onWin est différé de 260 ms
  return moves.length;
}

(async () => {
  // ---------- 1. Nouveau joueur ----------
  console.log('\n— Nouveau joueur');
  let g = await openGame({}, { wait: 1800 });
  const coach = g.d.getElementById('coach');
  check(coach && !coach.hidden && /Germain/.test(g.d.querySelector('#coach .coach-text').textContent + g.d.querySelector('#coach .coach-name').textContent), 'Germain accueille le nouveau joueur');
  check(g.d.getElementById('gameTitle').textContent === 'Seedrift', 'nom du jeu affiché sur l\'accueil');
  check(g.d.querySelectorAll('#homeGardenScene .gp-svg').length === 1 && !!g.d.querySelector('#homeGardenScene .gp-sky'), 'fenêtre vivante sur le jardin (ciel + tableau) sur l\'accueil');
  click(g.w, g.d.querySelector('#coach .coach-skip'));
  await sleep(100);
  check(g.w.BCD_DEV.getTutorial().skipped === true, '« Passer » arrête le tutoriel');
  click(g.w, g.d.getElementById('btnContinue'));
  await sleep(200);
  check(screenOf(g.d) === 'screen-game', 'JOUER lance le niveau 1');
  const n1 = await solveCurrent(g);
  check(n1 >= 1 && screenOf(g.d) === 'screen-victory', `niveau 1 résolu au clavier (KeyboardEvent, ${n1} coup)`);
  check(/Parfait|réussi/i.test(g.d.getElementById('victoryTitle').textContent), 'écran de victoire');
  check(g.w.BCD_DEV.getGarden().rosee >= 3, 'la victoire donne de la rosée');
  check(!g.d.getElementById('victoryPlant').hidden && /a grandi/.test(g.d.getElementById('victoryPlant').textContent), 'la plante du monde qui grandit est montrée en victoire');

  // ---------- 2. Glissement au doigt ----------
  console.log('\n— Glissement au doigt (PointerEvent)');
  click(g.w, g.d.getElementById('btnNextLevel'));
  await sleep(250);
  const sol = g.w.BCD_DEV.solutionFromHere();
  const vec = { ArrowRight: [60, 0], ArrowLeft: [-60, 0], ArrowDown: [0, 60], ArrowUp: [0, -60] }[sol[0]];
  const board = g.d.getElementById('board');
  const movesBefore = g.d.getElementById('hudMoves').textContent;
  board.dispatchEvent(new g.w.PointerEvent('pointerdown', { clientX: 150, clientY: 150, pointerId: 7, bubbles: true }));
  board.dispatchEvent(new g.w.PointerEvent('pointerup', { clientX: 150 + vec[0], clientY: 150 + vec[1], pointerId: 7, bubbles: true }));
  await sleep(250);
  check(movesBefore === '0' && g.d.getElementById('hudMoves').textContent === '1', 'un glissement du doigt joue un coup');
  board.dispatchEvent(new g.w.PointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 8, bubbles: true }));
  board.dispatchEvent(new g.w.PointerEvent('pointerup', { clientX: 105, clientY: 103, pointerId: 8, bubbles: true }));
  await sleep(120);
  check(g.d.getElementById('hudMoves').textContent === '1', 'un geste trop court est ignoré');
  key(g.w, 'z'); await sleep(80);
  check(g.d.getElementById('hudMoves').textContent === '0', 'Z annule le coup');
  check(g.errors.length === 0, 'aucune erreur pendant le parcours (' + (g.errors[0] || 'ok') + ')');
  g.w.close();

  // ---------- 3. Jardin vivant ----------
  console.log('\n— Jardin vivant');
  const prog = {}; for (let i = 0; i < 8; i++) prog[i] = 3;
  g = await openGame({
    bcd_progress_v1: env(prog),
    bcd_tutorial_v1: env({ intro: 'done', skipped: true, done: true, tours: {}, attempts: {}, gifts: {} }),
    bcd_garden_v1: env({ rosee: 4, earned: 4, done: 2 })
  }, { wait: 500 });
  click(g.w, g.d.getElementById('homeGarden'));
  await sleep(900);
  check(screenOf(g.d) === 'screen-garden', 'le jardin s\'ouvre');
  check(g.d.querySelectorAll('#gzScene .gp-panel').length === 5 && !!g.d.querySelector('#gzStage .gp-sky'), 'panorama : 5 tableaux et un ciel');
  check(g.d.querySelectorAll('#gzScene .gp-bed').length === 8, '8 plates-bandes (une plante par monde)');
  check(g.d.querySelectorAll('#gpGarland .gp-lantern').length === 7, 'guirlande de 7 lanternes (7 derniers défis)');
  check(['aube', 'jour', 'crepuscule', 'nuit'].includes(g.d.getElementById('gzStage').dataset.phase), 'ciel selon l\'heure (' + g.d.getElementById('gzStage').dataset.phase + ')');
  check(!!g.d.querySelector('#gzScene .gp-germain'), 'Germain vit dans le jardin');
  const tipAfterOpen = g.w.BCD_DEV.getTips().seen.dew === true;
  check(tipAfterOpen, 'aide « rosée du matin » montrée à la première visite');
  const dew0 = g.w.BCD_DEV.getDew();
  const drops = g.d.querySelectorAll('#gzScene .gp-dew');
  check(dew0.total >= 3 && drops.length === dew0.left, `rosée du matin : ${drops.length} gouttes à cueillir`);
  // Accès clavier : on va au coin d'une goutte (flèches), puis Entrée la cueille.
  const ZN = ['Le Portail', 'La Fontaine', 'Le Potager', 'La Serre', 'Le Grand Arbre'];
  const strip = g.d.getElementById('gzScene');
  const target = +drops[drops.length - 1].closest('.gp-panel').dataset.zone;
  for (let i = 0; i < 6 && ZN.indexOf(g.d.getElementById('gzZoneName').textContent) !== target; i++) {
    const cur = ZN.indexOf(g.d.getElementById('gzZoneName').textContent);
    strip.dispatchEvent(new g.w.KeyboardEvent('keydown', { key: cur < target ? 'ArrowRight' : 'ArrowLeft', bubbles: true }));
    await sleep(30);
  }
  const rk0 = g.w.BCD_DEV.getGarden().rosee;
  strip.dispatchEvent(new g.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await sleep(50);
  check(g.w.BCD_DEV.getGarden().rosee === rk0 + 1, 'clavier : flèches jusqu\'au coin, Entrée cueille une goutte');
  const roseeBefore = g.w.BCD_DEV.getGarden().rosee;
  click(g.w, drops[0].querySelector('.gp-dew-bob'));
  await sleep(50);
  check(g.w.BCD_DEV.getGarden().rosee === roseeBefore + 1 && g.w.BCD_DEV.getDew().left === dew0.left - 2, 'toucher une goutte = +1 rosée');
  click(g.w, drops[0]); await sleep(50);
  check(g.w.BCD_DEV.getGarden().rosee === roseeBefore + 1, 'une goutte ne se cueille qu\'une fois');
  for (const dr of Array.from(g.d.querySelectorAll('#gzScene .gp-dew:not(.picked)'))) { click(g.w, dr); await sleep(20); }
  await sleep(900);
  check(g.w.BCD_DEV.getDew().left === 0 && g.w.BCD_DEV.getGarden().rosee === roseeBefore + dew0.left - 1, 'toute la rosée du jour cueillie, pas une de plus');
  check(!g.d.getElementById('btnDewBonus').hidden && /PUB/.test(g.d.getElementById('btnDewBonus').textContent), 'seconde rosée proposée par une pub (marquée PUB), seulement après la cueillette');
  // Navigation au clavier dans le panorama.
  const zone0 = g.d.getElementById('gzZoneName').textContent;
  const arrow = zone0 === 'Le Grand Arbre' ? 'ArrowLeft' : 'ArrowRight';
  g.d.getElementById('gzScene').dispatchEvent(new g.w.KeyboardEvent('keydown', { key: arrow, bubbles: true }));
  await sleep(80);
  check(g.d.getElementById('gzZoneName').textContent !== zone0, `${arrow === 'ArrowRight' ? 'flèche droite' : 'flèche gauche'} : un autre coin du jardin`);
  // Plante touchée : bulle d'information.
  click(g.w, g.d.querySelector('#gzScene .gp-bed[data-plant="1"] rect'));
  await sleep(60);
  check(/Tournesol/.test((g.d.querySelector('#gzStage .gp-tip') || {}).textContent || ''), 'toucher une plante montre son espèce et son prochain objectif');
  // Réveil d'un chantier.
  g.w.BCD_DEV.setRosee(40);
  click(g.w, g.d.getElementById('btnBackHomeGarden')); await sleep(100);
  click(g.w, g.d.getElementById('homeGarden')); await sleep(500);
  const done0 = g.w.BCD_DEV.getGarden().done;
  click(g.w, g.d.getElementById('btnRestore'));
  await sleep(1600);
  check(g.w.BCD_DEV.getGarden().done === done0 + 1, 'Réveiller : un chantier de plus');
  check(g.d.querySelectorAll('#gzScene .gz-after').length >= done0 + 1, 'le tableau montre le chantier réveillé');
  check(g.errors.length === 0, 'aucune erreur dans le jardin (' + (g.errors[0] || 'ok') + ')');
  g.w.close();

  // ---------- 4. Ancienne sauvegarde ----------
  console.log('\n— Ancienne sauvegarde (schéma 1)');
  const future = dayOffset(1);
  g = await openGame({
    bcd_progress_v1: JSON.stringify({ 0: 3, 1: 2, 2: 3 }),               // très ancien format, sans enveloppe
    bcd_garden_v1: env({ rosee: 12, earned: 30, done: 4, sentierDay: '', sentierCount: 0 }),
    bcd_streak_v1: env({ current: 9, best: 11, totalWins: 20, lastSuccessDate: future }),
    bcd_coins_v1: env(77),
    bcd_tutorial_v1: env({ intro: 'done', skipped: false, done: true, tours: {}, attempts: {}, gifts: {} })
  }, { wait: 600 });
  const gs = g.w.BCD_DEV.getGarden();
  check(gs.rosee === 12 && gs.done === 4 && gs.earned === 30, 'jardin conservé (rosée, chantiers)');
  check(gs.dewDay === '' && gs.plantSeen === null && gs.rankSeen >= -1, 'nouveaux champs du jardin initialisés sans fête rétroactive');
  check(/🔥 9/.test(g.d.getElementById('homeStreakPill').textContent), 'série de 9 conservée (clé « future » héritée de l\'heure locale)');
  g.w.BCD_DEV.simulateDailyWin(5, 30, 3);
  const st = JSON.parse(g.w.localStorage.getItem('bcd_streak_v1')).data;
  check(st.current === 9 && st.best === 11, 'un défi gagné ne remet pas la série à 1 après le passage en UTC');
  click(g.w, g.d.getElementById('homeGarden')); await sleep(400);
  const g2 = JSON.parse(g.w.localStorage.getItem('bcd_garden_v1'));
  check(g2.schemaVersion === 2 && g2.data.rosee === 12 && Array.isArray(g2.data.plantSeen), 'jardin migré en schéma 2 sans perte');
  check(Object.keys(g.w.BCD_DEV.getGarden()).length >= 11, 'sauvegarde v2 complète');
  check(g.errors.length === 0, 'aucune erreur avec une vieille sauvegarde (' + (g.errors[0] || 'ok') + ')');
  g.w.close();

  // ---------- 5. Dates UTC ----------
  console.log('\n— Dates en UTC');
  g = await openGame({ bcd_tutorial_v1: env({ intro: 'done', skipped: true, done: true, tours: {}, attempts: {}, gifts: {} }) }, { wait: 400 });
  g.w.BCD_DEV.setSimulatedDate('2026-10-01T23:30:00Z');
  check(g.w.BCD_DEV.todayKey() === '20261001', '23 h 30 UTC : encore le 1er octobre');
  g.w.BCD_DEV.setSimulatedDate('2026-10-02T01:30:00+02:00');
  check(g.w.BCD_DEV.todayKey() === '20261001', '1 h 30 à Paris (été) = 23 h 30 UTC : même jour de jeu');
  g.w.BCD_DEV.setSimulatedDate('2026-10-02T00:05:00Z');
  check(g.w.BCD_DEV.todayKey() === '20261002', 'minuit UTC passé : nouveau jour');
  g.w.BCD_DEV.simulateDailyWin(4, 20, 3);
  check(!!g.w.localStorage.getItem('bcd_daily_20261002'), 'le défi est enregistré sous la clé UTC');
  g.w.BCD_DEV.clearSimulatedDate();
  g.w.close();

  // ---------- 6. Rattrapage de série ----------
  console.log('\n— Rattrapage de série');
  g = await openGame({
    bcd_progress_v1: env({ 0: 3, 1: 3, 2: 3, 3: 3 }),
    bcd_tutorial_v1: env({ intro: 'done', skipped: true, done: true, tours: {}, attempts: {}, gifts: {} }),
    bcd_streak_v1: env({ current: 5, best: 5, totalWins: 5, lastSuccessDate: dayOffset(-2) }),
    bcd_tips_v1: env({ seen: { repair: true, rank: true } })
  }, { wait: 500 });
  check(g.w.BCD_DEV.getStreakRepair().offer && g.w.BCD_DEV.getStreakRepair().free, 'série de 5 interrompue hier : rattrapage gratuit proposé');
  check(/Sauver/.test(g.d.getElementById('homeDailyBadge').textContent), 'l\'accueil le signale sur la carte du défi');
  click(g.w, g.d.getElementById('btnDaily')); await sleep(150);
  check(!!g.d.querySelector('.repair-sheet'), 'la fenêtre « Série en pause » s\'ouvre');
  click(g.w, g.d.getElementById('btnRepairGo')); await sleep(250);
  check(screenOf(g.d) === 'screen-game' && /Rattrapage/.test(g.d.getElementById('gameLevelTitle').textContent), 'le défi d\'hier est lancé');
  await solveCurrent(g);
  const sr = JSON.parse(g.w.localStorage.getItem('bcd_streak_v1')).data;
  check(screenOf(g.d) === 'screen-victory' && g.d.getElementById('victoryTitle').textContent === 'Série sauvée !', 'victoire : « Série sauvée ! »');
  check(sr.current === 6 && sr.lastSuccessDate === dayOffset(-1), 'série : 6 jours, hier compte');
  check(g.w.BCD_DEV.getGarden().repairDay === dayOffset(0) && !g.w.BCD_DEV.getStreakRepair().offer, 'rattrapage noté, plus proposé');
  check(/DÉFI DU JOUR/.test(g.d.getElementById('btnNextLevel').textContent), 'suite logique : le défi du jour');
  check(g.errors.length === 0, 'aucune erreur pendant le rattrapage (' + (g.errors[0] || 'ok') + ')');
  g.w.close();

  // ---------- 7. Bon retour, rang, aides ----------
  console.log('\n— Bon retour, rang du jardinier, aides');
  const days = {}; days[dayOffset(-6)] = { s: 2, l: 3, ao: 0, aa: 0 }; days[dayOffset(-5)] = { s: 1, l: 1, ao: 0, aa: 0 };
  g = await openGame({
    bcd_progress_v1: env({ 0: 3, 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 }),
    bcd_tutorial_v1: env({ intro: 'done', skipped: true, done: true, tours: {}, attempts: {}, gifts: {} }),
    bcd_garden_v1: env({ rosee: 0, earned: 0, done: 0, rankSeen: 0 }),
    bcd_retention_v1: env({ first: dayOffset(-6), days }),
    bcd_analytics_v1: env([{ t: 'first_open', at: Date.now() - 6 * 864e5, p: null }])
  }, { wait: 2600 });
  const gw = g.w.BCD_DEV.getGarden();
  check(gw.rosee >= 6 && gw.welcomeDay === dayOffset(0), 'après 5 jours d\'absence : +6 rosée offerte, une fois');
  const rk = g.w.BCD_DEV.getGardenerRank();
  check(rk.index >= 1 && !!g.d.querySelector('.rank-up'), `nouveau rang célébré (${rk.name})`);
  check(g.d.getElementById('homeRankChip').textContent.includes(rk.name), 'rang affiché sur l\'accueil');
  check(g.errors.length === 0, 'aucune erreur au retour (' + (g.errors[0] || 'ok') + ')');
  g.w.close();
  g = await openGame({
    bcd_progress_v1: env({ 0: 3 }),
    bcd_tutorial_v1: env({ intro: 'done', skipped: true, done: true, tours: {}, attempts: {}, gifts: {} }),
    bcd_garden_v1: env({ rosee: 0, earned: 0, done: 0, welcomeDay: dayOffset(0) }),
    bcd_retention_v1: env({ first: dayOffset(-6), days }),
    bcd_tips_v1: env({ seen: { dew: true } })
  }, { wait: 2600 });
  check(g.w.BCD_DEV.getGarden().rosee === 0, 'le cadeau de retour n\'est jamais donné deux fois le même jour');
  click(g.w, g.d.getElementById('homeGarden')); await sleep(900);
  check(!(g.d.getElementById('coach') && !g.d.getElementById('coach').hidden && /rosée du matin/.test(g.d.getElementById('coach').textContent)), 'une aide déjà vue ne revient pas');
  g.w.close();

  // ---------- 8. Points d'accroche publicitaires ----------
  console.log('\n— Pubs : points d\'accroche');
  g = await openGame({ bcd_tutorial_v1: env({ intro: 'done', skipped: true, done: true, tours: {}, attempts: {}, gifts: {} }) }, { wait: 400 });
  const inter = await g.w.BCD_DEV.adShowInterstitial('level_break');
  check(inter.shown === false && inter.reason === 'disabled', 'interstitiel : désactivé, le jeu continue aussitôt');
  let unavailable = '';
  const ok = await g.w.BCD_DEV.adShowRewarded('emplacement_inconnu', { onUnavailable: r => { unavailable = r; } });
  check(ok === false && unavailable === 'not_available', 'pub récompensée indisponible : repli propre (onUnavailable)');
  g.w.close();

  // ---------- 9. Animations réduites ----------
  console.log('\n— Animations réduites');
  g = await openGame({ bcd_tutorial_v1: env({ intro: 'done', skipped: true, done: true, tours: {}, attempts: {}, gifts: {} }), bcd_garden_v1: env({ rosee: 30, done: 0 }) }, { wait: 400, reducedMotion: true });
  click(g.w, g.d.getElementById('homeGarden')); await sleep(400);
  click(g.w, g.d.getElementById('btnRestore')); await sleep(300);
  check(g.w.BCD_DEV.getGarden().done === 1 && g.errors.length === 0, 'réveil d\'un chantier sans animation, sans erreur');
  g.w.close();

  console.log(`\n${checks} vérifications, ${failures} échec(s).`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('✘ exception : ' + (e && e.stack || e)); process.exit(1); });
