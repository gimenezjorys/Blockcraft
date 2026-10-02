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
// Le jeu est servi en http (comme sur GitHub Pages) : en file://, Chromium perd
// parfois tout le localStorage au rechargement, ce qui faussait la persistance.
let FILE = '';
let failures = 0, checks = 0;
function check(cond, msg) { checks++; if (!cond) { failures++; console.error('✘ ' + msg); } else console.log('✔ ' + msg); }

// Serveur statique minimal (aucune dépendance) : le jeu et la PWA en http.
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
  const server = await startStaticServer(path.resolve(__dirname, '..'));
  FILE = `http://127.0.0.1:${server.port}/index.html`;
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
    const start = Number(await page.textContent('#hudMoves'));
    for (let i = 0; i < moves.length; i++) {
      await page.keyboard.press(moves[i]);
      // Attend que le coup soit compté avant le suivant (touche ignorée pendant une glissade).
      if (i < moves.length - 1) await page.waitForFunction(n => document.getElementById('hudMoves').textContent === String(n), start + i + 1, { timeout: 3000 });
      await wait(i < moves.length - 1 ? 120 : 190);
    }
    return moves.length;
  };

  await page.goto(FILE);
  await wait(300);
  await shot('00-lancement');
  check(await screen() === 'screen-splash', 'écran de lancement affiché au démarrage');
  check(await page.evaluate(() => !!document.querySelector('#btnSplashPlay') && document.getElementById('hub').classList.contains('on') === false), 'lancement : gros bouton JOUER, hub masqué');
  // 1. Nouveau joueur : « Jouer » lance directement le niveau 1, Germain s'y présente.
  await page.click('#btnSplashPlay'); await wait(450);
  await shot('01-niveau1');
  check(await screen() === 'screen-game' && (await page.textContent('#gameLevelTitle')).startsWith('1.'), 'nouveau joueur : « Jouer » lance directement le niveau 1');
  await wait(700);
  check((await page.evaluate(() => BCD_DEV.coachText())).includes('Germain'), 'premier lancement : Germain se présente sur le plateau');
  check((await page.evaluate(() => BCD_DEV.coachText())).includes('Glisse'), 'niveau 1 : Germain montre le geste (au lieu de l\'aide texte)');
  // Mesure chronométrée DANS la page : 150 ms après le coup, donc toujours
  // avant onWin() (différé de 260 ms), qui masque l'écran de jeu.
  const tf = await page.evaluate(() => new Promise(res => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    setTimeout(() => res(getComputedStyle(document.getElementById('seed')).transform), 150);
  }));
  await wait(200);
  check(tf !== 'none', `la graine reste en place pendant l'arrivée gagnante (${tf})`);
  await wait(2000);
  check(await screen() === 'screen-victory', 'victoire du niveau 1');
  check((await page.textContent('#victoryTitle')) === 'Parfait !', 'titre « Parfait ! » pour une solution au par');
  check((await page.textContent('#victoryRewards')).includes('+3 rosée'), 'Jardin : 3 étoiles nouvelles → +3 rosée en victoire');
  check(await page.evaluate(() => BCD_DEV.getGarden().rosee === 3), 'rosée créditée et sauvegardée');
  check(!(await page.textContent('#victoryRewards')).includes('Record'), 'pas de « record » à la première réussite');
  await shot('02-victoire');
  // Le reste du parcours joue sans tutoriel (le tutoriel complet est testé
  // par scripts/e2e-tutorial.js) : on le passe, comme un joueur pressé.
  await page.click('#coach .coach-skip'); await wait(200);
  check(await page.evaluate(() => BCD_DEV.getTutorial().skipped), 'tutoriel passé d\'un toucher (« Passer » visible)');

  // 2. Niveaux 2 et 3
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
  // Chaque coup doit être compté (une touche pendant une glissade est
  // ignorée) : sinon ce premier essai ferait 2 coups et resterait imbattable.
  const slow = ['ArrowRight', 'ArrowLeft', 'ArrowRight', 'ArrowDown'];
  for (let i = 0; i < slow.length; i++) {
    await page.keyboard.press(slow[i]);
    if (i < slow.length - 1) {
      await page.waitForFunction(n => document.getElementById('hudMoves').textContent === String(n), i + 1, { timeout: 3000 });
      await wait(120);
    }
  }
  await wait(2000);
  await page.click('#btnReplayVictory'); await wait(300);
  check(!!(await page.$('.piece-ghost')), 'fantôme du record affiché au rejeu');
  check((await page.textContent('#gameTip')).includes('fantôme'), 'aide : course contre son fantôme');
  await solve(); await wait(2000);
  check((await page.textContent('#victoryRewards')).includes('Fantôme battu'), 'fantôme battu signalé en victoire');

  // 3. Annuler + impasse (niveau 9 : bas = impasse prouvée)
  await page.evaluate(() => { const d = {}; for (let i = 0; i < 8; i++) d[i] = 3; localStorage.setItem('bcd_progress_v1', JSON.stringify({ schemaVersion: 1, data: d })); });
  await page.reload(); await wait(300);
  await page.click('#btnSplashPlay'); await wait(300);
  await page.click('#btnPlay'); await wait(200);
  await page.click('.level-card[aria-label^="Niveau 9 "]'); await wait(300);
  await page.keyboard.press('ArrowDown'); await wait(350);
  check((await page.textContent('#gameTip')).includes('Impasse'), 'impasse détectée par le solveur');
  check(await page.evaluate(() => document.getElementById('btnUndo').classList.contains('attention')), 'Annuler mis en avant en cas d\'impasse');
  await shot('03-impasse');
  await page.click('#btnHint'); await wait(200);
  check((await page.textContent('#gameTip')).includes('Reviens 1 coup'), 'en impasse, l\'indice indique combien de coups annuler');
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
  check(shareOut.includes('Seedrift') && shareOut.includes('par'), 'texte de partage généré avec le nom du jeu (repli sélectionnable)');
  check((await page.title()) === 'Seedrift' && (await page.textContent('#gameTitle')) === 'Seedrift', 'nom du jeu appliqué (titre de page et logo)');
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

  // 7. Jardin + succès (pages du hub)
  await page.click('#homeGarden'); await wait(500);
  check(await screen() === 'screen-garden' && await page.evaluate(() => document.querySelector('#tabbar .tab.on').dataset.page === 'garden'), 'raccourci de l\'accueil : page Jardin, onglet actif');
  check((await page.$$('.plot')).length === 8, 'Jardin : 8 parcelles');
  check((await page.textContent('#gardenPlots')).includes('En pleine floraison'), 'Jardin : le Monde 1 à 3★ est en fleur');
  await shot('07-jardin');
  await page.click('#tabProfile'); await wait(400);
  await page.click('#segSucces'); await wait(250);
  check((await page.$$('.ach-progress')).length > 0, 'succès : barres de progression visibles');
  check((await page.$$('.achievement-card.tiered')).length === 1, 'succès évolutif « Maître du par » affiché');
  check((await page.$$('.achievement-card.secret')).length >= 1, 'objectifs secrets affichés « ??? »');
  await page.click('#segMissions'); await wait(200);
  check((await page.$$('#gardenRitual .rc-mission')).length === 3 && (await page.$$('#weeklyCard .wm-row')).length === 4 && (await page.$$('#seasonCard .ss-node')).length === 20, 'Profil > Missions : rituel (3), semaine (4), saison (20 paliers)');
  check(await page.evaluate(() => { const r = BCD_DEV.getRitual(); return r.ids[0] === 'daily' && r.prog[0] === 1; }), 'rituel : le défi réussi plus tôt est compté');
  // Glisser le doigt (souris) vers la droite : page précédente (Jardin).
  const vpBox = await page.evaluate(() => { const r = document.getElementById('hubViewport').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.75 }; });
  await page.mouse.move(vpBox.x - 120, vpBox.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(vpBox.x - 120 + i * 30, vpBox.y + 2); await wait(16); }
  await page.mouse.up(); await wait(500);
  check(await screen() === 'screen-garden', 'glissement vers la droite : page Jardin');
  await page.click('#tabPlay'); await wait(300);

  // 8. Réglages : animations réduites
  await page.click('#btnSettings'); await wait(200);
  await page.click('#toggleMotion'); await wait(100);
  check(await page.evaluate(() => document.documentElement.classList.contains('reduce-motion')), 'réglage « Animations réduites » appliqué');
  await page.click('#toggleMotion');
  await page.click('#btnBackHomeSettings'); await wait(200);

  // 8b. L'Atelier : aperçu, achat, équipement (graine épique « Braise », 160 coins)
  await page.evaluate(() => BCD_DEV.devSetCoins(170));
  await page.click('#tabCollection'); await wait(400);
  check(await screen() === 'screen-cosmetics', 'Collection (Atelier) ouverte depuis la barre d\'onglets');
  await page.click('#atelierGrid .item-card[data-id="braise"]'); await wait(300);
  check((await page.textContent('#stageRarity')).length > 0 && !!(await page.$('#stageScene .stage-seed.fx-braise')), 'Atelier : aperçu de l\'objet sélectionné avec sa rareté');
  check((await page.textContent('#atelierAction')).includes('160'), 'Atelier : prix affiché avant achat');
  await page.click('#atelierAction'); await wait(400);
  check((await page.evaluate(() => BCD_DEV.getCoins())) === 10, 'Atelier : achat débité (170 → 10 coins)');
  check((await page.evaluate(() => BCD_DEV.getOwnedCosmetics())).includes('braise'), 'Atelier : graine achetée possédée');
  if (!(await page.textContent('#atelierAction')).includes('Équipé')) { await page.click('#atelierAction'); await wait(300); }
  check(await page.evaluate(() => BCD_DEV.getEquippedCosmetic() === 'braise' && document.documentElement.dataset.seedFx === 'braise'), 'Atelier : graine équipée et effet appliqué');
  await shot('08-atelier');
  // 8a. Le Marché : cadeau du jour (une fois par jour), pastille qui s'éteint.
  await page.click('#tabMarket'); await wait(400);
  check(await screen() === 'screen-market' && !!(await page.$('#btnGiftClaim')), 'Marché : cadeau du jour prêt');
  const coinsBeforeGift = await page.evaluate(() => BCD_DEV.getCoins());
  await page.click('#btnGiftClaim'); await wait(400);
  check((await page.evaluate(() => BCD_DEV.getCoins())) === coinsBeforeGift + 15 && !(await page.$('#btnGiftClaim')), 'cadeau du jour 1 : +15 🪙, puis plus disponible');
  check(await page.evaluate(() => document.querySelector('#tabMarket .tab-badge').hidden), 'pastille du Marché éteinte (cadeau pris, offre vue)');
  await shot('08b-marche');
  await page.click('#tabPlay'); await wait(300);

  // 8c. Le Jardin endormi : objectif sur l'accueil, restauration, fête de zone, rituel, pub simulée
  check((await page.textContent('#homeGardenNext')).length > 3, 'accueil : prochain chantier du jardin toujours visible');
  await page.evaluate(() => { BCD_DEV.setGardenDone(0); BCD_DEV.setRosee(40); });
  const coinsBeforeZone = await page.evaluate(() => BCD_DEV.getCoins());
  await page.click('#homeGarden'); await wait(400);
  check(await screen() === 'screen-garden' && !!(await page.$('#gzScene svg')), 'Jardin : scène de la zone affichée');
  for (let i = 0; i < 5; i++) { await page.click('#btnRestore'); await wait(750); }
  const gAfter = await page.evaluate(() => BCD_DEV.getGarden());
  // Le rituel du jour dépend de la date : s'il contient « Réveille un coin
  // du jardin », le 1er chantier accomplit cette mission (+3 💧).
  const restoreBonus = await page.evaluate(() => BCD_DEV.getRitual().ids.includes('restore1') ? 3 : 0);
  const roseeLeft = 40 - 36 + restoreBonus;
  check(gAfter.done === 5 && gAfter.rosee === roseeLeft, `5 chantiers réveillés, 36 💧 dépensés (${gAfter.done}, ${gAfter.rosee}, attendu ${roseeLeft})`);
  await wait(1400);
  check(!!(await page.$('.zone-fete')), 'zone réveillée : la fête s\'affiche');
  check((await page.evaluate(() => BCD_DEV.getCoins())) === coinsBeforeZone + 20 + 20, 'récompense de zone (+20) et succès « Jardinier » (+20) crédités');
  await shot('09-jardin-fete');
  await page.click('.zone-fete'); await wait(300);
  check(!(await page.$('.zone-fete')) && (await page.textContent('#gzZoneName')) === 'La Fontaine', 'fête fermée d\'un toucher, zone suivante affichée');
  check(await page.evaluate(() => document.getElementById('btnRestore').disabled), 'pas assez de rosée : bouton désactivé, jamais de dépense');
  await page.evaluate(() => BCD_DEV.resetAdCaps());
  await page.evaluate(() => { const r = document.getElementById('gzScene'); r.scrollIntoView(); });
  await page.evaluate(() => { document.getElementById('tabPlay').click(); }); await wait(200);
  await page.click('#homeGarden'); await wait(300);
  check(await page.evaluate(() => !document.getElementById('btnGardenBoost').hidden), 'pub récompensée proposée (arrosage bonus)');
  await page.click('#btnGardenBoost'); await wait(400);
  check(!!(await page.$('.ad-mock')), 'pub simulée affichée, étiquetée');
  await wait(3300);
  check(await page.evaluate(left => BCD_DEV.getGarden().rosee === left + 6 && document.getElementById('btnGardenBoost').hidden, roseeLeft), 'pub regardée : +6 💧, puis plus proposée (plafond)');
  await shot('10-jardin');
  // 8d. Jardin vivant (vrai rendu Chromium) : panorama, rosée touchée au doigt, ciels.
  check(await page.evaluate(() => document.querySelectorAll('#gzScene .gp-panel').length === 5 && document.querySelectorAll('#gzScene .gp-bed').length === 8), 'Jardin vivant : 5 tableaux, 8 plantes');
  const stageH = await page.evaluate(() => document.getElementById('gzStage').getBoundingClientRect().height);
  check(stageH >= 330, `Jardin vivant : la scène occupe l'écran (${Math.round(stageH)} px de haut)`);
  const dewInfo = await page.evaluate(() => BCD_DEV.getDew());
  if (dewInfo.left > 0) {
    await page.evaluate(() => { document.getElementById('screen-garden').scrollTop = 0; document.getElementById('gpDewChip').click(); }); await wait(700);
    const drop = await page.evaluate(() => { const d = [...document.querySelectorAll('#gzScene .gp-dew')].find(x => { const r = x.getBoundingClientRect(); return r.left > 0 && r.right < innerWidth; }); if (!d) return null; const r = d.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const rBefore = await page.evaluate(() => BCD_DEV.getGarden().rosee);
    if (drop) { await page.mouse.click(drop.x, drop.y); await wait(400); }
    const rAfter = await page.evaluate(() => BCD_DEV.getGarden().rosee);
    check(!!drop && rAfter === rBefore + 1, `rosée du matin : une goutte touchée = +1 💧 (${rBefore} → ${rAfter}, ${JSON.stringify(drop)}, coach ${await page.evaluate(() => !document.getElementById('coach').hidden)})`);
  } else check(true, 'rosée du matin déjà cueillie aujourd\'hui');
  for (const ph of ['jour', 'crepuscule']) {
    await page.evaluate(p => { BCD_DEV.setGardenPhase(p); document.getElementById('tabPlay').click(); }, ph); await wait(150);
    await page.click('#homeGarden'); await wait(500);
    check(await page.evaluate(p => document.getElementById('gzStage').dataset.phase === p, ph), `ciel « ${ph} » appliqué`);
    await shot('11-jardin-' + ph);
  }
  await page.evaluate(() => BCD_DEV.setGardenPhase(null));
  await page.evaluate(() => { document.getElementById('tabPlay').click(); }); await wait(200);

  // 9. Persistance après rechargement
  await page.reload(); await wait(300);
  await page.click('#btnSplashPlay'); await wait(300);
  check((await page.textContent('#homeDailyBadge')).includes('Fait'), 'persistance : défi du jour après rechargement');
  const report = await page.evaluate(() => BCD_DEV.getRetentionReport());
  check(report.engagement.sessions >= 3 && report.depth.sentierRuns >= 2, 'rapport de rétention local alimenté');
  check(report.retention.activeDays === 1 && report.retention.winsPerSession > 0 && report.ads.completed === 1 && report.ads.offered >= 1,
    `rétention par jour et pubs mesurées (${JSON.stringify(report.retention)})`);

  // 9a. Données corrompues : jamais de plantage, valeurs saines
  await page.evaluate(() => {
    localStorage.setItem('bcd_garden_v1', '{"schemaVersion":1,"data":{"rosee":"abc","done":-4}}');
    localStorage.setItem('bcd_ritual_v1', 'pas du json');
    localStorage.setItem('bcd_ads_v1', '[1,2,3]');
    localStorage.setItem('bcd_retention_v1', '{"schemaVersion":99,"data":null}');
  });
  await page.reload(); await wait(300);
  await page.click('#btnSplashPlay'); await wait(300);
  check(await page.evaluate(() => { const g = BCD_DEV.getGarden(); return g.rosee === 0 && g.done === 0; }) &&
    (await page.textContent('#homeGardenNext')) === 'Arracher les ronces', 'sauvegardes corrompues : jeu intact, valeurs par défaut');

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
  //     sur une autre origine que la partie principale : stockage neuf).
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pw = await ctx.newPage();
  await pw.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await pw.goto(`http://localhost:${server.port}/index.html`);
  await pw.waitForTimeout(1500);
  await pw.reload(); await pw.waitForTimeout(800);
  check(await pw.evaluate(() => !!navigator.serviceWorker.controller), 'PWA : service worker actif');
  const man = await pw.evaluate(async () => (await (await fetch(document.querySelector('link[rel=manifest]').href)).json()));
  check(man.icons && man.icons.length >= 3 && man.icons.some(i => i.purpose === 'maskable') && man.name === 'Seedrift' && man.start_url === './', 'PWA : manifest valide (icônes dont maskable, nom Seedrift)');
  await ctx.setOffline(true);
  await pw.reload(); await pw.waitForTimeout(800);
  await pw.click('#btnSplashPlay'); await pw.waitForTimeout(400);
  // Nouveau joueur : « Jouer » lance directement le niveau 1.
  if (await pw.evaluate(() => document.querySelector('.screen.active').id) !== 'screen-game') { await pw.click('#btnContinue'); await pw.waitForTimeout(300); }
  check(await pw.evaluate(() => document.querySelector('.screen.active').id) === 'screen-game', 'PWA : jeu lancé hors ligne');
  await ctx.close();
  server.close();

  await browser.close();
  console.log(`\n${checks} vérifications, ${failures} échec(s).`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('✘ ' + (e && e.stack || e)); process.exit(1); });
