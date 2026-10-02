#!/usr/bin/env node
// Tests du tutoriel de Germain dans Chromium (Playwright), avec de vrais
// clics, toucher clavier et retour arrière. Échoue sur toute erreur ou
// avertissement console, et sur tout « undefined » / « NaN » visible.
//   NODE_PATH=$(npm root -g) node scripts/e2e-tutorial.js [dossier-captures]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

// Servi en http (comme GitHub Pages) : en file://, Chromium perd parfois tout
// le localStorage d'un onglet au rechargement (1 fois sur 10 environ), ce qui
// faussait les tests de reprise. Le jeu n'y est pour rien.
let FILE = '';
function startStaticServer(root) {
  const http = require('http');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(root, path.normalize(p));
      if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ port: srv.address().port, close: () => srv.close() }));
  });
}
const OUT = process.argv[2] || null;
let failures = 0, checks = 0;
function check(cond, msg) { checks++; if (cond) console.log('✔ ' + msg); else { failures++; console.error('✘ ' + msg); } }

(async () => {
  const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
  const browser = await chromium.launch(launchOpts);
  const server = await startStaticServer(path.resolve(__dirname, '..'));
  FILE = `http://127.0.0.1:${server.port}/index.html`;
  const problems = [];
  async function newPage(opts) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 }, opts || {}));
    const page = await ctx.newPage();
    page.on('pageerror', e => problems.push('pageerror: ' + e.message));
    page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource/.test(m.text())) problems.push(m.type() + ': ' + m.text()); });
    page.on('dialog', d => d.accept());
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    return page;
  }
  const wait = (page, ms) => page.waitForTimeout(ms);
  const coach = page => page.evaluate(() => BCD_DEV.coachText());
  const screen = page => page.evaluate(() => document.querySelector('.screen.active').id);
  const tuto = page => page.evaluate(() => BCD_DEV.getTutorial());
  const noJunk = async (page, where) => {
    const txt = await page.evaluate(() => document.body.innerText);
    check(!/\bundefined\b|\bNaN\b/.test(txt), `aucun « undefined » ni « NaN » visible (${where})`);
  };
  const shot = async (page, name) => { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, name + '.png') }); } };
  const solve = async (page, after = 1900) => {
    const moves = await page.evaluate(() => BCD_DEV.solutionFromHere());
    for (let i = 0; i < moves.length; i++) {
      await page.keyboard.press(moves[i]);
      if (i < moves.length - 1) await page.waitForFunction(n => document.getElementById('hudMoves').textContent === String(n), i + 1, { timeout: 3000 });
      await wait(page, 140);
    }
    await wait(page, after);
  };
  // Retour à la page JOUER : onglet du bas dans le hub, sinon le bouton retour de l'écran.
  const home = async page => { await page.evaluate(() => { if (document.getElementById('hub').classList.contains('on')) { if (!document.querySelector('#screen-home.active')) document.getElementById('tabPlay').click(); return; } for (const id of ['btnBackHomeSettings', 'btnBackHomeHelp', 'btnBackHomeDaily', 'btnBackHomeSentier']) { const e = document.getElementById(id); if (e && e.closest('.screen.active')) { e.click(); return; } } if (document.querySelector('#screen-splash.active')) { document.getElementById('btnSplashPlay').click(); return; } if (document.querySelector('#screen-game.active')) document.getElementById('btnExitGame').click(); if (document.querySelector('#screen-victory.active, #screen-select.active')) document.getElementById('btnBackHome').click(); }); await wait(page, 300); if (await screen(page) !== 'screen-home') { await page.evaluate(() => document.getElementById('btnBackHome').click()); await wait(page, 300); } };
  // Écran de lancement → « Jouer » : Germain intervient à l'arrivée sur la page JOUER.
  const enter = async (page, ms = 1300) => {
    await page.waitForSelector('#screen-splash.active #btnSplashPlay', { timeout: 5000 });
    await page.click('#btnSplashPlay'); await wait(page, ms);
  };

  // ================= 1. Premier lancement complet =================
  let page = await newPage();
  await page.goto(FILE); await wait(page, 700);
  check(await screen(page) === 'screen-splash' && (await coach(page)) === '', 'premier lancement : écran de lancement, Germain attend « Jouer »');
  await enter(page);
  check(await screen(page) === 'screen-game' && (await page.textContent('#gameLevelTitle')).startsWith('1.'), 'premier « Jouer » : niveau 1 tout de suite (aucun écran en plus)');
  check((await coach(page)).includes('Germain'), 'premier lancement : Germain se présente sur le plateau');
  check(await page.evaluate(() => !document.querySelector('#coach .coach-skip').hidden), '« Passer » visible dès la première bulle');
  await shot(page, 't01-intro');
  check((await coach(page)).includes('droite') && (await page.textContent('#gameTip')).trim() === '', 'niveau 1 : Germain montre le geste en une bulle, pas de mur de texte');
  check(!!(await page.$('#swipeHint')), 'niveau 1 : doigt fantôme qui montre le geste');
  await page.keyboard.press('ArrowRight'); await wait(page, 1600);
  check(await screen(page) === 'screen-victory' && (await coach(page)).includes('lumière'), 'victoire : Germain célèbre');
  check((await tuto(page)).intro === 'done', 'intro terminée et sauvegardée');
  await noJunk(page, 'victoire du niveau 1');
  // Niveaux 2 et 3 en autonomie : Germain reste discret.
  await page.click('#btnNextLevel'); await wait(page, 700);
  check((await coach(page)).includes('À toi de jouer'), 'niveau 2 : un mot puis Germain se fait discret');
  await solve(page, 700); // la réaction dure 1,7 s : on la regarde pendant qu'elle est là
  const react2 = await coach(page);
  check(react2.length > 0 && react2.length < 30, `victoire du niveau 2 : courte réaction (« ${react2} »)`);
  await wait(page, 1400);
  // Niveau 3 = nouvelle mécanique (murs) : mini-scène au lieu du texte en bas.
  await page.click('#btnNextLevel'); await wait(page, 900);
  check((await coach(page)).toLowerCase().includes('mur') && (await page.textContent('#gameTip')).trim() === '', 'nouvelle mécanique : mini-scène de Germain au lieu de l\'aide texte');
  await shot(page, 't02-mecanique');
  await solve(page);
  check(await screen(page) === 'screen-victory', 'niveaux 1 à 3 réussis pendant le tutoriel');

  // ================= 2. Visite des onglets, un à un =================
  // Jardin : la rosée gagnée suffit pour un premier chantier.
  await home(page); await wait(page, 900);
  check(await page.evaluate(() => document.querySelectorAll('.coach-blocker').length === 4 && !!document.querySelector('.coach-ring')), 'visite du Jardin : projecteur (fond assombri + trou sur la cible)');
  check((await coach(page)).includes('rosée'), 'Germain explique pourquoi venir au Jardin');
  await shot(page, 't03-projecteur');
  await page.mouse.click(10, 420); await wait(page, 200);
  check(await screen(page) === 'screen-home', 'toucher hors du trou : rien ne se passe (pas d\'action parasite)');
  const roseeBefore = await page.evaluate(() => BCD_DEV.getGarden().rosee);
  check(await page.evaluate(() => { const r = document.querySelector('.coach-ring').getBoundingClientRect(), t = document.getElementById('tabGarden').getBoundingClientRect(); return r.left <= t.left && r.right >= t.right && r.top <= t.top; }), 'projecteur sur l\'onglet Jardin de la barre du bas');
  await page.click('#tabGarden'); await wait(page, 900);
  check(await screen(page) === 'screen-garden' && (await page.evaluate(() => BCD_DEV.getGarden().rosee)) === roseeBefore + 3, 'Jardin ouvert, cadeau +3 rosée');
  check(!!(await page.$('.coach-ring')), 'projecteur sur « Réveiller »');
  await page.click('#btnRestore'); await wait(page, 1600);
  check((await tuto(page)).tours.garden === 'done' && (await page.evaluate(() => BCD_DEV.getGarden().done)) === 1, 'premier chantier réveillé, étape « Jardin » validée');
  // Retour arrière (Android / navigateur) : jamais de projecteur fantôme.
  await page.goBack(); await wait(page, 500);
  check(await screen(page) === 'screen-home', 'retour système : on revient à l\'accueil');
  // Arrivée calme sur l'accueil (aucune visite due) : l'aide de navigation, une fois.
  await wait(page, 600);
  check((await coach(page)).includes('Glisse'), 'aide de navigation montrée à une arrivée calme sur l\'accueil');
  await page.click('#coach .c-primary'); await wait(page, 200);
  // Atelier : 30 pièces atteintes après 3 niveaux et 2 succès.
  await page.evaluate(() => BCD_DEV.devSetCoins(Math.max(30, BCD_DEV.getCoins())));
  await page.evaluate(() => BCD_DEV.tutorialKick()); await wait(page, 700);
  check((await coach(page)).includes('pièces') && !!(await page.$('.coach-ring')), 'Atelier présenté quand il y a de quoi dépenser');
  await page.click('#tabCollection'); await wait(page, 900);
  check(await page.evaluate(() => BCD_DEV.getOwnedCosmetics().includes('jade')), 'cadeau d\'essai : graine de jade offerte');
  await page.click('#atelierAction'); await wait(page, 600);
  check(await page.evaluate(() => BCD_DEV.getEquippedCosmetic() === 'jade') && (await tuto(page)).tours.shop === 'done', 'graine essayée (équipée), étape « Atelier » validée');
  await home(page); await wait(page, 300);
  // « Plus tard » : jamais forcé ; au 2e refus l'étape est abandonnée.
  // (Une aide déjà ouverte — ex. le rang du jardinier fêté sur JOUER — se ferme d'abord.)
  await wait(page, 4200); await page.keyboard.press('Escape'); await wait(page, 200);
  await page.evaluate(() => BCD_DEV.tutorialKick()); await wait(page, 700);
  const cDef = await coach(page); check(cDef.includes('défi'), 'défi du jour présenté (' + cDef + ')');
  await page.click('#coach .c-ghost'); await wait(page, 300);
  check(!(await page.$('.coach-ring')) && (await tuto(page)).attempts.daily === 1 && (await tuto(page)).tours.daily === 'pending', '« Plus tard » : projecteur retiré, on reproposera');
  await page.evaluate(() => BCD_DEV.tutorialKick()); await wait(page, 700);
  await page.click('#btnDaily'); await wait(page, 700);
  check(await screen(page) === 'screen-game' && (await tuto(page)).tours.daily === 'done', 'défi lancé depuis le projecteur, étape validée');
  await home(page); await wait(page, 300);
  // Marché : un cadeau du jour attend, ouvert sous le projecteur.
  await page.evaluate(() => BCD_DEV.tutorialKick()); await wait(page, 700);
  check((await coach(page)).includes('cadeau') && !!(await page.$('.coach-ring')), 'Marché présenté quand un cadeau du jour attend');
  await page.click('#tabMarket'); await wait(page, 900);
  check(await screen(page) === 'screen-market' && !!(await page.$('.coach-ring')), 'projecteur sur « Récupérer » du cadeau');
  const coinsGift = await page.evaluate(() => BCD_DEV.getCoins());
  await page.click('#btnGiftClaim'); await wait(page, 700);
  check((await tuto(page)).tours.market === 'done' && (await page.evaluate(() => BCD_DEV.getCoins())) === coinsGift + 15, 'cadeau ouvert (+15 pièces), étape « Marché » validée');
  await home(page); await wait(page, 300);
  // Cible absente : l'étape s'annule proprement, sans bloquer l'écran.
  for (const i of [3, 4, 5]) { await page.evaluate(i => BCD_DEV.playLevel(i), i); await wait(page, 400); await solve(page); }
  await home(page); await wait(page, 300);
  await page.evaluate(() => { document.getElementById('tabProfile').style.display = 'none'; BCD_DEV.tutorialKick(); }); await wait(page, 700);
  const tAbsent = await tuto(page);
  check(tAbsent.attempts.profile >= 1 && !(await page.$('.coach-blocker')), 'cible absente : étape annulée, aucun voile ne reste');
  await page.evaluate(() => { document.getElementById('tabProfile').style.display = ''; });
  await page.evaluate(() => BCD_DEV.tutorialKick()); await wait(page, 700);
  await page.click('#tabProfile'); await wait(page, 800);
  check(await screen(page) === 'screen-profile' && await page.evaluate(() => !document.getElementById('panelMissions').hidden) && (await tuto(page)).tours.profile === 'done', 'Profil présenté (missions, saison, succès), étape validée');
  // Fin : diplôme d'Apprenti et récompense.
  const coinsBefore = await page.evaluate(() => BCD_DEV.getCoins());
  await home(page); await wait(page, 300);
  await page.evaluate(() => BCD_DEV.tutorialKick()); await wait(page, 900);
  const tEnd = await tuto(page);
  check(tEnd.done && tEnd.graduated && (await coach(page)).includes('Apprenti'), 'fin du tutoriel : diplôme annoncé par Germain');
  check(await page.evaluate(() => 'apprentice' in BCD_DEV.getAchievements()) && (await page.evaluate(() => BCD_DEV.getCoins())) === coinsBefore + 25, 'succès « Apprenti » débloqué, +25 coins');
  await noJunk(page, 'fin du tutoriel');
  await shot(page, 't04-fin');
  // Lendemain : rappel bienveillant du défi (une fois par jour).
  await page.click('#coach .c-primary'); await wait(page, 200);
  const tomorrow = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); });
  await page.evaluate(d => { BCD_DEV.setSimulatedDate(d + 'T09:00:00'); BCD_DEV.tutorialKick(); }, tomorrow); await wait(page, 700);
  check((await coach(page)).includes('défi du jour'), 'lendemain : Germain rappelle le défi, sans pression');
  await wait(page, 4000);
  await page.evaluate(() => BCD_DEV.tutorialKick()); await wait(page, 600);
  check(!(await coach(page)).includes('défi du jour'), 'rappel : une seule fois par jour');
  const rep = await page.evaluate(() => BCD_DEV.getRetentionReport().tutorial);
  check(rep.started === 1 && rep.completed === 1 && rep.steps.includes('level1') && rep.steps.includes('onglet_garden'), `mesure locale : démarré, terminé, étapes (${rep.steps.join(', ')})`);
  await page.context().close();

  // ================= 3. Fermeture en plein tutoriel, puis reprise =================
  page = await newPage();
  await page.goto(FILE); await enter(page, 1200);
  check((await tuto(page)).intro === 'level1', 'intro en cours sauvegardée');
  await page.reload(); await enter(page);
  check(await screen(page) === 'screen-game' && (await coach(page)).includes('Glisse') && !(await coach(page)).includes('Salut'), 'réouverture : niveau 1 repris directement, sans se re-présenter');
  // « Passer » à une étape précise : mesure de l'endroit où l'on décroche.
  await page.click('#coach .coach-skip'); await wait(page, 300);
  const sk = await page.evaluate(() => BCD_DEV.getRetentionReport().tutorial.skippedAt);
  check((await tuto(page)).skipped && sk[sk.length - 1] === 'level1', `« Passer » enregistre l'étape (${sk.join(', ')})`);
  check((await page.textContent('#gameTip')).trim().length > 0, 'tutoriel passé : l\'aide texte reprend sa place');
  // Après « Passer », les mécaniques reviennent en texte (aucune bulle imposée).
  await page.evaluate(() => BCD_DEV.playLevel(8)); await wait(page, 600);
  check((await page.textContent('#gameTip')).includes('Nouveau') && !(await coach(page)).includes('rocher'), 'nouvelle mécanique après « Passer » : aide texte classique, pas de mini-scène');
  // « Revoir le tutoriel » depuis les Paramètres.
  await home(page);
  await page.evaluate(() => document.getElementById('btnSettings').click()); await wait(page, 300);
  await page.click('#btnTutoReplay'); await wait(page, 1300);
  check(await screen(page) === 'screen-home' && (await coach(page)).includes('Germain') && !(await tuto(page)).skipped, '« Revoir le tutoriel » : Germain recommence');
  // Réinitialisation complète : un joueur neuf refait le tutoriel (choix documenté).
  await page.click('#coach .coach-skip'); await wait(page, 300);
  await page.evaluate(() => document.getElementById('btnSettings').click()); await wait(page, 300);
  await page.click('#btnResetProgress'); await wait(page, 300);
  await page.evaluate(() => document.getElementById('btnBackHomeSettings').click()); await wait(page, 1300);
  check((await tuto(page)).intro === 'pending' && (await coach(page)).includes('Germain'), 'réinitialisation : le tutoriel repart de zéro');
  await page.context().close();

  // ================= 4. Joueur existant : aucune intro imposée =================
  page = await newPage();
  await page.addInitScript(() => {
    if (!localStorage.getItem('bcd_progress_v1')) localStorage.setItem('bcd_progress_v1', JSON.stringify({ schemaVersion: 1, data: { 0: 3, 1: 3, 2: 2, 3: 3 } }));
  });
  await page.goto(FILE); await enter(page);
  const tOld = await tuto(page);
  check(tOld.existing && tOld.intro === 'done' && !(await coach(page)).includes('Moi, c\'est'), 'joueur existant : pas d\'intro imposée');
  check((await coach(page)).includes('nouveau'), 'joueur existant : visite des nouveautés proposée');
  await page.click('#coach .c-primary'); await wait(page, 700);
  check(!!(await page.$('.coach-ring')) && (await coach(page)).includes('Jardin'), 'visite des nouveautés : projecteur sur le Jardin');
  for (let i = 0; i < 4; i++) { await page.click('#coach .c-primary').catch(() => {}); await wait(page, 600); }
  check((await tuto(page)).news === 'done' && !(await page.$('.coach-ring')), 'visite terminée, jamais reproposée');
  check((await coach(page)).includes('Glisse'), 'fin de la visite : Germain montre le geste de navigation');
  await page.reload(); await enter(page, 2200);
  const afterReload = await coach(page);
  check(afterReload === '', `rechargement : Germain ne revient pas sans raison (« ${afterReload} »)`);
  await page.context().close();

  // ================= 5. Animations réduites =================
  page = await newPage({ reducedMotion: 'reduce' });
  await page.goto(FILE); await enter(page, 900);
  const full = await page.evaluate(() => { const el = document.querySelector('#coach .coach-text'); return el ? el.textContent : ''; });
  check(full === "Salut, moi c'est Germain ! Glisse-moi vers la droite.", 'animations réduites : texte affiché d\'un coup, sans effet machine à écrire');
  check(await page.evaluate(() => getComputedStyle(document.querySelector('#coach .gm-body')).animationName === 'none'), 'animations réduites : Germain ne bouge pas');
  check(await page.evaluate(() => document.getElementById('coachLive').textContent.includes('Germain')), 'lecteur d\'écran : la réplique est annoncée (aria-live)');
  await page.context().close();

  // ================= 6. Stockage corrompu =================
  for (const bad of ['{"schemaVersion":1,"data":"zzz"}', 'pas du json', '{"schemaVersion":1,"data":{"intro":42,"tours":"x"}}']) {
    page = await newPage();
    await page.addInitScript(b => localStorage.setItem('bcd_tutorial_v1', b), bad);
    await page.goto(FILE); await enter(page, 1200);
    const t = await tuto(page);
    check(['pending', 'level1', 'done'].includes(t.intro) && ['screen-home', 'screen-game'].includes(await screen(page)), `tutoriel corrompu (${bad.slice(0, 24)}…) : aucun plantage`);
    await noJunk(page, 'stockage corrompu');
    await page.context().close();
  }

  check(problems.length === 0, 'aucune erreur ni avertissement console' + (problems.length ? ' : ' + problems.slice(0, 3).join(' | ') : ''));
  await browser.close();
  server.close();
  console.log(`\n${checks} vérifications, ${failures} échec(s).`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
