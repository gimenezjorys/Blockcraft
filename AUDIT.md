# AUDIT.md — vérification, tests, corrections, allègement, fluidité

Phase de stabilisation : **aucune nouvelle fonctionnalité**, aucun changement de gameplay, de niveau, de prix ou de récompense sans accord. Branche : `audit-stabilisation` (créée depuis `claude/sweet-tesla-mpgsy7`, commit `941fd99`).

Légende : ✅ OK · ⚠️ bug suspect · ❌ bug confirmé · 🟡 incomplet / non testé · 🪦 code mort

## Avancement

| Étape | Statut |
|---|---|
| 1. Inventaire et audit (sans modifier le code) | ✅ fait — **en attente du feu vert** |
| 2. Batterie de tests (`npm test`) | ⏳ |
| 3. Corrections | ⏳ |
| 4. Allègement | ⏳ |
| 5. Fluidité | ⏳ |
| 6. Rapport final + Blueprint | ⏳ |

## Base de comparaison (3 octobre 2026, commit `941fd99`)

**Taille**
| Mesure | Valeur |
|---|---|
| `index.html` | 823 841 octets (13 209 lignes) ; 235 334 octets compressé (gzip -9) |
| dont CSS | 161 969 octets (dont 8 289 de commentaires) |
| dont JS | 625 008 octets (dont ≈ 145 000 de commentaires) |
| dont HTML | 36 864 octets |
| Images en base64 | aucune ; 20 balises `<svg>` dans le HTML, le reste est généré par le code |
| `sw.js` + `manifest.webmanifest` | 1 514 + 763 octets |

**Tests (tous exécutés, sortie réelle)**
| Commande | Résultat | Durée |
|---|---|---|
| `node scripts/check-game.js index.html` | 60 niveaux, 0 cassé, 4 avertissements (INTRO en 1 coup, voulus) | 0,4 s |
| `node scripts/test-logic.js` | 6 730 vérifications, 0 échec | 10,9 s |
| `node scripts/test-dom.js` (jsdom) | 177 vérifications, 0 échec | 1 min 23 s |
| `node scripts/e2e-smoke.js` (Chromium) | 82 vérifications, 0 échec, 0 erreur console | 1 min 41 s |
| `node scripts/e2e-tutorial.js` (Chromium) | 62 vérifications, 0 échec, 0 erreur console | 1 min 14 s |

Pas de `package.json` : `npm test` n'existe pas encore (étape 2).

## Contrôles exécutés pendant l'audit (scripts hors dépôt, sans toucher au code)

| Contrôle | Résultat |
|---|---|
| Dates : `todayKey()` à 7 instants (31/12 → 01/01, changements d'heure de mars et novembre) sous 6 fuseaux (UTC, Pacific/Kiritimati, America/Los_Angeles, Europe/Paris, Pacific/Pago_Pago, Asia/Kathmandu) | ✅ identique partout |
| Défi du jour sur 730 jours (2026-2027) | ✅ 0 repli, 0 plateau invalide, 70 ms au pire |
| Indice (BFS) depuis le départ, pire cas | ✅ niveau 60 : 3,2 ms ; Terres sauvages : 2,4 ms (CPU serveur) |
| Tous les états atteignables (60 niveaux, 120 sauvages, 28 défis) : pièces hors grille ou dans un mur | ✅ aucun |
| Même exploration : **deux pièces sur la même case** | ❌ niveaux 37, 38, 60 et sauvage 62 (voir B1) |
| Mécanique du monde nécessaire (sans elle, le par change) | ❌ 14 niveaux faits main sur 50 concernés (voir B2) |
| Usage de l'heure locale | ✅ une seule fois, voulue : la lumière du ciel du jardin |
| Mentions visibles de « BlockCraft » | ✅ aucune (nom visible : « Seedrift », voir Q1) |

## Inventaire et statut

### Écrans (14) et fenêtres
| Élément | Statut | Déjà testé | Pas encore testé |
|---|---|---|---|
| Lancement (`splash`) | ✅ | jsdom, E2E | — |
| JOUER (`home`) : monde en cours, défi, Sentier, rituel, jardin, « À demain », carte | ✅ | jsdom, E2E | 360×640 automatisé |
| Marché (`market`) : cadeau 7 jours, offre −30 %, lot −25 %, pièces PUB, gel | ⚠️ B4 | jsdom (cadeau, pastilles), E2E | prix affiché = prix débité au passage de minuit |
| Collection (`cosmetics`) : 4 catégories, essai, paliers, objectif d'achat | ✅ | jsdom, E2E | achat en double (double clic) |
| Jardin (`garden`) : panorama 5 zones, chantiers, rosée du matin, météo, plantes, rang, bouquets | ✅ | jsdom, E2E | actions dépendant de l'heure en série (aube → nuit) |
| Profil (`profile`) : Missions / Succès / Stats | ✅ | jsdom, E2E | conformité de chaque succès à sa description |
| Carte des mondes (`select`), Terres sauvages | ✅ | jsdom | — |
| Jeu (`game`) : HUD, Annuler, Indice, Recommencer, Passer (Sentier) | ✅ | jsdom, E2E | rafales de swipes pendant l'animation, rechargement en plein niveau |
| Victoire (`victory`) : ⌂, jardin, suivant, rejouer, partager, chemin parfait, doubler (PUB) | ✅ | jsdom, E2E | rechargement pendant la victoire (pas de double récompense) |
| Résultat du défi (`dailyresult`), Paramètres, Aide, Sentier, fin du Sentier | ✅ | jsdom, E2E | — |
| Fenêtres : Germain (bulle, projecteur), fête de zone, rattrapage de série, pub simulée, rang, toasts | ✅ | jsdom, E2E | — |
| 60 boutons recensés, tous reliés à du code | ✅ | — | — |

### Mondes, mécaniques, niveaux
| Élément | Statut | Notes |
|---|---|---|
| M1 Le Jardin : glissement, murs | ✅ | |
| M2 Les Cailloux : rochers poussés | ✅ | |
| M3 Les Impasses : détection d'impasse | ✅ | murs décoratifs aux niveaux 17 et 22 (B2) |
| M4 Le Givre : ancre | ⚠️ B2 | contournable aux niveaux 27, 29, 30 |
| M5 Les Passages : portails | ❌ B1 / ⚠️ B2 | chevauchement (37, 38) ; contournable aux 35, 36, 38 |
| M6 Les Courants : sens unique | ⚠️ B2 | contournable aux 39, 40, 45 |
| M7 Les Ruines : interrupteurs et portes | ⚠️ B2 | contournable aux 47 à 51 |
| M8 Les Failles : portails directionnels | ❌ B1 | chevauchement (60) |
| 60 niveaux : solvables, par = solution minimale | ✅ | solveur interne ET BFS indépendant (test-logic) |
| Terres sauvages (générées) | ✅ / ❌ B1 | 80 validées par les 2 solveurs ; chevauchement possible (sauvage 62) |
| 4 implémentations du glissement : `trySlide`, `Solver.slideState`, `solveNextMove` (utilise `slideState`), `simulateSlidePreserveIdentity` | 🟡 | 3 boucles recopiées à l'identique (lecture) ; aucun test différentiel automatique |

### Systèmes
| Système | Statut | Déjà testé | Pas encore testé |
|---|---|---|---|
| Annuler, impasse, indice 4 paliers, fantôme, chemin parfait | ✅ | jsdom, E2E | indice pendant une rafale de coups |
| Défi du jour (généré, UTC, rattrapage, gel, minuit) | ✅ | logic, jsdom | changement d'heure et d'année de bout en bout dans le jeu (pas seulement la clé) |
| Sentier (chrono / zen) | ✅ | jsdom, E2E | — |
| Séries, records, succès (dont paliers et secrets) | ✅ | logic, jsdom | « une seule fois » pour chaque succès ; conformité à la description |
| Pièces : gains, dépenses, solde | ⚠️ B4 | jsdom | solde jamais négatif sous rafale ; double achat |
| Cadeau du jour, missions de la semaine, saison, rituel, paliers de collection | ✅ | logic, jsdom | double réclamation par double clic / rechargement |
| Cosmétiques (graines, traînées, victoires, cadres) | ✅ | jsdom, E2E | conservation après rechargement pour chaque catégorie |
| Jardin (rosée, chantiers, croissance, rangs, bon retour, bouquets) | ✅ | logic, jsdom | heure qui recule |
| Sauvegarde : 35 clés, toutes dans `SCHEMA_MIGRATIONS` ; migrations du jardin 1→2→3 | ✅ | jsdom (anciennes sauvegardes, corrompues, plein, interdit) | migration depuis chaque version pour chaque clé |
| Résultats du défi : une clé par jour `bcd_daily_AAAAMMJJ` | ⚠️ B7 | — | — |
| Sons : un seul `AudioContext` (`ac()`), musique générative | ⚠️ B5 | — | iPhone réel |
| Chronomètre (pause en arrière-plan, pendant une pub) | ⚠️ B3 | jsdom (visibilité) | pub + arrière-plan |
| Vibrations (désactivables) | ✅ | jsdom | — |
| Accessibilité : aria-live, clavier, animations réduites, contrastes, cibles 44 px | ⚠️ B6 | E2E (aria-live de Germain), jsdom | annonces du plateau (`gameStatus`), `lostpointercapture` (plateau et hub), focus au changement d'écran |
| PWA hors ligne | ✅ | E2E | appareil réel |
| Tutoriel de Germain | ✅ | E2E, jsdom | — |
| Pubs (fournisseur simulé, plafonds) | ✅ | logic, jsdom | — |

## Bugs et points relevés (étape 1)

| # | Gravité | Constat | Preuve | Proposition |
|---|---|---|---|---|
| B1 | ❌ moyen | **Deux pièces sur la même case** : un portail peut déposer une pièce sur la case d'une pièce pas encore déplacée dans ce coup. Les 3 boucles ont le même défaut. | Exploration exhaustive : niveaux 37 (après ↑ ← → →, deux rochers en (0,3)), 38, 60, sauvage 62 | La sortie de portail est bloquée si **n'importe quelle** pièce l'occupe. Le par de ces niveaux reste identique (vérifié). **C'est un changement de règle : ton accord est nécessaire.** |
| B2 | ❌ conception | Mécanique du monde contournable : 27, 29, 30 (ancre), 35, 36, 38 (portails), 39, 40, 45 (sens unique), 47 à 51 (interrupteurs) ; murs décoratifs : 17, 22 | `mechanicMatters` sur les 60 niveaux | Retoucher ces niveaux change le jeu : **ta décision** (corriger les niveaux, ou accepter ces exceptions et les documenter dans le test). |
| B3 | ⚠️ mineur | Chronomètre : app en arrière-plan pendant une pub en partie → deux intervalles, dont un jamais arrêté | Lecture (3 copies du même code de relance) | Une seule fonction de relance qui vérifie l'intervalle existant ; test d'abord. |
| B4 | ⚠️ mineur | Marché : l'offre du jour et le lot sont recalculés au clic ; écran ouvert après minuit (ou objet acheté ailleurs) → un autre objet, à un autre prix que celui affiché | Lecture de `renderDailyOffer` / `renderWeeklyPack` | Vérifier au clic que l'offre affichée est toujours la même, sinon rafraîchir sans acheter. |
| B5 | ⚠️ à confirmer | Son sur iPhone : déverrouillage au 1er `pointerdown` puis écouteur retiré même si la reprise échoue (iOS exige souvent `touchend`/`click`) | Lecture | Garder l'écouteur (pointerup, touchend, click, keydown) tant que le contexte n'est pas « running ». Non vérifiable sans iPhone. |
| B6 | ⚠️ accessibilité | Double annonce à chaque coup (`hudMoves` en aria-live + « Coup N. ») ; un message identique n'est pas répété (« Mouvement bloqué. » deux fois) ; aucun focus déplacé au changement d'écran | Lecture | `hudMoves` en aria-live « off » ; forcer la ré-annonce ; focus sur le titre de l'écran. |
| B7 | ⚠️ mineur | Une clé `bcd_daily_AAAAMMJJ` par jour joué, jamais purgée (≈ 70 Ko/an) | Lecture | Purge des jours de plus de 60 jours (l'historique a sa propre clé). |
| B8 | 🪦 | `repro-garden.png` commité à la racine par erreur | `git log` | Supprimer. |
| B9 | 🪦 | CSS mort : `coins-badge`, `cosmetic-card*`, `cosmetic-swatch`, `cosmetics-grid`, `cosmetics-section-title`, `daily-banner`, `equipped-label`, `gz-locked`, `gz-scene`, `hint-arrow` ; anciens journaux d'audit en commentaires (fin du fichier, parfois faux aujourd'hui) | Recherche des classes | Supprimer. |
| B10 | 🟡 | `watchAdFor` avale les erreurs de `grant()` en silence | Lecture | Journaliser l'erreur au lieu de l'ignorer. |

## Questions en attente

- **Q1 — Nom du jeu** : le nom visible est « Seedrift » (`GAME_NAME`, choisi dans `NAMING.md`). Tu écris « Seed Blist ». Faut-il renommer le jeu visible en « Seed Blist » (titre, logo, manifest, icône), ou garder « Seedrift » ?
- **Q2 — B1** : corriger la règle des portails (aucun par ne change) ?
- **Q3 — B2** : retoucher les 14 niveaux (+ 2 aux murs décoratifs), ou les garder et documenter l'exception ?
- **Q4 — Fusion** : à la fin, fusionner `audit-stabilisation` dans `claude/sweet-tesla-mpgsy7` (la branche de travail), ou dans `main` ?
