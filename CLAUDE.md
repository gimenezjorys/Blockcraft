# Seedrift (ex-BlockCraft Daily) — contexte projet

Jeu de puzzle mobile-first par glissement de blocs : une graine doit atteindre une case cible. Tout tient en **un seul fichier HTML** (`index.html`, avec HTML, CSS et JS inline), sans backend ni dépendance. Le jeu est publié via GitHub Pages.

L'état du produit, les décisions prises, le plan de mesure et les prochaines priorités sont dans **`PRODUCTION_PROGRESS.md`**. Lis-le avant tout chantier important.

**Nom visible** : `GAME_NAME` (section 0 du script, une ligne) + `manifest.webmanifest` + `<title>` statique. Les identifiants internes gardent le préfixe `bcd` (clés de sauvegarde) : ne jamais les renommer. Choix du nom : `NAMING.md`.

## Structure du dépôt

| Chemin | Rôle |
|---|---|
| `index.html` | Le jeu complet, servi tel quel par GitHub Pages. |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA : installation sur l'écran d'accueil et jeu hors ligne. Le service worker est « réseau d'abord » et n'est jamais nécessaire pour jouer. Icônes : sources SVG dans `icons/src/`, tous les formats (stores, Android adaptive, maskable, favicons) générés par `scripts/export-icons.js` ; planche `scripts/icon-contact-sheet.js` ; choix dans `ICON.md`. |
| `scripts/check-game.js` | `node --check` sur le JS extrait, puis `Solver.validateLevels(LEVELS)`. |
| `scripts/test-logic.js` | Tests sans navigateur : symétries des niveaux, générateur du Sentier, défi du jour généré. |
| `scripts/e2e-smoke.js` | Parcours joueur complet dans Chromium (Playwright), plus la PWA hors ligne via un mini-serveur local. Échoue sur toute erreur ou avertissement console. |
| `.github/workflows/ci.yml` | CI : les trois scripts, sur toutes les branches et PR. |
| `PRODUCTION_PROGRESS.md` | Vision, recommandations appliquées, hypothèses, tests, limites, priorités. |
| `ROADMAP-RETENTION.md` | Audit de rétention, recherche (jeux de référence), décision (Jardin endormi + rituel + pubs récompensées) et feuille de route. |
| `docs/` | Master Blueprint (.docx), audit de rétention, étude de marché. Ce sont des références, pas du code. |

## Vérifier avant chaque commit

```bash
node scripts/check-game.js index.html        # attendu : 60 niveaux, 0 cassé, 4 avertissements
node scripts/test-logic.js                   # attendu : 0 échec
NODE_PATH=$(npm root -g) node scripts/e2e-smoke.js [dossier-captures]   # attendu : 0 échec
```

- Les 4 avertissements ⚠️ de référence sont voulus : ce sont les niveaux INTRO, résolus en 1 coup.
- Pour l'E2E, Playwright doit être disponible (installation globale, ou `npm i --no-save playwright` puis `npx playwright install chromium`).
- Ne déclare jamais une modification « finie » sans avoir lancé ces vérifications.

## Architecture de `index.html` (sections repérées par des bannières `/* ==== */`)

- **A. Niveaux** : `const LEVELS = [...]`, 60 niveaux sur 8 mondes. Le `par` de chaque niveau doit égaler la solution minimale du solveur.
- **A2. Solveur** (`Solver`) : BFS exposant `analyze`, `validateLevels`, `slideState` et `solveNextMove`. Il sert aussi à l'indice, à la détection d'impasse et au générateur.
- **A3. Générateur** (code PUR, testé par `test-logic.js`) :
  - `makeRng` / `hashSeed`, `generateBoard`, `transformLevel` (8 symétries, par conservé), `buildSentierBoard` (avec repli sur un « Écho »).
  - `buildDailyBoard` : défi du jour calculé depuis la date, avec une règle par jour de la semaine (`DAILY_RULES`).
- **A4. Boucle de rétention, logique PURE** (testée par `test-logic.js`) :
  - `GARDEN_ZONES` : 5 zones × 5 chantiers ; `gardenStatus`, `gardenRestoreNext`.
  - Barème `ROSEE` : `roseeForLevelWin`, `roseeForDaily`, `roseeForSentier` (plafond par jour).
  - Rituel : `RITUAL_POOL`, `ritualMissionsFor`, `ritualApply`.
  - Pubs : `AD_PLACEMENTS`, `adCanOffer`.
  - Rétention : `retentionBump`, `retentionSummary`.
  - Chaque lecture passe par un `sanitize*` (données corrompues = valeurs saines).
- **A15–A18** : utilitaires des mécaniques (portails, sens unique, interrupteurs/portes, portails directionnels).
- **B / B0** : état global (`state.mode` vaut `'campaign'`, `'daily'` ou `'sentier'` ; `state.level` est le plateau courant). Sauvegarde versionnée par `SCHEMA_MIGRATIONS` : toute modification de format passe par une migration.
- **B5** : stockage du jardin, du rituel, des pubs et de la rétention (`bcd_garden_v1`, `bcd_ritual_v1`, `bcd_ads_v1`, `bcd_retention_v1`), `addRosee`, `ritualEvent`.
- **B2 / B3** : série quotidienne (+ gel) et succès. Les succès mesurables utilisent `metric`/`goal` ; les succès à paliers sont dans `TIERED_ACHIEVEMENTS`.
- **C–C6** : audio WebAudio. Aucun son avant le premier geste (`audioUnlocked`). Bus commun (`bus()` : compresseur + réverbération), `voice()` pour toute note ; timbres bois (actions) et verre (récompenses). Musique générative à ambiances (`MUSIC_MOODS`, `setMusicMood`). `BCD_DEV.renderAudioPreview(kind, s)` rend un WAV hors ligne pour régler les niveaux.
- **D** : navigation (`goto`). Les menus reviennent au thème du Monde 1.
- **E** : accueil. **E1** : l'Atelier (cosmétiques : scène d'essai, rareté `RARITIES`, `COSMETIC_CATEGORIES`). **E3** : les plantes des mondes (SVG procédural). **E4** : le Jardin endormi (scènes SVG `gardenSceneSVG` avec un id de dégradé unique par rendu ; restauration `restoreNextTask` ; fête de zone ; carte du rituel ; objectif sur l'accueil `renderHomeGarden`). **E2** : paramètres.
- **F** : carte des mondes.
- **G** : `startLevel` → `startBoard(level, opts)`, point d'entrée unique de tout plateau.
- **H** : moteur de glissement, Annuler, détection d'impasse. **H2** : indice. **H3** : fantôme du record (trajets dans `bcd_ghosts_v1`). **I** : entrées (swipe, flèches, Z annuler, R recommencer). Tutoriel visuel : `showSwipeHint` (démo du geste au niveau 1), `spotlightMechanic` (cases de la mécanique présentée qui pulsent).
- **K** : victoire (emblème, puces de récompenses). **L** : défi du jour. **S** : le Sentier (mode infini). **M** : partage (texte type Wordle + carte image). **M3** : vie de l'interface (lucioles, son des boutons). **M4** : `AdService` (pubs récompensées, fournisseur `AD_PROVIDER`, `'mock'` par défaut ; brancher une vraie régie dans `AD_PROVIDERS`).
- `window.BCD_DEV` : outils console (`validateLevels()`, `playLevel(i)`, `solutionFromHere()`, `setRosee(n)`, `setGardenDone(n)`, `getRitual()`, `resetAdCaps()`, `generateSentierBoard()`, `getRetentionReport()`, `setSimulatedDate()`…).

## Règles de travail

- **Aucun backend.** Tout est local (`localStorage`). Une fonctionnalité qui exige un serveur (ligues, duels, guildes, vrais classements) est un projet d'infrastructure séparé (voir `docs/audit-blockcraft-retention.md`, §0).
- **Jamais de fausses données** montrées au joueur : pas de joueurs ni de rangs simulés (Blueprint §14).
- Le moteur (H), le solveur (A2) et l'aperçu d'indice (`simulateSlidePreserveIdentity`) appliquent **exactement les mêmes règles**. Une nouvelle mécanique s'ajoute aux trois, puis au générateur (`randomLayout`, `stripMechanic`).
- Tout niveau (écrit à la main ou généré) doit passer le solveur : solvable, `par` exact, non trivial sauf tag INTRO. La mécanique vedette d'un plateau généré doit **compter** (sans elle, le par change).
- Le Sentier et le défi n'utilisent que des mécaniques connues du joueur (Sentier) ou expliquées dans la ligne d'aide (défi).
- Si le générateur change de façon incompatible, incrémenter `DAILY_GEN_VERSION`, sinon les défis futurs changent en silence.
- Si tu ajoutes un fichier nécessaire au jeu hors ligne, ajoute-le à `SHELL` dans `sw.js` et incrémente `CACHE`.
- Pas de pay-to-win : les coins ne servent qu'aux cosmétiques, à l'indice et au gel de série. La rosée ne s'achète jamais et n'influence ni score, ni étoiles, ni record.
- Pubs : uniquement **récompensées**, proposées par un bouton marqué « PUB », jamais au milieu d'un coup, jamais obligatoires. Tout nouvel emplacement s'ajoute à `AD_PLACEMENTS` (avec un plafond) et passe par `AdService`.
- Le fichier reste autonome. Seule exception existante : les polices Google, qui retombent sur system-ui. Aucun autre fichier externe (audio, image, CDN).
- Langue du code, des commentaires et de l'interface : français.
- **Livraison** : à la fin de chaque amélioration demandée, envoyer à l'utilisateur la dernière version du jeu (`index.html`, et le zip avec la PWA si les fichiers PWA ont changé). Il ne passe pas par GitHub pour jouer.
