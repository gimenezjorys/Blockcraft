#!/usr/bin/env node
// Tests du jeu complet dans Node.js + jsdom (sans navigateur), avec de vrais
// KeyboardEvent et PointerEvent. Complète l'E2E Chromium (e2e-*.js) :
//   1. nouveau joueur : écran de lancement, Germain, « Passer », niveau 1 au clavier, victoire ;
//   2. glissement au doigt (PointerEvent) sur le plateau ;
//   3. Jardin vivant : 5 tableaux, rosée du matin cueillie, chantier réveillé ;
//   4. ancienne sauvegarde (schéma 1, clé de série « future ») : rien n'est perdu ;
//   5. dates UTC : le jour change à minuit UTC, pas à minuit local ;
//   6. rattrapage de série : rejouer le défi d'hier sauve la série ;
//   7. bon retour après 3 jours, rang du jardinier, aides vues une seule fois ;
//   8. points d'accroche publicitaires (récompensée, interstitiel désactivé) ;
//   9. animations réduites ;
//  10. hub : glissement entre les pages (PointerEvent), barre d'onglets, clavier, retour ;
//  11. aucun glissement de navigation pendant une partie ;
//  12. pastilles qui apparaissent et disparaissent (cadeau, offre, objet, défi, missions, saison) ;
//  13. ancienne sauvegarde sans les clés du hub : rien de perdu, aucune avalanche de pastilles ;
//  et aucune erreur JavaScript.
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
      // Mise en page minimale (projecteur de Germain) : chaque élément a une taille.
      if (opts.layout) w.Element.prototype.getBoundingClientRect = function () { return { left: 20, top: 300, width: 160, height: 48, right: 180, bottom: 348, x: 20, y: 300 }; };
    }
  });
  const w = dom.window;
  await sleep(opts.wait || 300);
  return { dom, w, d: w.document, errors };
}
const screenOf = d => { const s = d.querySelector('.screen.active'); return s ? s.id : ''; };
const key = (w, k) => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
// Écran de lancement → « Jouer » (page JOUER du hub).
async function enter(g, ms) { click(g.w, g.d.getElementById('btnSplashPlay')); await sleep(ms === undefined ? 150 : ms); }
// Glissement horizontal (dx) ou vertical (dy) au doigt, en vrais PointerEvent.
let pid = 100;
// slow : geste lent (≈ 0,2 px/ms), donc jugé sur sa longueur et pas comme une « pichenette ».
async function swipe(g, el, dx, dy, slow) {
  const id = ++pid, x0 = 200, y0 = 300, P = g.w.PointerEvent;
  const o = (x, y) => ({ clientX: x, clientY: y, pointerId: id, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true });
  el.dispatchEvent(new P('pointerdown', o(x0, y0)));
  for (let k = 1; k <= 5; k++) { if (slow) await sleep(40); el.dispatchEvent(new P('pointermove', o(x0 + dx * k / 5, y0 + (dy || 0) * k / 5))); }
  el.dispatchEvent(new P('pointerup', o(x0 + dx, y0 + (dy || 0))));
  if (!slow) await sleep(120);
}
const badge = (d, tab) => { const b = d.querySelector('#' + tab + ' .tab-badge'); return b && !b.hidden ? (b.textContent || '•') : ''; };
const SKIPPED = env({ intro: 'done', skipped: true, done: true, tours: {}, attempts: {}, gifts: {} });
async function solveCurrent(g) {
  const moves = g.w.BCD_DEV.solutionFromHere();
  for (const m of moves) { key(g.w, m); await sleep(60); }
  await sleep(450); // onWin est différé de 260 ms
  return moves.length;
}

(async () => {
  // ---------- 1. Nouveau joueur ----------
  console.log('\n— Nouveau joueur');
  let g = await openGame({}, { wait: 500 });
  check(screenOf(g.d) === 'screen-splash' && !g.d.getElementById('hub').classList.contains('on'), 'écran de lancement d\'abord, barre d\'onglets cachée');
  check(g.d.getElementById('gameTitle').textContent === 'Seedrift', 'nom du jeu sur l\'écran de lancement');
  check(!!g.d.querySelector('#splashScene .gp-sky') && !!g.d.querySelector('#splashScene .gp-svg') && !!g.d.querySelector('#splashGermain svg'), 'lancement : ambiance du jardin (ciel + tableau) et Germain');
  check(g.d.querySelectorAll('#splashChips .sp-chip').length === 1 && !/Cadeau/.test(g.d.getElementById('splashChips').textContent), 'tout premier lancement : rien à lire, juste « Jouer » (pas de promesse de cadeau)');
  check(g.w.BCD_DEV.coachText() === '', 'Germain attend que le joueur touche « Jouer »');
  await enter(g, 1300);
  const coach = g.d.getElementById('coach');
  check(screenOf(g.d) === 'screen-game' && !g.d.getElementById('hub').classList.contains('on') && /Premier souffle/.test(g.d.getElementById('gameLevelTitle').textContent), 'nouveau joueur : « Jouer » lance directement le niveau 1 (aucun écran en plus)');
  check(coach && !coach.hidden && /Germain/.test(g.d.querySelector('#coach .coach-text').textContent) && /droite/.test(g.d.querySelector('#coach .coach-text').textContent), 'Germain se présente et montre le geste, en une seule bulle, sur le plateau');
  click(g.w, g.d.querySelector('#coach .coach-skip'));
  await sleep(100);
  check(g.w.BCD_DEV.getTutorial().skipped === true && screenOf(g.d) === 'screen-game', '« Passer » arrête le tutoriel, la partie continue');
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
  await enter(g);
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
  click(g.w, g.d.getElementById('tabPlay')); await sleep(100);
  click(g.w, g.d.getElementById('tabGarden')); await sleep(500);
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
  await enter(g);
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
  g = await openGame({ bcd_tutorial_v1: SKIPPED }, { wait: 400 });
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
  await enter(g);
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
  }, { wait: 400 });
  check(g.w.BCD_DEV.getGarden().rosee === 0 && !g.d.querySelector('.rank-up'), 'lancement : cadeau de retour et fête du rang attendent la page JOUER');
  await enter(g, 2400);
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
  }, { wait: 400 });
  await enter(g, 2400);
  check(g.w.BCD_DEV.getGarden().rosee === 0, 'le cadeau de retour n\'est jamais donné deux fois le même jour');
  click(g.w, g.d.getElementById('homeGarden')); await sleep(900);
  check(!(g.d.getElementById('coach') && !g.d.getElementById('coach').hidden && /rosée du matin/.test(g.d.getElementById('coach').textContent)), 'une aide déjà vue ne revient pas');
  g.w.close();

  // ---------- 8. Points d'accroche publicitaires ----------
  console.log('\n— Pubs : points d\'accroche');
  g = await openGame({ bcd_tutorial_v1: SKIPPED }, { wait: 400 });
  const inter = await g.w.BCD_DEV.adShowInterstitial('level_break');
  check(inter.shown === false && inter.reason === 'disabled', 'interstitiel : désactivé, le jeu continue aussitôt');
  let unavailable = '';
  const ok = await g.w.BCD_DEV.adShowRewarded('emplacement_inconnu', { onUnavailable: r => { unavailable = r; } });
  check(ok === false && unavailable === 'not_available', 'pub récompensée indisponible : repli propre (onUnavailable)');
  g.w.close();

  // ---------- 9. Animations réduites ----------
  console.log('\n— Animations réduites');
  g = await openGame({ bcd_tutorial_v1: SKIPPED, bcd_garden_v1: env({ rosee: 30, done: 0 }) }, { wait: 400, reducedMotion: true });
  await enter(g);
  click(g.w, g.d.getElementById('tabGarden')); await sleep(400);
  click(g.w, g.d.getElementById('btnRestore')); await sleep(300);
  check(g.w.BCD_DEV.getGarden().done === 1 && g.errors.length === 0, 'réveil d\'un chantier sans animation, sans erreur');
  g.w.close();

  // ---------- 10. Hub : pages glissantes, onglets, clavier, retour ----------
  console.log('\n— Hub : glissement, onglets, retour');
  g = await openGame({
    bcd_progress_v1: env({ 0: 3, 1: 3, 2: 3, 3: 3 }),
    bcd_tutorial_v1: SKIPPED,
    bcd_tips_v1: env({ seen: { nav: true, page_market: true, page_collection: true, page_garden: true, page_profile: true, dew: true } })
  }, { wait: 400 });
  const hubOn = () => g.d.getElementById('hub').classList.contains('on');
  const page = () => g.w.BCD_DEV.hubPage();
  const selected = () => Array.from(g.d.querySelectorAll('#tabbar .tab')).filter(t => t.getAttribute('aria-selected') === 'true').map(t => t.dataset.page).join(',');
  await enter(g);
  check(g.d.querySelectorAll('#homeGardenScene .gp-svg').length === 1, 'fenêtre vivante sur le jardin (vignette) sur la page JOUER');
  // Bug corrigé : un scrollIntoView()/focus() sur une page voisine faisait défiler
  // la piste (projecteur de Germain hors champ, joueur bloqué sous l'écran assombri).
  const vpx = g.d.getElementById('hubViewport');
  vpx.scrollLeft = 287; vpx.dispatchEvent(new g.w.Event('scroll'));
  check(vpx.scrollLeft === 0, 'la piste des pages ne défile jamais toute seule (scrollLeft remis à 0)');
  const order = Array.from(g.d.querySelectorAll('#tabbar .tab')).map(t => t.dataset.page).join(',');
  check(order === 'market,cosmetics,home,garden,profile', `5 onglets en bas, JOUER au centre (${order})`);
  check(page() === 'home' && selected() === 'home' && g.d.getElementById('tabPlay').tabIndex === 0, 'onglet actif marqué (aria-selected, seul dans l\'ordre de tabulation)');
  const vp = g.d.getElementById('hubViewport');
  await swipe(g, g.d.getElementById('screen-home'), -220);
  check(page() === 'garden' && screenOf(g.d) === 'screen-garden' && selected() === 'garden', 'glisser vers la gauche : page suivante (Jardin)');
  check(/-300%/.test(g.d.getElementById('hubTrack').style.transform), 'la piste suit la page (translate3d)');
  await swipe(g, g.d.getElementById('screen-garden'), 220);
  check(page() === 'home', 'glisser vers la droite : page précédente (JOUER)');
  await swipe(g, g.d.getElementById('screen-home'), 220);
  check(page() === 'cosmetics', 'encore à droite : Collection');
  await swipe(g, g.d.getElementById('screen-cosmetics'), 220);
  await swipe(g, g.d.getElementById('screen-market'), 220);
  check(page() === 'market', 'au bout (Marché) : le geste revient en place, sans sortir du hub');
  await swipe(g, g.d.getElementById('screen-market'), -40, 0, true);
  await sleep(120);
  check(page() === 'market', 'geste lent et court : la page revient en place');
  await swipe(g, g.d.getElementById('screen-market'), -40, 0);
  check(page() === 'cosmetics', 'pichenette rapide : page suivante, même sur une courte distance');
  click(g.w, g.d.getElementById('tabMarket')); await sleep(120);
  await swipe(g, g.d.getElementById('screen-market'), -60, -260);
  check(page() === 'market', 'geste vertical (défilement) : jamais de changement de page');
  click(g.w, g.d.getElementById('tabProfile')); await sleep(120);
  check(page() === 'profile' && screenOf(g.d) === 'screen-profile' && selected() === 'profile', 'toucher l\'onglet Profil ouvre la page Profil');
  click(g.w, g.d.getElementById('tabMarket')); await sleep(120);
  check(page() === 'market' && /translate3d\(calc\(0%/.test(g.d.getElementById('hubTrack').style.transform), 'toucher l\'onglet Marché : la piste va tout à gauche');
  click(g.w, g.d.getElementById('tabPlay')); await sleep(120);
  check(page() === 'home', 'onglet JOUER : retour au centre');
  // Une zone qui défile elle-même (panorama du jardin) ne fait pas changer de page.
  click(g.w, g.d.getElementById('tabGarden')); await sleep(200);
  await swipe(g, g.d.getElementById('gzScene'), -220);
  check(page() === 'garden', 'glisser dans le panorama du jardin : on reste au Jardin');
  // Un glissement ne se transforme pas en toucher sur un bouton.
  click(g.w, g.d.getElementById('tabPlay')); await sleep(120);
  await swipe(g, g.d.getElementById('btnDaily'), 40, 0, true);
  click(g.w, g.d.getElementById('btnDaily')); await sleep(150);
  check(screenOf(g.d) === 'screen-home', 'un glissement qui finit sur « Défi du jour » ne le lance pas');
  // Clavier : flèches sur la barre d'onglets.
  g.d.getElementById('tabPlay').dispatchEvent(new g.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  await sleep(120);
  check(page() === 'garden' && g.d.activeElement === g.d.getElementById('tabGarden'), 'clavier : flèche droite sur la barre → onglet suivant (focus suivi)');
  g.d.getElementById('tabGarden').dispatchEvent(new g.w.KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
  await sleep(120);
  check(page() === 'market', 'clavier : Début → premier onglet');
  // Bouton retour du téléphone / navigateur.
  const back = async () => { g.w.dispatchEvent(new g.w.PopStateEvent('popstate', { state: null })); await sleep(150); };
  await back();
  check(page() === 'home', 'retour depuis une page du hub : page JOUER');
  await back();
  check(screenOf(g.d) === 'screen-splash' && !hubOn(), 'retour depuis JOUER : écran de lancement');
  await back();
  check(screenOf(g.d) === 'screen-splash', 'retour depuis le lancement : le jeu laisse le navigateur sortir');
  await enter(g);
  click(g.w, g.d.getElementById('btnSettings')); await sleep(120);
  check(screenOf(g.d) === 'screen-settings' && !hubOn(), 'Paramètres (roue dentée) : écran par-dessus, sans barre d\'onglets');
  await back();
  check(page() === 'home', 'retour depuis les Paramètres : page JOUER');
  check(g.errors.length === 0, 'aucune erreur de navigation (' + (g.errors[0] || 'ok') + ')');

  // ---------- 11. Aucun glissement de navigation pendant une partie ----------
  console.log('\n— Pas de navigation pendant une partie');
  click(g.w, g.d.getElementById('btnContinue')); await sleep(250);
  check(screenOf(g.d) === 'screen-game' && !hubOn() && page() === null, 'en partie : le hub est masqué');
  await swipe(g, vp, -260);
  await swipe(g, g.d.getElementById('screen-game'), -260);
  check(screenOf(g.d) === 'screen-game', 'glissement hors du plateau : la partie reste à l\'écran');
  const mv0 = g.d.getElementById('hudMoves').textContent;
  const sol2 = g.w.BCD_DEV.solutionFromHere();
  const v2 = { ArrowRight: [220, 0], ArrowLeft: [-220, 0], ArrowDown: [0, 220], ArrowUp: [0, -220] }[sol2[0]];
  await swipe(g, g.d.getElementById('board'), v2[0], v2[1]);
  await sleep(200);
  check(screenOf(g.d) === 'screen-game' && g.d.getElementById('hudMoves').textContent === String(+mv0 + 1), 'glissement sur le plateau : un coup joué, jamais un changement de page');
  key(g.w, 'ArrowLeft'); key(g.w, 'ArrowRight'); await sleep(250);
  check(screenOf(g.d) === 'screen-game', 'flèches du clavier en partie : on joue, on ne change pas de page');
  click(g.w, g.d.getElementById('btnExitGame')); await sleep(150);
  click(g.w, g.d.getElementById('btnBackHome')); await sleep(150);
  check(page() === 'home', 'sortie de partie : retour dans le hub');
  check(g.errors.length === 0, 'aucune erreur (' + (g.errors[0] || 'ok') + ')');
  g.w.close();

  // ---------- 12. Pastilles de notification ----------
  console.log('\n— Pastilles');
  g = await openGame({
    bcd_progress_v1: env({ 0: 3, 1: 3, 2: 3, 3: 3 }),
    bcd_tutorial_v1: SKIPPED,
    bcd_coins_v1: env(500),
    // Succès déjà mérités par cette progression : sinon le rattrapage du démarrage
    // (1,2 s) ajouterait ses coins au milieu des vérifications.
    bcd_achievements_v1: env({ first_step: Date.now() - 864e5, three_stars: Date.now() - 864e5 }),
    bcd_tips_v1: env({ seen: { nav: true, page_market: true, page_collection: true, page_garden: true, page_profile: true, dew: true } })
  }, { wait: 400 });
  await enter(g);
  check(badge(g.d, 'tabMarket') === '2', 'Marché : 2 (cadeau du jour + offre du jour pas encore vue)');
  check(badge(g.d, 'tabPlay') === '•', 'JOUER : point rouge tant que le défi du jour est à faire');
  check(badge(g.d, 'tabCollection') === '' && badge(g.d, 'tabProfile') === '', 'Collection et Profil : rien de neuf, pas de pastille');
  click(g.w, g.d.getElementById('tabMarket')); await sleep(150);
  check(badge(g.d, 'tabMarket') === '1', 'offre vue en ouvrant le Marché : il reste le cadeau');
  const coinsG = g.w.BCD_DEV.getCoins();
  click(g.w, g.d.getElementById('btnGiftClaim')); await sleep(150);
  check(badge(g.d, 'tabMarket') === '' && g.w.BCD_DEV.getCoins() === coinsG + 15 && g.w.BCD_DEV.getGift().step === 1, 'cadeau récupéré (+15 coins) : la pastille du Marché disparaît');
  check(!g.d.getElementById('btnGiftClaim'), 'cadeau : un seul par jour');
  g.w.BCD_DEV.simulateDailyWin(5, 30, 3); g.w.BCD_DEV.navBadges();
  check(badge(g.d, 'tabPlay') === '', 'défi du jour réussi : le point de JOUER disparaît');
  g.w.BCD_DEV.grantCosmetic('seed', 'jade');
  check(badge(g.d, 'tabCollection') === '2', 'objet obtenu : pastille « 2 » sur Collection (objet neuf + palier de 5 objets)');
  click(g.w, g.d.getElementById('tabCollection')); await sleep(150);
  check(badge(g.d, 'tabCollection') === '1' && !!g.d.querySelector('#screen-cosmetics .ms-claim'), 'Collection ouverte : objet vu ; reste le palier à récupérer');
  const coinsC = g.w.BCD_DEV.getCoins(); const achC = Object.keys(g.w.BCD_DEV.getAchievements());
  click(g.w, g.d.querySelector('#screen-cosmetics .ms-claim')); await sleep(150);
  check(badge(g.d, 'tabCollection') === '' && g.w.BCD_DEV.getCoins() === coinsC + 20, `palier récupéré (+20 coins) : pastille retirée (pastille « ${badge(g.d, 'tabCollection')} », coins ${coinsC} → ${g.w.BCD_DEV.getCoins()}, succès ${Object.keys(g.w.BCD_DEV.getAchievements()).filter(k => !achC.includes(k))})`);
  const wk = g.w.BCD_DEV.getWeekly();
  wk.prog[0] = 999;
  g.w.localStorage.setItem('bcd_weekly_v1', env(wk));
  g.w.BCD_DEV.navBadges();
  check(+badge(g.d, 'tabProfile') >= 1 && !g.d.querySelector('#segMissions .seg-badge').hidden, 'mission de la semaine terminée : pastille sur Profil et sur « Missions »');
  const prof0 = +badge(g.d, 'tabProfile');
  click(g.w, g.d.getElementById('tabProfile')); await sleep(150);
  click(g.w, g.d.getElementById('segMissions')); await sleep(80);
  const coinsW = g.w.BCD_DEV.getCoins();
  click(g.w, g.d.querySelector('#weeklyCard .wm-claim')); await sleep(150);
  check(g.w.BCD_DEV.getCoins() === coinsW + 20 && g.w.BCD_DEV.getWeekly().claimed[0] === true, 'mission récupérée : +20 coins');
  check((+badge(g.d, 'tabProfile') || 0) === prof0 - 1, 'la pastille du Profil diminue d\'autant');
  g.w.BCD_DEV.addSeasonXP(60);
  check(+badge(g.d, 'tabProfile') >= 1, 'palier de saison atteint : pastille sur Profil');
  click(g.w, g.d.getElementById('tabPlay')); await sleep(100);
  click(g.w, g.d.getElementById('tabProfile')); await sleep(150);
  check(!!g.d.getElementById('btnSeasonClaim'), 'page Profil : bouton « Récupérer » de la saison');
  const coinsS = g.w.BCD_DEV.getCoins();
  click(g.w, g.d.getElementById('btnSeasonClaim')); await sleep(150);
  check(g.w.BCD_DEV.getCoins() === coinsS + 12 && g.w.BCD_DEV.getSeason().claimed.includes(1), 'palier 1 récupéré : +12 coins');
  click(g.w, g.d.getElementById('segSucces')); await sleep(100);
  check(badge(g.d, 'tabProfile') === '' && g.d.querySelector('#segSucces .seg-badge').hidden, 'tout est récupéré et les nouveaux succès vus : plus de pastille sur Profil');
  check(g.errors.length === 0, 'aucune erreur avec les pastilles (' + (g.errors[0] || 'ok') + ')');
  g.w.close();

  // ---------- 13. Ancienne sauvegarde sans les clés du hub ----------
  console.log('\n— Mise à jour : sauvegarde d\'avant le hub');
  const prog13 = {}; for (let i = 0; i < 12; i++) prog13[i] = 3;
  g = await openGame({
    bcd_progress_v1: env(prog13),
    bcd_coins_v1: env(240),
    bcd_cosmetics_owned_v1: env(['classic', 'jade', 'saphir']),
    bcd_achievements_v1: env({ first_step: Date.now() - 864e5, three_stars: Date.now() - 864e5 }),
    bcd_streak_v1: env({ current: 4, best: 6, totalWins: 9, lastSuccessDate: dayOffset(-1) }),
    bcd_tutorial_v1: SKIPPED
  }, { wait: 400 });
  check(g.w.BCD_DEV.getCoins() === 240 && Object.keys(JSON.parse(g.w.localStorage.getItem('bcd_progress_v1')).data).length === 12, 'progression et coins conservés');
  check(/Série : 4 jours/.test(g.d.getElementById('splashChips').textContent), 'lancement : la série de 4 jours est rappelée');
  await enter(g, 1300); // les succès mérités avant la mise à jour sont rattrapés au démarrage (1,2 s)
  const nav13 = g.w.BCD_DEV.getNav(), pre13 = ['first_step', 'three_stars'];
  const caught = Object.keys(g.w.BCD_DEV.getAchievements()).filter(k => !pre13.includes(k)).length;
  check(['jade', 'saphir'].every(id => nav13.seenItems.includes('seed:' + id)) && badge(g.d, 'tabCollection') === '1', 'aucune avalanche : objets déjà possédés « vus » ; seul le palier de 5 objets (vrai cadeau) est signalé');
  const segS = g.d.querySelector('#segSucces .seg-badge');
  check(pre13.every(k => nav13.seenAch.includes(k)) && caught > 0 && segS && !segS.hidden && +segS.textContent === caught && badge(g.d, 'tabProfile') === '', `succès déjà là : vus ; les ${caught} rattrapés sont signalés sur « Succès », sans gonfler l'onglet Profil`);
  check(g.w.BCD_DEV.getNav().init === true && g.w.BCD_DEV.getWeekly().ids.length === 4 && g.w.BCD_DEV.getSeason().xp === 0, 'nouvelles clés créées proprement (missions de la semaine, saison)');
  for (const k of ['bcd_nav_v1', 'bcd_weekly_v1', 'bcd_season_v1']) {
    const raw = JSON.parse(g.w.localStorage.getItem(k) || 'null');
    check(raw && raw.schemaVersion === 1, `${k} : enveloppe versionnée (SCHEMA_MIGRATIONS)`);
  }
  check(g.errors.length === 0, 'aucune erreur à la mise à jour (' + (g.errors[0] || 'ok') + ')');
  g.w.close();

  // ---------- 14. Le chemin parfait (audit §7) ----------
  console.log('\n— Le chemin parfait');
  const prog14 = {}; for (let i = 0; i < 12; i++) prog14[i] = 3;
  g = await openGame({ bcd_progress_v1: env(prog14), bcd_tutorial_v1: SKIPPED, bcd_tips_v1: env({ seen: { nav: true, perfect_path: true } }) }, { wait: 400 });
  await enter(g);
  // Étoiles méritées, lues sur l'écran de victoire (coups et par), sans attendre leur animation.
  const starsOn = () => { const m = +g.d.getElementById('vMoves').textContent, p = +g.d.getElementById('vPar').textContent; return m <= p ? 3 : m === p + 1 ? 2 : 1; };
  // Un détour volontaire, puis la solution : on gagne au-dessus du par.
  let found = -1, firstMove = '';
  for (const lv of [4, 5, 6, 7, 8, 9, 10, 11]) {
    for (const m of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      g.w.BCD_DEV.playLevel(lv); await sleep(150);
      key(g.w, m); await sleep(260);
      if (g.d.getElementById('hudMoves').textContent !== '1' || screenOf(g.d) !== 'screen-game') continue;
      await solveCurrent(g);
      if (screenOf(g.d) === 'screen-victory' && starsOn() < 3) { found = lv; firstMove = m; break; }
    }
    if (found >= 0) break;
  }
  check(found >= 0, `victoire imparfaite obtenue (niveau ${found + 1}, détour ${firstMove})`);
  const pp = g.d.getElementById('btnPerfectPath');
  check(pp && !pp.hidden, 'victoire imparfaite : « Voir le chemin parfait » proposé');
  const par = +g.d.getElementById('vPar').textContent;
  click(g.w, pp); await sleep(300);
  check(screenOf(g.d) === 'screen-game' && g.d.getElementById('hudMoves').textContent === '0' && /chemin parfait/.test(g.d.getElementById('gameTip').textContent), 'le plateau repart à zéro, la démonstration commence');
  key(g.w, 'ArrowRight'); key(g.w, 'ArrowDown'); await sleep(200);
  check(g.d.getElementById('hudMoves').textContent === '0', 'pendant la démonstration, les touches du joueur ne comptent pas');
  await sleep(500 + (par - 1) * 620 + 350);
  check(g.d.querySelectorAll('#overlay .hint-tier4-badge').length === par, `les ${par} coups parfaits sont numérotés sur le plateau`);
  await sleep(1300);
  check(/À toi/.test(g.d.getElementById('gameTip').textContent) && g.d.querySelectorAll('#overlay .hint-tier4-badge').length === 0, '« À toi » : la main revient au joueur, plateau propre');
  const n14 = await solveCurrent(g);
  check(screenOf(g.d) === 'screen-victory' && starsOn() === 3 && g.d.getElementById('btnPerfectPath').hidden, `rejoué au par : ★★★, et plus de chemin à montrer (${n14} coups)`);
  await sleep(1500);
  check(g.d.querySelectorAll('#victoryStars .star.on').length === 3, 'les trois étoiles s\'allument');
  check(g.errors.length === 0, 'aucune erreur (' + (g.errors[0] || 'ok') + ')');
  g.w.close();

  // ---------- 15. Ancienne sauvegarde : cosmétiques et nouveau look ----------
  console.log('\n— Ancienne sauvegarde : cosmétiques conservés, nouveau look annoncé une fois');
  const prog15 = {}; for (let i = 0; i < 10; i++) prog15[i] = 3;
  const old15 = {
    bcd_progress_v1: env(prog15), bcd_coins_v1: env(90),
    bcd_cosmetics_owned_v1: env(['default', 'jade', 'argent', 'nuit']), bcd_cosmetic_equipped_v1: env('argent'),
    bcd_move_fx_owned_v1: env(['default', 'comete']), bcd_move_fx_equipped_v1: env('comete'),
    bcd_frames_owned_v1: env(['default', 'or']), bcd_frame_equipped_v1: env('or'),
    bcd_tutorial_v1: env({ intro: 'done', skipped: false, done: true, tours: {}, attempts: {}, gifts: {}, news: 'done' }),
    bcd_tips_v1: env({ seen: { nav: true } })
  };
  g = await openGame(old15, { wait: 400 });
  check(g.w.BCD_DEV.getEquippedCosmetic() === 'argent' && g.d.documentElement.dataset.seedFx === 'argent', 'graine équipée conservée, avec sa nouvelle matière (chrome)');
  check(['jade', 'argent', 'nuit'].every(id => g.w.BCD_DEV.getOwnedCosmetics().includes(id)) && g.w.BCD_DEV.getEquippedMoveEffect() === 'comete' && g.w.BCD_DEV.getEquippedFrame() === 'or', 'graines, traînée et cadre déjà achetés : tous conservés');
  check(g.w.BCD_DEV.getCoins() === 90, 'pièces conservées');
  await enter(g, 1300);
  check(/peau neuve/.test(g.w.BCD_DEV.coachText()), 'à l\'ouverture : Germain annonce le nouveau look');
  check(g.w.BCD_DEV.getTutorial().look2 === true, 'annonce notée (une seule fois)');
  click(g.w, g.d.querySelector('#coach .c-primary')); await sleep(400);
  check(screenOf(g.d) === 'screen-cosmetics', '« Voir » ouvre la Collection');
  const names = Array.from(g.d.querySelectorAll('#atelierGrid .item-name')).map(e => e.textContent);
  check(['Petit soleil', 'Coccinelle', 'Bulle de savon', 'Rayon de miel', 'Petite pastèque'].every(n => names.includes(n)), 'les nouvelles graines sont dans la Collection');
  check(g.errors.length === 0, 'aucune erreur (' + (g.errors[0] || 'ok') + ')');
  g.w.close();
  g = await openGame(Object.assign({}, old15, { bcd_tutorial_v1: env({ intro: 'done', done: true, tours: {}, attempts: {}, gifts: {}, news: 'done', look2: true }) }), { wait: 400 });
  await enter(g, 1300);
  check(!/peau neuve/.test(g.w.BCD_DEV.coachText()), 'annonce déjà vue : elle ne revient pas');
  g.w.close();
  g = await openGame({}, { wait: 400 });
  check(g.w.BCD_DEV.getTutorial().look2 === true, 'nouveau joueur : aucune annonce de « nouveau look » (il n\'a jamais connu l\'ancien)');
  g.w.close();

  // ---------- 16. Les 5 premières minutes (J1) ----------
  console.log('\n— Les 5 premières minutes');
  g = await openGame({}, { wait: 400, layout: true });
  await enter(g, 500);
  check(screenOf(g.d) === 'screen-game' && /Germain/.test(g.w.BCD_DEV.coachText()), 'premier « Jouer » : niveau 1 tout de suite, Germain sur le plateau');
  await solveCurrent(g);
  await sleep(300);
  check(screenOf(g.d) === 'screen-victory' && /Trois étoiles/.test(g.w.BCD_DEV.coachText()), 'victoire du niveau 1 : une seule bulle (bravo + sens des étoiles)');
  check(g.d.getElementById('btnVictoryGarden').hidden, 'niveau 1 : on continue de jouer (pas encore le jardin)');
  click(g.w, g.d.getElementById('btnNextLevel')); await sleep(250);
  await solveCurrent(g); await sleep(300);
  const vg = g.d.getElementById('btnVictoryGarden'), nx = g.d.getElementById('btnNextLevel');
  check(!vg.hidden && nx.classList.contains('btn-secondary') && !nx.classList.contains('btn-primary'), 'niveau 2 : « Réveiller le jardin » en premier, « Niveau suivant » en second');
  check(!/Prêt à réveiller/.test(g.d.getElementById('victoryRewards').textContent), 'pas de puce en double avec le bouton du jardin');
  const ros0 = g.w.BCD_DEV.getGarden().rosee;
  click(g.w, vg); await sleep(500);
  check(screenOf(g.d) === 'screen-garden' && /Cadeau/.test(g.w.BCD_DEV.coachText()) && g.w.BCD_DEV.getGarden().rosee === ros0 + 3, 'le jardin s\'ouvre : +3 rosée offerte, Germain montre « Réveiller »');
  check(!!g.d.querySelector('.coach-ring') && g.d.querySelectorAll('.coach-blocker').length === 4, 'projecteur sur le bouton à toucher');
  click(g.w, g.d.getElementById('btnRestore')); await sleep(300);
  check(g.w.BCD_DEV.getGarden().done === 1 && g.w.BCD_DEV.getTutorial().tours.garden === 'done' && !g.d.querySelector('.coach-ring'), 'premier coin du jardin réveillé : visite acquise, projecteur retiré');
  await sleep(4400);
  check(/continue/.test(g.w.BCD_DEV.coachText()) && !!g.d.querySelector('#coach .c-primary'), 'Germain propose de reprendre la partie');
  click(g.w, g.d.querySelector('#coach .c-primary')); await sleep(300);
  check(screenOf(g.d) === 'screen-game' && /Le détour/.test(g.d.getElementById('gameLevelTitle').textContent), '« Jouer ▶ » relance le niveau suivant (3)');
  await solveCurrent(g); await sleep(300);
  click(g.w, g.d.getElementById('btnVictoryHome')); await sleep(300);
  check(screenOf(g.d) === 'screen-home' && g.d.getElementById('hub').classList.contains('on'), 'victoire : le bouton ⌂ ramène à l\'accueil (sans bouton retour du téléphone)');
  check(g.errors.length === 0, 'aucune erreur (' + (g.errors[0] || 'ok') + ')');
  g.w.close();
  // « À demain ! » : seulement quand le défi et le cadeau du jour sont faits.
  const today16 = dayOffset(0);
  const st16 = { bcd_progress_v1: env({ 0: 3, 1: 3, 2: 3, 3: 3 }), bcd_tutorial_v1: SKIPPED, bcd_tips_v1: env({ seen: { nav: true } }),
    bcd_streak_v1: env({ current: 2, best: 2, totalWins: 2, lastSuccessDate: today16 }) };
  g = await openGame(st16, { wait: 400 });
  await enter(g);
  check(g.d.getElementById('homeTomorrow').hidden, 'avant le défi et le cadeau : pas de « À demain »');
  g.w.close();
  g = await openGame(Object.assign({}, st16, { bcd_gift_v1: env({ step: 2, lastDay: today16, total: 2 }),
    ['bcd_daily_' + today16]: env({ moves: 5, time: 30, stars: 3, isRecord: true, generated: true, par: 5, levelIndex: null }) }), { wait: 400 });
  await enter(g);
  const tm = g.d.getElementById('homeTomorrow');
  check(!tm.hidden && /Cadeau 3\/7/.test(tm.textContent) && /Défi/.test(tm.textContent) && /2 → 3/.test(tm.textContent) && /dans \d+ h/.test(tm.textContent), 'journée faite : « À demain ! » (cadeau suivant, défi de demain, série, heure du nouveau jour)');
  g.w.close();

  console.log(`\n${checks} vérifications, ${failures} échec(s).`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('✘ exception : ' + (e && e.stack || e)); process.exit(1); });
