# BlockCraft Daily — suivi de production

*Dernière mise à jour : 30/09/2026. Sources : `index.html` (vérité technique), `docs/audit-blockcraft-retention.md` et `docs/BlockCraft_Daily_Master_Blueprint.docx` (vérité produit).*

## 1. Vision synthétisée

- **Promesse** (Blueprint §1.1) : « Un petit puzzle que tu comprends en quelques secondes, mais que tu peux passer des mois à maîtriser. »
- **Public** : joueurs mobiles casual et puzzle, en sessions courtes (30 s à 3 min par plateau).
- **Émotion recherchée** : le « déclic » de trouver la solution la plus courte, dans une ambiance cozy et nature.
- **Singularité** (audit §9, « le truc ») : chaque plateau a une solution parfaite **prouvée** par un vrai solveur. Le jeu *sait* si tu as été parfait.
- **Piliers** : lisibilité, maîtrise, satisfaction, progression, respect (pas de pay-to-win ni de fausses données), légèreté (un seul fichier, aucun serveur).

**Boucles de jeu :**

| Échelle | Boucle |
|---|---|
| Seconde | Glisser, voir les pièces glisser puis se tasser à l'arrêt. |
| Plateau | Viser le par : la jauge ★★★ du HUD montre les étoiles encore possibles. Annuler est gratuit. |
| Session | Niveau suivant, défi du jour, parties du Sentier (3 min). |
| Semaine | Série quotidienne, règle du jour qui change chaque jour, 7 pastilles de la semaine. |
| Mois | Jardin (8 plantes et une prairie), succès évolutifs, records du Sentier. |

**Contrainte structurante** (audit §0) : pas de backend. Ligues, duels, guildes et vrais classements restent hors du périmètre, par décision de conception et non par oubli.

## 2. Recommandations de rétention appliquées

| Recommandation (audit) | Traduction concrète | Quand | Vérification | Garde-fou |
|---|---|---|---|---|
| §5 Mode Infini de Maîtrise (priorité n°1) | **Le Sentier** : plateaux générés à partir d'une graine et validés par le solveur. Modes Chrono 3 min (points × série jusqu'à ×5, +10 s par solution parfaite) et Zen. | Après le Monde 1 (8 niveaux) | `test-logic.js` (générateur), E2E (score 60 / ×4, fin de partie) | Seulement des mécaniques déjà vues ; la mécanique vedette doit compter (sinon le plateau est rejeté) |
| §9 Défi miroir | « Échos » : un niveau connu tourné ou retourné (tous les 6 plateaux, et en repli si la génération échoue) | Sentier | 480 symétries vérifiées : par conservé | Jamais la transformation identité |
| §6 LiveOps sans production | Défi du jour **généré à partir de la date** avec une règle du jour (lundi Racines… dimanche Grand défi) | Chaque jour | 400 jours générés, déterministes, tous distincts | Même plateau pour tous le même jour |
| §4 Boucle hebdomadaire passive | **Coffre de la semaine** : 5 défis réussis du lundi au dimanche rapportent +25 🪙, une fois par semaine. Progression affichée dans le résultat du défi. | Chaque semaine | E2E : coffre ouvert au 5e défi, une seule fois | 5 défis sur 7 : deux jours de marge |
| §8 Méta légère (leçon Royal Match) | **Le Jardin** : 8 plantes en SVG (graine → fleur) et une prairie du Sentier (1 fleur toutes les 5 solutions parfaites) | Accueil, écran de victoire, fin de partie du Sentier | E2E : Monde 1 à 3★ = « En fleur » | Dérivé des données existantes, aucune nouvelle donnée |
| §3 Succès récurrents | Progression visible (« 10 / 20 ») et succès à paliers « Maître du par I–V » | Écran Succès, puces de victoire | E2E | Récompenses en coins modestes |
| §3 Mise en scène du « presque complet » | Barres de progression, prochain objectif par plante, record à battre | Partout | Visuel | — |
| §7 Fantôme du par | Ligne de maîtrise en victoire : « Solution parfaite : N coups, prouvée par le solveur » | Victoire | E2E | Ne révèle jamais le chemin |
| §7 Fantôme de soi-même | Une graine translucide rejoue le **meilleur essai** au rythme réel. Puce « Fantôme battu » en victoire. Désactivable. | Rejeu d'un niveau, retentative du défi | E2E : affiché, battu, signalé | Jamais une pièce ; il ne bloque rien |
| §9 Carnet de maîtrise | « À un coup du parfait » en tête de la carte des mondes : les niveaux à 2★, en raccourcis | Carte des mondes | Vérifié par capture | Au plus 8 raccourcis affichés |
| §12 Mode Zen | Sentier Zen (sans chrono ni score) | Sentier | E2E | — |
| Blueprint §14 : pas de fausses données | Joueurs et rang **simulés supprimés** du défi | Résultat du défi | E2E (texte absent) | — |

**Non appliqué (et pourquoi) :**
- *Ligue Fantôme* (§3) : risque de doublon avec « Maître du par » et le record du Sentier. Reporté.
- *Rattrapage de série après coup* : le gel de série existe déjà. Reporté.

## 3. Hypothèses prises

- **Déblocage du Sentier après le Monde 1** : le joueur maîtrise alors glissement et murs, et le Sentier devient visible comme objectif dès la 1re minute.
- **Chrono de 3 min + 10 s par solution parfaite** : durée de session visée par l'étude (> 3 min). À calibrer en test joueur.
- **Annuler gratuit et illimité**, avec un compteur de coups égal au chemin actuel. Les étoiles se gagnent en réfléchissant ; dans le Sentier Chrono, le temps est le vrai coût.
- **Défi du jour sur la date locale** (modèle Wordle), comme la série. Deux fuseaux différents peuvent donc jouer deux plateaux différents au même instant.
- **Coins du Sentier** : 1 coin par tranche de 20 points (Chrono uniquement) pour éviter de vider l'économie cosmétique.
- **Filtre de qualité** : un nombre minimal d'états explorés par le solveur sert de mesure de la richesse des décisions (seuil plafonné sans rocher).

## 4. Modifications réalisées

- **Boucle cœur** :
  - Annuler (bouton, touches Z/U/Retour arrière) et Recommencer (touche R).
  - Détection d'impasse prouvée, avec Annuler mis en avant.
  - HUD « Par » et jauge ★★★ ; ligne d'aide sous la grille.
  - Tutoriel joué sur les niveaux 1 à 3 ; mécanique découverte affichée pendant tout le niveau.
  - Compression des pièces à l'arrêt.
  - **Bug corrigé** : pendant l'arrivée gagnante, la graine sautait au coin haut-gauche (`var(--tx)` jamais défini).
- **Victoire** :
  - Titre selon les étoiles, ligne de maîtrise, étoiles dorées révélées une à une avec un son chacune.
  - Récompenses en puces (plus de toasts empilés sur l'emblème).
  - « Record » seulement en cas d'amélioration réelle.
  - Bouton suivant explicite, « Viser ★★★ » si la solution n'est pas parfaite.
- **Accueil** :
  - JOUER lance directement le prochain niveau.
  - Cartes d'état Défi du jour et Sentier ; stats sur une ligne ; bande du Jardin.
  - **Achat accidentel supprimé** : la pastille 🧊 dépensait 30 coins au simple toucher.
- **Défi du jour** : plateau généré, résultat honnête (par, 7 pastilles de la semaine, prochain défi), partage texte type Wordle, gel de série avec achat explicite.
- **Le Sentier**, **Le Jardin**, **succès évolutifs** : voir §2.
- **Audio** :
  - Aucun AudioContext créé avant le premier geste.
  - **Bug corrigé** : la musique d'ambiance, activée par défaut, n'était jamais démarrée.
  - Audio suspendu en arrière-plan.
- **Accessibilité** : réglage « Animations réduites » et respect de `prefers-reduced-motion`, focus clavier visible, adaptation aux écrans courts (360×640 sans défilement).
- **Robustesse** :
  - Les plateaux résolus du Sentier sont enregistrés même si la page se ferme en pleine partie.
  - File des toasts plafonnée et vidée en entrant en jeu.
  - Menus remis sur le thème de référence.
  - Carte des mondes ouverte sur le niveau en cours, avec une barre du haut collante.
  - Succès vérifiés au démarrage : ceux déjà mérités apparaissent après une mise à jour.
  - Détection d'impasse différée après le début de l'animation. Mesure : pire cas 8,8 ms sur ordinateur (niveau 60) ; pas de latence avant le glissement.
- **Partage image** :
  - **Bug corrigé (préexistant)** : `ctx.font` avec « Baloo 2 » sans guillemets était ignoré ; le titre sortait en 10 px, le temps et le par étaient minuscules.
  - Nouveau logo sur la carte et accroche de marque.
- **Analytics locale** : sessions, tutoriel, annuler, impasse, abandons, Sentier, Jardin. Rapport disponible via `BCD_DEV.getRetentionReport()`.
- **Identité** : nouveau logo SVG qui raconte la mécanique (une graine qui glisse vers la lumière, appuyée sur un bloc). Il suit le skin équipé. Remplace un carré générique.
- **PWA** :
  - `manifest.webmanifest`, icônes générées depuis le logo, `sw.js` « réseau d'abord ».
  - Jeu installable et jouable hors ligne sur GitHub Pages ; aucun effet en `file://`.

## 5. Tests exécutés (résultats observés)

| Commande | Ce qu'elle vérifie | Résultat |
|---|---|---|
| `node scripts/check-game.js index.html` | `node --check` + solveur sur les 60 niveaux | 60 niveaux, 0 cassé, 4 avertissements (INTRO en 1 coup, voulu) |
| `node scripts/test-logic.js` | 480 symétries ; générateur (7 mécaniques × 5 paliers) ; parties simulées ; 400 défis | 3 543 vérifications, 0 échec |
| `NODE_PATH=$(npm root -g) node scripts/e2e-smoke.js [captures]` | Parcours joueur complet dans Chromium, plus le fantôme, la PWA hors ligne et le coffre de la semaine | 44 vérifications, 0 échec, 0 erreur ou avertissement console |
| CI GitHub Actions | Les trois suites, sur toutes les branches | Vert |

Vérifications visuelles faites par captures : 390×844 et 360×640, sur l'accueil, le jeu, la victoire, le défi, le Sentier, le Jardin et les succès.

## 6. Plan de mesure (tests joueurs)

À lire en fin de session de test : `BCD_DEV.getRetentionReport()` dans la console du navigateur.

| Question | Événement(s) | Hypothèse testée | Résultat espéré | Risque d'interprétation |
|---|---|---|---|---|
| Activation | `tutorial_start` / `tutorial_end`, `secondsToFirstWin` | JOUER direct + tutoriel joué = 1re victoire rapide | 1re victoire < 30 s, tutoriel fini > 90 % | Un testeur briefé à l'avance fausse le temps |
| Compréhension | `stuck`, `undo`, `hint_used`, `level_quit` | L'impasse dite + Annuler réduisent les abandons | Moins de `level_quit` après un `stuck` | Beaucoup d'Annuler peut aussi signifier de l'exploration, pas de la confusion |
| Engagement | `level_complete`, `level_restart`, `level_replay` | « Viser ★★★ » pousse à rejouer | Taux de rejeu > 15 % des victoires à moins de 3★ | Le rejeu peut venir des coins, pas de la maîtrise |
| Profondeur | `sentier_start`, `sentier_board_complete`, `sentier_end.score` | Le Sentier comble le trou des 10 minutes | Plus d'une partie par session chez les joueurs du Monde 2 et au-delà | Effet nouveauté les premiers jours |
| Retour | `session_start.daysSince`, `daily_complete`, `garden_open` | Défi généré + Jardin donnent une raison de revenir | J1 > 30 %, J7 > 12 % (seuils du Blueprint §29) | Échantillon local trop petit : ce sont des tendances, pas des statistiques |
| Viralité | `share` (texte ou image, résultat) | Le texte type Wordle est plus partagé que l'image | Partage > 5 % des sessions | `navigator.share` indisponible sur ordinateur |

## 7. Limites restantes

- **Pas de backend** : pas de classement réel, pas de notifications de rappel (il faudrait un service de push).
- **Défi du jour lié au code** : il dépend de la version du générateur. Changer celui-ci change les défis futurs ; `DAILY_GEN_VERSION` permet de le rendre explicite.
- **Qualité ressentie des plateaux générés** : elle n'est mesurée que par des proxys (par, états explorés, mécanique qui compte). Elle n'a pas été validée par de vrais joueurs.
- **Non testé** sur appareils physiques (iOS Safari, Android ancien), ni avec un lecteur d'écran réel.
- **Équilibrage à calibrer en test** : chrono, bonus de temps et coins du Sentier.
- **Blueprint non couvert** : les mondes 9 et 10 (mécaniques non implémentées), l'éditeur communautaire et la monétisation (publicité récompensée) restent à faire.

## 8. Prochaines priorités (par impact attendu)

1. **Tests joueurs réels (5 à 10 personnes)** avec le rapport de rétention, pour calibrer le chrono du Sentier et la difficulté des défis.
2. **Vérifier l'installation PWA sur de vrais téléphones** (Android Chrome, iOS Safari) une fois la branche fusionnée dans `main`.
3. **Rappel du défi du jour** (notifications) : nécessite un service de push, donc un backend minimal. À arbitrer.
4. **Ligue Fantôme** (paliers de maîtrise absolus), si les tests montrent un besoin de sensation de rang.
5. **Mondes 9-10** (barrières colorées, double graine, murs fragiles) : moteur + solveur + générateur, en appliquant la règle « mécanique qui compte ».
6. **Backend minimal** : seulement par décision consciente (audit §15, Update 6).
