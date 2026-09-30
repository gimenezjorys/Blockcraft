# BlockCraft Daily — contexte projet

Jeu de puzzle mobile-first par glissement de blocs : une graine doit atteindre une case cible. Tout tient en **un seul fichier HTML** (`index.html`, avec HTML, CSS et JS inline), sans backend ni dépendance. Le jeu est publié via GitHub Pages.

L'état du produit, les décisions prises, le plan de mesure et les prochaines priorités sont dans **`PRODUCTION_PROGRESS.md`**. Lis-le avant tout chantier important.

## Structure du dépôt

| Chemin | Rôle |
|---|---|
| `index.html` | Le jeu complet, servi tel quel par GitHub Pages. |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA : installation sur l'écran d'accueil et jeu hors ligne. Le service worker est « réseau d'abord » et n'est jamais nécessaire pour jouer. Icônes générées depuis le logo SVG de l'accueil. |
| `scripts/check-game.js` | `node --check` sur le JS extrait, puis `Solver.validateLevels(LEVELS)`. |
| `scripts/test-logic.js` | Tests sans navigateur : symétries des niveaux, générateur du Sentier, défi du jour généré. |
| `scripts/e2e-smoke.js` | Parcours joueur complet dans Chromium (Playwright), plus la PWA hors ligne via un mini-serveur local. Échoue sur toute erreur ou avertissement console. |
| `.github/workflows/ci.yml` | CI : les trois scripts, sur toutes les branches et PR. |
| `PRODUCTION_PROGRESS.md` | Vision, recommandations appliquées, hypothèses, tests, limites, priorités. |
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
- **A15–A18** : utilitaires des mécaniques (portails, sens unique, interrupteurs/portes, portails directionnels).
- **B / B0** : état global (`state.mode` vaut `'campaign'`, `'daily'` ou `'sentier'` ; `state.level` est le plateau courant). Sauvegarde versionnée par `SCHEMA_MIGRATIONS` : toute modification de format passe par une migration.
- **B2 / B3** : série quotidienne (+ gel) et succès. Les succès mesurables utilisent `metric`/`goal` ; les succès à paliers sont dans `TIERED_ACHIEVEMENTS`.
- **C–C6** : audio WebAudio. Aucun son avant le premier geste (`audioUnlocked`). Bus commun (`bus()` : compresseur + réverbération), `voice()` pour toute note ; timbres bois (actions) et verre (récompenses). Musique générative à ambiances (`MUSIC_MOODS`, `setMusicMood`). `BCD_DEV.renderAudioPreview(kind, s)` rend un WAV hors ligne pour régler les niveaux.
- **D** : navigation (`goto`). Les menus reviennent au thème du Monde 1.
- **E** : accueil. **E1** : l'Atelier (cosmétiques : scène d'essai, rareté `RARITIES`, `COSMETIC_CATEGORIES`). **E3** : le Jardin (plantes SVG procédurales). **E2** : paramètres.
- **F** : carte des mondes.
- **G** : `startLevel` → `startBoard(level, opts)`, point d'entrée unique de tout plateau.
- **H** : moteur de glissement, Annuler, détection d'impasse. **H2** : indice. **H3** : fantôme du record (trajets dans `bcd_ghosts_v1`). **I** : entrées (swipe, flèches, Z annuler, R recommencer). Tutoriel visuel : `showSwipeHint` (démo du geste au niveau 1), `spotlightMechanic` (cases de la mécanique présentée qui pulsent).
- **K** : victoire (emblème, puces de récompenses). **L** : défi du jour. **S** : le Sentier (mode infini). **M** : partage (texte type Wordle + carte image). **M3** : vie de l'interface (lucioles, son des boutons).
- `window.BCD_DEV` : outils console (`validateLevels()`, `playLevel(i)`, `solutionFromHere()`, `generateSentierBoard()`, `getRetentionReport()`, `setSimulatedDate()`…).

## Règles de travail

- **Aucun backend.** Tout est local (`localStorage`). Une fonctionnalité qui exige un serveur (ligues, duels, guildes, vrais classements) est un projet d'infrastructure séparé (voir `docs/audit-blockcraft-retention.md`, §0).
- **Jamais de fausses données** montrées au joueur : pas de joueurs ni de rangs simulés (Blueprint §14).
- Le moteur (H), le solveur (A2) et l'aperçu d'indice (`simulateSlidePreserveIdentity`) appliquent **exactement les mêmes règles**. Une nouvelle mécanique s'ajoute aux trois, puis au générateur (`randomLayout`, `stripMechanic`).
- Tout niveau (écrit à la main ou généré) doit passer le solveur : solvable, `par` exact, non trivial sauf tag INTRO. La mécanique vedette d'un plateau généré doit **compter** (sans elle, le par change).
- Le Sentier et le défi n'utilisent que des mécaniques connues du joueur (Sentier) ou expliquées dans la ligne d'aide (défi).
- Si le générateur change de façon incompatible, incrémenter `DAILY_GEN_VERSION`, sinon les défis futurs changent en silence.
- Si tu ajoutes un fichier nécessaire au jeu hors ligne, ajoute-le à `SHELL` dans `sw.js` et incrémente `CACHE`.
- Pas de pay-to-win : les coins ne servent qu'aux cosmétiques, à l'indice et au gel de série.
- Le fichier reste autonome. Seule exception existante : les polices Google, qui retombent sur system-ui. Aucun autre fichier externe (audio, image, CDN).
- Langue du code, des commentaires et de l'interface : français.
