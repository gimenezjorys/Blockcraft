#!/usr/bin/env node
// Parcours de bout en bout dans un vrai navigateur (Chromium via Playwright).
// Joue le jeu comme un joueur : tutoriel, victoire, annuler, impasse,
// défi du jour, Sentier (Chrono + Zen), Jardin, succès, réglages,
// persistance après rechargement — et échoue sur toute erreur console.
// Les plateaux sont résolus avec BCD_DEV.solutionFromHere() (solveur du jeu).
//
// Usage : node scripts/e2e-smoke.js [dossier-captures]
// Prérequis : Playwright (npm i -D playwright ou installation globale +
// NODE_PATH=$(npm root -g)). Chromium : `npx playwright install chromium`,
// ou variable CHROMIUM_PATH vers un exécutable existant.
'use strict';
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('✘ Playwright introuvable (npm i -D playwright, ou NODE_PATH=$(npm root -g))'); process.exit(1); }

const OUT = process.argv[2] || null;
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
let failures = 0, checks = 0;
function check(cond, msg) { checks++; if (!cond) { failures++; console.error('✘ ' + msg); } else console.log('✔ ' + msg); }

// Serveur statique minimal (aucune dépendance) pour tester la PWA en http.
function startStaticServer(root) {
  const http = require('http');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.json': 'application/json' };
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

(async () => {
  const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const consoleProblems = [];
  page.on('pageerror', e => consoleProblems.push('pageerror: ' + e.message));
  page.on('console', m => {
    if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource/.test(m.text())) consoleProblems.push(m.type() + ': ' + m.text());
  });
  // Polices Google : bloquées pour un test hermétique (repli system-ui prévu).
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const shot = async name => { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, name + '.png') }); } };
  const screen = () => page.evaluate(() => document.querySelector('.screen.active').id);
  const wait = ms => page.waitForTimeout(ms);
  const solve = async () => {
    const moves = await page.evaluate(() => BCD_DEV.solutionFromHere());
    for (const k of moves) { await page.keyboard.press(k); await wait(190); }
    return moves.length;
  };

  await page.goto(FILE);
  await wait(300);
  await shot('01-accueil');
  check(await screen() === 'screen-home', 'accueil affiché au lancement');

  // 1. Tutoriel : JOUER lance directement le niveau 1
  await page.click('#btnContinue'); await wait(300);
  check((await page.textContent('#gameLevelTitle')).startsWith('1.'), 'JOUER lance le niveau 1');
  check((await page.textContent('#gameTip')).length > 0, 'aide du tutoriel affichée sous la grille');
  await page.keyboard.press('ArrowRight'); await wait(200);
  const tf = await page.evaluate(() => getComputedStyle(document.getElementById('seed')).transform);
  check(tf !== 'none', `la graine reste en place pendant l'arrivée gagnante (${tf})`);
  await wait(2000);
  check(await screen() === 'screen-victory', 'victoire du niveau 1');
  check((await page.textContent('#victoryTitle')) === 'Parfait !', 'titre « Parfait ! » pour une solution au par');
  check(!(await page.textContent('#victoryRewards')).includes('Record'), 'pas de « record » à la première réussite');
  await shot('02-victoire');

  // 2. Niveaux 2 et 3 → fin du tutoriel
  for (let i = 0; i < 2; i++) { await page.click('#btnNextLevel'); await wait(300); await solve(); await wait(2000); }
  check(await screen() === 'screen-victory', 'niveaux 2 et 3 terminés');

  // 2b. Fantôme du record : rejouer le niveau 2 affiche le meilleur essai,
  //     et le battre (moins de coups) est signalé.
  await page.click('#btnExitGame').catch(() => {});
  await page.evaluate(() => { document.getElementById('btnBackHome').click(); });
  await wait(200);
  await page.click('#btnPlay'); await wait(200);
  // Point de départ déterministe : aucun fantôme sur ce niveau (le tutoriel
  // en a déjà enregistré un en 2 coups, que 2 coups ne battraient qu'au chrono).
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('bcd_ghosts_v1') || '{"schemaVersion":1,"data":{}}');
    delete raw.data.L1;
    localStorage.setItem('bcd_ghosts_v1', JSON.stringify(raw));
  });
  await page.click('.level-card[aria-label^="Niveau 2 "]'); await wait(300);
  for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowRight', 'ArrowDown']) { await page.keyboard.press(k); await wait(220); }
  await wait(2000);
  await page.click('#btnReplayVictory'); await wait(300);
  check(!!(await page.$('.piece-ghost')), 'fantôme du record affiché au rejeu');
  check((await page.textContent('#gameTip')).includes('fantôme'), 'aide : course contre son fantôme');
  await solve(); await wait(2000);
  check((await page.textContent('#victoryRewards')).includes('Fantôme battu'), 'fantôme battu signalé en victoire');

  // 3. Annuler + impasse (niveau 9 : bas = impasse prouvée)
  await page.evaluate(() => { const d = {}; for (let i = 0; i < 8; i++) d[i] = 3; localStorage.setItem('bcd_progress_v1', JSON.stringify({ schemaVersion: 1, data: d })); });
  await page.reload(); await wait(300);
  await page.click('#btnPlay'); await wait(200);
  await page.click('.level-card[aria-label^="Niveau 9 "]'); await wait(300);
  await page.keyboard.press('ArrowDown'); await wait(350);
  check((await page.textContent('#gameTip')).includes('Impasse'), 'impasse détectée par le solveur');
  check(await page.evaluate(() => document.getElementById('btnUndo').classList.contains('attention')), 'Annuler mis en avant en cas d\'impasse');
  await shot('03-impasse');
  await page.keyboard.press('z'); await wait(300);
  check((await page.textContent('#hudMoves')) === '0', 'Annuler ramène le compteur à 0');
  check(!(await page.textContent('#gameTip')).includes('Impasse'), 'message d\'impasse retiré après annulation');
  await solve(); await wait(2000);
  check(await screen() === 'screen-victory', 'niveau 9 réussi après annulation');

  // 4. Défi du jour généré
  await page.evaluate(() => { document.getElementById('btnNextLevel').click(); });
  await wait(300);
  await page.click('#btnExitGame'); await wait(200);
  await page.click('#btnBackHome'); await wait(200);
  await page.click('#btnDaily'); await wait(400);
  check((await page.textContent('#gameLevelTitle')).includes('Défi'), 'défi du jour lancé');
  const dailyPar = Number(await page.textContent('#hudPar'));
  check(dailyPar >= 4 && dailyPar <= 6, `par du défi dans [4,6] (${dailyPar})`);
  await solve(); await wait(2200);
  check(await screen() === 'screen-victory', 'défi du jour réussi');
  await page.click('#btnNextLevel'); await wait(300);
  check(await screen() === 'screen-dailyresult', 'résumé du défi du jour');
  const dailyText = await page.textContent('#screen-dailyresult');
  check(!/Ont tenté|rang estimé|simulées/i.test(dailyText), 'aucune donnée simulée affichée');
  check((await page.$$('.week-cell')).length === 7, 'semaine glissante en 7 pastilles');
  await shot('04-defi-resultat');
  await page.click('#btnShareDaily'); await wait(300);
  const shareOut = await page.evaluate(() => { const t = document.getElementById('shareTextOut'); return t.hidden ? '' : t.value; });
  check(shareOut.includes('BlockCraft Daily') && shareOut.includes('par'), 'texte de partage généré (repli sélectionnable)');
  await page.click('#btnBackHomeDaily'); await wait(300);
  check((await page.textContent('#homeDailyBadge')).includes('Fait'), 'accueil : défi marqué « Fait »');

  // 5. Le Sentier — Chrono
  await page.click('#btnSentier'); await wait(300);
  check(await page.evaluate(() => !document.getElementById('sentierModes').hidden), 'Sentier ouvert après le Monde 1');
  await page.click('#btnSentierChrono'); await wait(400);
  for (let i = 0; i < 3; i++) { await solve(); await wait(1150); }
  const bar = await page.evaluate(() => document.getElementById('sentierBar').innerText.replace(/\s+/g, ' '));
  check(/SCORE 60/.test(bar) && /×4/.test(bar), `3 solutions parfaites → 60 points, série ×4 (${bar})`);
  await shot('05-sentier');
  await page.click('#btnSkipBoard'); await wait(300);
  check(/×1/.test(await page.textContent('#sbMult')), 'passer un plateau remet la série à ×1');
  await page.evaluate(() => BCD_DEV.setSentierTimeLeft(300)); await wait(900);
  check(await screen() === 'screen-sentierend', 'fin de partie Chrono au temps écoulé');
  check((await page.textContent('#seScore')) === '60', 'score final affiché');
  await shot('06-sentier-fin');

  // 6. Le Sentier — Zen
  await page.click('#btnSentierEndBack'); await wait(200);
  await page.click('#btnSentierZen'); await wait(400);
  check(await page.evaluate(() => document.getElementById('sbClockWrap').hidden), 'Zen : pas de chrono');
  await solve(); await wait(1150);
  await page.click('#btnExitGame'); await wait(400);
  check(await screen() === 'screen-sentierend', 'Zen : écran de fin après abandon avec un plateau résolu');
  const stats = await page.evaluate(() => BCD_DEV.getSentierStats());
  check(stats.totalPerfect >= 4 && stats.runs === 1 && stats.bestScore === 60, 'statistiques du Sentier persistées');
  await page.click('#btnSentierEndHome'); await wait(200);

  // 7. Jardin + succès
  await page.click('#homeGarden'); await wait(500);
  check((await page.$$('.plot')).length === 8, 'Jardin : 8 parcelles');
  check((await page.textContent('#gardenPlots')).includes('En pleine floraison'), 'Jardin : le Monde 1 à 3★ est en fleur');
  await shot('07-jardin');
  await page.click('#btnBackHomeGarden'); await wait(200);
  await page.click('#btnAchievements'); await wait(300);
  check((await page.$$('.ach-progress')).length > 0, 'succès : barres de progression visibles');
  check((await page.$$('.achievement-card.tiered')).length === 1, 'succès évolutif « Maître du par » affiché');
  await page.click('#btnBackHomeAchievements'); await wait(200);

  // 8. Réglages : animations réduites
  await page.click('#btnSettings'); await wait(200);
  await page.click('#toggleMotion'); await wait(100);
  check(await page.evaluate(() => document.documentElement.classList.contains('reduce-motion')), 'réglage « Animations réduites » appliqué');
  await page.click('#toggleMotion');

  // 9. Persistance après rechargement
  await page.reload(); await wait(300);
  check((await page.textContent('#homeDailyBadge')).includes('Fait'), 'persistance : défi du jour après rechargement');
  const report = await page.evaluate(() => BCD_DEV.getRetentionReport());
  check(report.engagement.sessions >= 3 && report.depth.sentierRuns >= 2, 'rapport de rétention local alimenté');

  // 9b. Coffre de la semaine : 5 défis du lundi au dimanche → +25, une seule fois
  const chest = await page.evaluate(() => {
    const out = [];
    ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'].forEach(d => {
      BCD_DEV.setSimulatedDate(d + 'T12:00:00');
      out.push(BCD_DEV.simulateDailyWin(4, 20, 3).chest);
    });
    BCD_DEV.clearSimulatedDate();
    return out;
  });
  check(JSON.stringify(chest) === '[0,0,0,0,25,0]', `coffre de la semaine ouvert au 5e défi, une seule fois (${JSON.stringify(chest)})`);

  // 10. Aucune erreur/avertissement console
  check(consoleProblems.length === 0, 'aucune erreur ni avertissement console' + (consoleProblems.length ? ' :\n  ' + consoleProblems.join('\n  ') : ''));

  // 11. PWA : service worker + jeu hors ligne (serveur statique local minimal,
  //     car un service worker n'existe pas en file://).
  const server = await startStaticServer(path.resolve(__dirname, '..'));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pw = await ctx.newPage();
  await pw.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await pw.goto(`http://localhost:${server.port}/index.html`);
  await pw.waitForTimeout(1500);
  await pw.reload(); await pw.waitForTimeout(800);
  check(await pw.evaluate(() => !!navigator.serviceWorker.controller), 'PWA : service worker actif');
  const man = await pw.evaluate(async () => (await (await fetch(document.querySelector('link[rel=manifest]').href)).json()));
  check(man.icons && man.icons.length === 3 && man.start_url === './', 'PWA : manifest valide (3 icônes)');
  await ctx.setOffline(true);
  await pw.reload(); await pw.waitForTimeout(800);
  await pw.click('#btnContinue'); await pw.waitForTimeout(300);
  check(await pw.evaluate(() => document.querySelector('.screen.active').id) === 'screen-game', 'PWA : jeu lancé hors ligne');
  await ctx.close();
  server.close();

  await browser.close();
  console.log(`\n${checks} vérifications, ${failures} échec(s).`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('✘ ' + (e && e.stack || e)); process.exit(1); });
