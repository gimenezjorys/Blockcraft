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
| `scripts/test-logic.js` | Tests sans navigateur : symétries des niveaux, générateur du Sentier, défi du jour généré, logique pure du jardin vivant et du hub (cadeau, missions de la semaine, saison, marché, collection, pastilles). |
| `scripts/test-dom.js` | Le jeu complet dans **jsdom** avec de vrais `KeyboardEvent`/`PointerEvent` : écran de lancement, nouveau joueur, ancienne sauvegarde, dates UTC, rosée, rattrapage, pubs, **hub** (glissement entre pages, onglets, clavier, bouton retour), **aucun glissement de navigation en partie**, **pastilles** qui apparaissent et disparaissent, mise à jour d'une sauvegarde d'avant le hub, **chemin parfait**, sauvegarde d'avant la refonte (cosmétiques conservés, annonce du nouveau look). |
| `scripts/e2e-smoke.js` | Parcours joueur complet dans Chromium (Playwright), servi en **http** par un mini-serveur local (en `file://`, Chromium perd parfois le localStorage au rechargement), plus la PWA hors ligne. Échoue sur toute erreur ou avertissement console. |
| `scripts/e2e-tutorial.js` | Tutoriel de Germain (en http aussi) : lancement → « Jouer », visites des onglets de la barre du bas (Jardin, Collection, Défi, Marché avec le cadeau, Profil), reprise après fermeture, joueur existant, « Passer », retour arrière, cible absente, animations réduites, stockage corrompu. |
| `NAMING.md`, `ICON.md`, `ONBOARDING.md` | Choix du nom (preuves de recherche), de l'icône (variantes, exports) et principes du tutoriel. |
| `.github/workflows/ci.yml` | CI : check-game, test-logic, test-dom (jsdom), e2e-smoke, e2e-tutorial, sur toutes les branches et PR. |
| `PRODUCTION_PROGRESS.md` | Vision, recommandations appliquées, hypothèses, tests, limites, priorités. |
| `ROADMAP-RETENTION.md` | Audit de rétention, recherche (jeux de référence), décision (Jardin endormi + rituel + pubs récompensées) et feuille de route. |
| `docs/` | Master Blueprint (.docx), audit de rétention, étude de marché. Ce sont des références, pas du code. |

## Vérifier avant chaque commit

```bash
node scripts/check-game.js index.html        # attendu : 60 niveaux, 0 cassé, 4 avertissements
node scripts/test-logic.js                   # attendu : 0 échec
node scripts/test-dom.js                     # attendu : 0 échec (jsdom : npm i --no-save jsdom, ou NODE_PATH)
NODE_PATH=$(npm root -g) node scripts/e2e-smoke.js [dossier-captures]   # attendu : 0 échec
NODE_PATH=$(npm root -g) node scripts/e2e-tutorial.js [dossier-captures] # attendu : 0 échec
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
- **A6. Jardin vivant, logique PURE** (testée par `test-logic.js`) : `gardenTimeOfDay` (heure locale → aube/jour/crépuscule/nuit), `gardenWeatherFor` (météo du jour, UTC), rosée du matin (`DEW`, `dewTotalFor`, `dewCollect`, `dewSpotsFor`), croissance (`plantGrowthEvents`), rangs (`GARDENER_RANKS`, `gardenerXP`, `gardenerRank`), rattrapage de série (`streakRepairStatus`, `streakApplyRepair`), `streakAlive`, `welcomeBackDue`, `interstitialAllowed`, `sanitizeTips`.
- **A7. Hub, logique PURE** (testée par `test-logic.js`) : semaine (`weekKeyFor`, lundi UTC) et saison (`seasonKeyFor`, mois UTC) ; cadeau du jour (`DAILY_GIFTS`, `giftStatus`, `giftClaim` : 7 cadeaux, un jour manqué ne fait rien perdre) ; missions de la semaine (`WEEKLY_POOL`, `weeklyMissionsFor`, `weeklyApply`, `weeklyClaim`, coffre) ; passe de saison gratuit (`SEASON_TIERS`, `SEASON_XP`, `seasonReward`, `seasonRoll` rend les paliers non récupérés) ; marché (`marketDailyOffer`, `marketWeeklyPack`) ; `collectionMilestones` ; `navBadgeCounts` ; `dailyPersonalRank` (comparaison avec soi-même uniquement).
- **A5. Tutoriel de Germain, logique PURE** : `COACH_LINES` (toutes les répliques, structure prête à traduire, 12 mots max), `coachLine`, `sanitizeTutorial` (dont `look2` : annonce du nouveau look déjà faite), `TUTO_TOURS` (`garden`, `shop`, `daily`, `market`, `profile`), `tutorialNextTour` (quel onglet présenter, et quand), `tutorialNudgeDue` (rappel du défi), `tutorialTourFailed` (abandon propre après 2 échecs).
- **A15–A18** : utilitaires des mécaniques (portails, sens unique, interrupteurs/portes, portails directionnels).
- **Dates : toutes en UTC** (`dateKeyFor`, `utcDayOffset`, `getUTCDay`). L'heure LOCALE ne sert qu'à la lumière du ciel du jardin. Une clé de série « du futur » (héritée de l'heure locale) compte comme aujourd'hui.
- **B / B0** : état global (`state.mode` vaut `'campaign'`, `'daily'` ou `'sentier'` ; `state.level` est le plateau courant). Sauvegarde versionnée par `SCHEMA_MIGRATIONS` : toute modification de format passe par une migration.
- **B6** : stockage du hub (`bcd_gift_v1`, `bcd_weekly_v1`, `bcd_season_v1`, `bcd_market_v1`, `bcd_nav_v1`), `grantBundle`, `claimDailyGift`, `weeklyEvent`, `seasonGain`, `hubGameEvent` (appelé par `ritualEvent` : un seul point d'entrée pour les événements de jeu).
- **B5** : stockage du jardin (schéma 2 : rosée du matin, plantes vues, rang vu, bon retour, rattrapage), du rituel, des pubs et de la rétention (`bcd_garden_v1`, `bcd_ritual_v1`, `bcd_ads_v1`, `bcd_retention_v1`), `addRosee`, `ritualEvent`.
- **B2 / B3** : série quotidienne (+ gel) et succès. Les succès mesurables utilisent `metric`/`goal` ; les succès à paliers sont dans `TIERED_ACHIEVEMENTS`.
- **C–C6** : audio WebAudio. Aucun son avant le premier geste (`audioUnlocked`). Bus commun (`bus()` : compresseur + réverbération), `voice()` pour toute note ; timbres bois (actions) et verre (récompenses). Musique générative à ambiances (`MUSIC_MOODS`, `setMusicMood`). `BCD_DEV.renderAudioPreview(kind, s)` rend un WAV hors ligne pour régler les niveaux.
- **D** : navigation (`goto`). Les menus reviennent au thème du Monde 1. Ouverture sur l'**écran de lancement** (`#screen-splash` : logo, ambiance du jardin, aperçus `renderSplash`, bouton « Jouer » `#btnSplashPlay`), puis le **hub**. `state.screen` garde des noms logiques : `'splash'`, les pages du hub, et les écrans par-dessus (`select`, `game`, `victory`, `dailyresult`, `settings`, `help`, `sentier`, `sentierend`). `goto('achievements')` ouvre le Profil sur « Succès ».
- **D2** : bouton retour du téléphone : une entrée d'historique « ancre » (`historyAnchor`). Écran par-dessus → son bouton retour ; page du hub → JOUER ; JOUER → lancement ; lancement → on laisse sortir. Une fenêtre ouverte (fête, rattrapage) se ferme d'abord.
- **D3. Le hub** (`Hub`) : 5 pages côte à côte `HUB_PAGES = ['market', 'cosmetics', 'home', 'garden', 'profile']` (Marché, Collection, **Jouer au centre**, Jardin, Profil), piste en `translate3d` pilotée par PointerEvent (verrou horizontal, seuil 20 % ou pichenette 0,45 px/ms, ressort aux bouts, toucher annulé après un glissement, `touch-action:pan-y`). Barre d'onglets `#tabbar` (`#tabMarket`, `#tabCollection`, `#tabPlay`, `#tabGarden`, `#tabProfile`, pastilles `.tab-badge`), flèches/Début/Fin au clavier, 2e toucher = retour en haut. Zones exclues : `[data-hub-noswipe]` (panorama du jardin, piste de saison), et toute fenêtre ouverte (projecteur de Germain, fête, pub). **Le hub est masqué pendant une partie** : aucun glissement de navigation possible en jeu. `hubRenderPage` (contenu à jour à l'arrivée), `hubPageArrived` (aides de page, objets vus). Les pages hors écran ont leurs animations en pause (`aria-hidden`), les tableaux du jardin ne sont reconstruits que si leur contenu a changé.
- **E5** : le **Jardin vivant** (panorama) : `gpContext`, `gpSkySVG` (ciel, étoiles = étoiles gagnées), `gpPanelSVG(zi, ctx, opts)` (un tableau par zone : collines continues, scène E4 agrandie, avant-plan, plantes `gpSpeciesArt`/`gpPlantBed`, animaux `gpCritter`, rosée, Germain), `gpGarlandHTML` (7 derniers défis), `gpWeatherHTML`, `renderGardenPanorama` (tableaux construits un par un), `gpScrollToZone`, `gpPointPx`, `gpCollectDew`, `gpPlantBadgeSVG` (carte des mondes, victoire). Toute animation SVG porte sur un `<g>` SANS attribut `transform` (sinon le CSS l'écrase). Les tableaux hors écran sont en pause.
- **E6. Pages du hub** : `renderMarket` (cadeau du jour sur 7 jours, offre du jour −30 %, lot de la semaine −25 %, pièces contre une PUB, gel de série), `renderCollectionExtras` (progression, paliers de collection, « Nouveau »), `renderMissions` (rituel, missions de la semaine, passe de saison `renderSeasonCard`), `navContext`/`updateNavBadges` (pastilles), `navInit` (à la mise à jour, l'existant est « vu »), `renderWorldHero` (page JOUER), `renderSplash`, `homeArrived` (cadeaux et fêtes en attente : jamais sur l'écran de lancement).
- **E** : page JOUER (monde en cours, défi du jour, Sentier, rituel, vignette du jardin, carte des mondes). **E1** : l'Atelier (cosmétiques : scène d'essai, rareté `RARITIES`, `COSMETIC_CATEGORIES`). **E3** : les plantes des mondes (SVG procédural). **E4** : le Jardin endormi (scènes SVG `gardenSceneSVG` avec un id de dégradé unique par rendu ; restauration `restoreNextTask` ; fête de zone ; carte du rituel ; objectif sur l'accueil `renderHomeGarden`). **E2** : paramètres.
- **F** : carte des mondes.
- **G** : `startLevel` → `startBoard(level, opts)`, point d'entrée unique de tout plateau.
- **H** : moteur de glissement, Annuler, détection d'impasse. **H2** : indice. **H3** : fantôme du record (trajets dans `bcd_ghosts_v1`). **I** : entrées (swipe, flèches, Z annuler, R recommencer). Tutoriel visuel : `showSwipeHint` (démo du geste au niveau 1), `spotlightMechanic` (cases de la mécanique présentée qui pulsent).
- **K** : victoire (emblème, puces de récompenses). **L** : défi du jour. **S** : le Sentier (mode infini). **M** : partage (texte type Wordle + carte image). **M3** : vie de l'interface (lucioles, son des boutons). **M4** : `AdService` (pubs récompensées, fournisseur `AD_PROVIDER`, `'mock'` par défaut ; brancher une vraie régie dans `AD_PROVIDERS`).
- **T2** : aides contextuelles `showTipOnce(id, texte)` (clé `bcd_tips_v1`) et bon retour (`grantWelcomeBack`).
- **Ambiance des mondes** : `renderWorldAmbience(world)` (appelé par `applyWorldTheme`) : décor `worldArtSVG`, lumière `--amb-halo`, particules `.wp-*`. Couleurs d'un monde : `WORLD_THEMES` (bgA/bgB, tray/trayEdge, tile/tileEdge, accent, deco1/deco2) → `worldVars(theme)` → `setWorldVars(el, world)` (variables `--bg-a`, `--bg-b`, `--tray`, `--tray-edge`, `--tile`, `--tile-edge`, `--world-accent`, `--hill-1`, `--hill-2`).

## Direction artistique « Verger au soleil »

- **Tout passe par les variables de `:root`** (début du `<style>`) : palette (`--paper*`, `--sun-*`, `--ink*`, `--coral`, `--teal`, `--sunny`, `--sky`, `--berry`, `--leaf`, `--danger`, chacune avec `-hi`/`-lo`/`-ink` si besoin), relief (`--sh-soft`, `--sh-card`, `--sh-pop`), rayons (`--r-s`…`--r-xl`), mouvement (`--spring`, `--ease`). Pas de couleur en dur dans un nouveau composant. Anciens noms gardés comme alias (`--gold`, `--cream`, `--cream-dim`, `--seed`).
- **Style « pâte »** : bord épais plus sombre en dessous (`box-shadow: 0 4–6px 0`), ombre douce tiède, reflet en haut ; pressé = `translateY`. Fond crème clair, texte prune (`--ink`), jamais de noir pur ni de dominante verte.
- **Mécaniques** : leurs couleurs (`--wall*`, `--rock*`, `--goal*`, `--anchor*`, `--portal-*`, `--oneway*`, `--switch*`, `--door-*`) ne changent pas d'un monde à l'autre, et chacune a **sa forme et son symbole** (lisible sans les couleurs). Une nouvelle mécanique doit rester reconnaissable en niveaux de gris.
- **Un élément cliquable n'anime jamais `transform`** en boucle (pulsation par `box-shadow`) : sinon Playwright le juge instable et le toucher rate.
- **Contraste** : texte blanc seulement sur les teintes `-lo` (corail foncé, ciel foncé…) ; vérifier ≥ 4,5:1 pour le texte courant.
- **Cosmétiques** : chaque graine a une matière CSS (`.fx-<id>` sur la pièce, variables `--seed-skin-light/mid/deep`) ; raretés `RARITIES` (commun gris chaud, rare ciel, épique baie, légendaire soleil), classe `r-<rareté>` sur l'étiquette et la scène d'essai. On ne renomme jamais l'`id` d'un cosmétique (sauvegardes).
- **Son** : `clay()` (timbre « pâte ») pour l'interface, verre pour les récompenses.
- **Chemin parfait** (`playPerfectPath`, bouton `#btnPerfectPath` de la victoire, campagne, moins de 3 ★) : rejoue `Solver.solveNextMove(...).path` avec `simulateSlidePreserveIdentity`, puis restaure le plateau et rend la main.
- **T** : Germain et le tutoriel (exécution). `Coach` : personnage SVG, bulle (texte rapide, toucher pour accélérer), projecteur (4 bandes sombres autour de la vraie cible). `Tutorial` : intro → niveau 1 guidé → mini-scènes des mécaniques (remplacent l'aide texte, sauf si le tutoriel est passé) → visite des onglets un par un avec cadeau → succès « Apprenti » → rappel du défi le lendemain ; nouveautés pour les joueurs existants. Branché dans `goto` (`Tutorial.onScreen`), `startBoard`, `performMove`, l'impasse et `onWin`. Clé `bcd_tutorial_v1`.
- `window.BCD_DEV` : outils console (`validateLevels()`, `playLevel(i)`, `solutionFromHere()`, `setRosee(n)`, `setGardenDone(n)`, `getRitual()`, `resetAdCaps()`, `getTutorial()`, `setTutorial(patch)`, `tutorialKick()`, `coachText()`, `generateSentierBoard()`, `getRetentionReport()`, `setSimulatedDate()`, hub : `getGift()`, `getWeekly()`, `getSeason()`, `getMarket()`, `getNav()`, `navBadges()`, `hubPage()`, `addSeasonXP(n)`, `grantCosmetic(cat, id)`…).

## Règles de travail

- **Aucun backend.** Tout est local (`localStorage`). Une fonctionnalité qui exige un serveur (ligues, duels, guildes, vrais classements) est un projet d'infrastructure séparé (voir `docs/audit-blockcraft-retention.md`, §0).
- **Jamais de fausses données** montrées au joueur : pas de joueurs ni de rangs simulés (Blueprint §14).
- Le moteur (H), le solveur (A2) et l'aperçu d'indice (`simulateSlidePreserveIdentity`) appliquent **exactement les mêmes règles**. Une nouvelle mécanique s'ajoute aux trois, puis au générateur (`randomLayout`, `stripMechanic`).
- Tout niveau (écrit à la main ou généré) doit passer le solveur : solvable, `par` exact, non trivial sauf tag INTRO. La mécanique vedette d'un plateau généré doit **compter** (sans elle, le par change).
- Le Sentier et le défi n'utilisent que des mécaniques connues du joueur (Sentier) ou expliquées dans la ligne d'aide (défi).
- Si le générateur change de façon incompatible, incrémenter `DAILY_GEN_VERSION`, sinon les défis futurs changent en silence.
- Si tu ajoutes un fichier nécessaire au jeu hors ligne, ajoute-le à `SHELL` dans `sw.js` et incrémente `CACHE`.
- Pas de pay-to-win : les coins ne servent qu'aux cosmétiques, à l'indice et au gel de série. La rosée ne s'achète jamais et n'influence ni score, ni étoiles, ni record.
- Pubs : uniquement **récompensées**, proposées par un bouton marqué « PUB », jamais au milieu d'un coup, jamais obligatoires. Tout nouvel emplacement s'ajoute à `AD_PLACEMENTS` (avec un plafond) et passe par `AdService` / `showRewardedAd`. `showInterstitial` existe comme point d'accroche mais reste **désactivé** (`INTERSTITIAL_ENABLED`) : ne l'activer que sur décision explicite, avec les règles de `interstitialAllowed`.
- **Navigation** : rien dans le coin en haut à droite, sauf la roue dentée des Paramètres (et « ? » pour l'aide). Toute nouvelle page du hub s'ajoute à `HUB_PAGES`, à la barre d'onglets, à `hubRenderPage`/`hubPageArrived`, à `navBadgeCounts` si elle a des pastilles, et à son aide de page. Une zone qui défile à l'horizontale porte `data-hub-noswipe`. Le glissement de navigation ne doit **jamais** agir pendant une partie. Une bulle de Germain en bas se pose au-dessus de la barre d'onglets.
- **Pastilles** : seulement pour une vraie action (cadeau, récompense à récupérer, objet neuf, défi du jour) ; elles disparaissent dès que c'est fait ou vu. Jamais de fausse urgence.
- **Toute nouvelle fonctionnalité** a son aide contextuelle (`showTipOnce` + réplique dans `COACH_LINES`), montrée une fois, passable, quel que soit l'ordre de découverte.
- **Toute nouvelle clé de stockage** est enregistrée dans `SCHEMA_MIGRATIONS` ; un changement de format passe par une migration qui n'écrase jamais une valeur existante.
- Le fichier reste autonome. Seule exception existante : les polices Google, qui retombent sur system-ui. Aucun autre fichier externe (audio, image, CDN).
- Langue du code, des commentaires et de l'interface : français.
- **Tutoriel** : toute nouvelle réplique de Germain va dans `COACH_LINES` (12 mots max, tutoiement, jamais culpabilisant). « Passer » reste visible tant que le tutoriel est actif ; une étape ne doit jamais bloquer (cible absente, changement d'écran = annulation propre).
- **Livraison** : à la fin de chaque amélioration demandée, envoyer à l'utilisateur la dernière version du jeu (`index.html`, et le zip avec la PWA si les fichiers PWA ont changé). Il ne passe pas par GitHub pour jouer.
