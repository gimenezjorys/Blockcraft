# BlockCraft Daily — rétention : analyse, décision, feuille de route

*30/09/2026. Étapes 0 à 2 de la mission « jeu correct → jeu qui donne envie de revenir tous les jours ». La recherche s'appuie sur la connaissance des jeux cités (pas de navigation web pendant cette étape) : aucun chiffre de marché n'est inventé ici.*

## 0. Audit du code réel (avant cette mission)

**Chiffres vérifiés** : 60 niveaux sur 8 mondes, 0 cassé au solveur (`node scripts/check-game.js`), 4 niveaux INTRO en 1 coup (voulu).

**Ce que fait vraiment « le Jardin » (section E3)** : rien n'y est stocké. Il est **dérivé** de la progression de campagne :
- une plante SVG par monde, 5 stades (graine → fleur) selon les niveaux finis et les étoiles ;
- une « prairie » : 1 fleur toutes les 5 solutions parfaites du Sentier ;
- il apparaît en bande sur l'accueil et en puce en victoire (« Jardin : Cailloux → Tige »).

C'est un **tableau de bord joli**, pas une boucle : le joueur n'y **fait** rien, n'y **choisit** rien, n'y **dépense** rien. Il n'a donc aucune raison d'y retourner.

**Systèmes réutilisables** :

| Système | Où | Réutilisation prévue |
|---|---|---|
| Coins (`COIN_REWARDS`, `addCoins`, `spendCoins`) | B3 | Récompenses de zone du jardin, coffre du rituel |
| Succès (`ACHIEVEMENTS`, `metric/goal`, paliers) | B3 | Succès « jardinier » |
| Série + gel, défi du jour, coffre de la semaine | B2, L | Mission d'ancrage du rituel quotidien |
| Cosmétiques (4 catégories, rareté, Atelier) | E1 | Graine exclusive gagnée en fin de jardin (non achetable) |
| `WORLD_META` / `WORLD_THEMES` | E | Palette et ambiance « jardin de nuit » |
| Profil, Analytics local, rapport de rétention | E, B | Nouveaux événements (sessions/jour, pubs) |
| Solveur (`Solver`, `validateLevels`) | A2 | Inchangé (aucune nouvelle mécanique de plateau) |
| Le Sentier (mode infini de maîtrise, validé au solveur) | S | Source de ressource renouvelable |
| Audio bois/verre, `playSignature` | C | Sons de la nouvelle boucle |

**Session type aujourd'hui** : ouvrir → JOUER (2 à 5 niveaux) → défi du jour (1 plateau) → éventuellement une partie du Sentier → quitter. 5 à 12 minutes.

**Où le joueur décroche** :
1. **Après le défi du jour** : plus rien de *quotidien* à faire. Le rituel dure 1 minute.
2. **À la fin de la campagne** (60 niveaux, environ 8 à 15 jours) : les coins s'accumulent sans but une fois les cosmétiques voulus achetés.
3. **Aucun objectif à moyen terme qui s'accumule** : les étoiles sont finies (180). Rien ne se *construit* au fil des jours.
4. **Aucun « avant/après »** : rien ne montre concrètement tout ce que tes 20 jours de jeu ont produit.

## 1. Recherche : ce qui marche et pourquoi

| Jeu | Boucle centrale | Crochet de rétention | Monétisation | Transposable sans franchir les lignes rouges |
|---|---|---|---|---|
| **Gardenscapes / Homescapes** | Niveaux match-3 → étoiles → tâches de restauration | **Objectif visible** (la tâche suivante coûte N étoiles) ; **avant/après** spectaculaire ; histoire | Vies, boosters, coups en plus (IAP) | ✅ La ressource issue des niveaux sert à restaurer un lieu. ❌ Vies et coups payants. |
| **Township** | Production + commandes | Minuteurs, attente = retour | Accélérations | ⚠️ Attente artificielle = ligne rouge. Seul le « lieu qui grandit » est gardé. |
| **Royal Match** | Niveaux courts + rénovation de zones | Zone terminée = coffre + zone suivante ; méta très lisible | Vies, boosters, pubs récompensées | ✅ Zones à débloquer, récompense de zone. |
| **Two Dots** | Niveaux + carte d'expédition | Événements, collections de cartes | Vies, boosters | ✅ Collection d'objets de zone. |
| **Monument Valley** | Puzzles contemplatifs | Beauté, « waouh » à chaque niveau | Achat unique | ✅ Soin visuel ; les transformations du décor comme récompense. |
| **Wordle / Connections** | 1 puzzle/jour, identique pour tous | **Rituel** + partage + série | Abonnement journal | ✅ Déjà en place (défi du jour, série, partage). À enrichir par un rituel plus riche. |
| **Threes / 2048** | Partie courte rejouable | Record personnel, maîtrise | Premium / pubs | ✅ Déjà en place (Sentier Chrono). |
| **Balatro** | Runs à multiplicateurs | Maîtrise, découvertes, « encore une » | Achat unique | ✅ Multiplicateur de série du Sentier (déjà en place). |
| **Merge Mansion** | Fusion + rénovation + histoire | Collection, curiosité | Énergie | ❌ Énergie. ✅ Curiosité : ce que cache la zone suivante. |
| **Flow Free / Rush Hour** | Packs de puzzles purs | Complétion, étoiles | Packs, pubs, indices | ✅ Déjà la base de BlockCraft (par prouvé). |
| **Jeux à saisons** | Pass de saison | FOMO, piste gratuite + premium | Pass payant | ⚠️ FOMO culpabilisant = ligne rouge. Seule une piste gratuite sans perte de progression est acceptable. |

**Leçon commune** : les méta qui retiennent le plus longtemps combinent :
1. un **lieu qui se transforme** grâce au jeu ;
2. un **prochain objectif chiffré toujours visible** ;
3. un **petit rituel quotidien**.

Les puzzles purs retiennent par la maîtrise, que BlockCraft a déjà. Il lui manque le lieu et le rituel.

## 1b. Les 5 idées évaluées

| # | Idée | Crochet psychologique | Coût (fichier unique) | Risque | Impact rétention / revenus |
|---|---|---|---|---|---|
| 1 | **Méta-jardin à réveiller** : les étoiles, le défi et le Sentier donnent de la **rosée** 💧, qui sert à restaurer 5 zones (25 chantiers) d'un jardin endormi. Avant/après, récompense de zone, graine exclusive. | Progression visible, objectif chiffré, avant/après, collection | Moyen (SVG procédural, logique pure testable) | Économie à calibrer ; qualité visuelle à soigner | **Fort** sur J7/J30 : donne une raison de jouer *au-delà* des étoiles. Crée les meilleurs moments pour une pub récompensée (« +rosée »). |
| 2 | Album / collection de sets | Collection | Moyen | Doublon avec l'Atelier et les succès | Moyen |
| 3 | Mode infini de maîtrise | Maîtrise | — | — | **Déjà fait** (le Sentier : Chrono ×5, Zen, Échos). À renforcer seulement. |
| 4 | Éditeur de niveaux + code de partage | Créativité, viralité | Élevé (UI d'édition tactile, validation, encodage d'URL) | Contenu partagé de mauvaise qualité ; UI mobile délicate | Moyen sur J30, fort sur l'acquisition. À faire *après* la boucle quotidienne. |
| 5 | Rituel du jour (3 missions + coffre), événements hebdomadaires, piste de saison | Rituel, prochaine récompense proche | Faible (missions) à élevé (saisons) | Missions répétitives ; saisons = FOMO si mal faites | **Fort** sur J1/J7 (le rituel). Les saisons viendront plus tard. |

## 2. Décision

**Boucle phare : « Le Jardin endormi » (idée 1). Satellites : le Rituel du jour (idée 5, version missions + coffre) et la couche AdService.**

Justification :
1. C'est la seule idée qui répond aux **quatre points de décrochage** de l'audit : un but après le défi, un but après la campagne, une accumulation au fil des jours, un avant/après.
2. Elle **réutilise** tout ce qui existe : étoiles, défi, Sentier, coins, Atelier, audio, direction « jardin de nuit ». Aucune nouvelle mécanique de plateau, donc **aucun risque** pour le solveur ou le par.
3. Elle est cohérente avec l'identité : la graine est l'icône du jeu, le Jardin existe déjà ; on le rend **actif** au lieu d'en créer un second.
4. Le Rituel du jour transforme la « minute du défi » en **session de 5 à 10 minutes** avec une récompense proche. Il nourrit le jardin (rosée) : les deux se renforcent.
5. Les **moments de pub récompensée** deviennent naturels et positifs : doubler la rosée d'une victoire, un arrosage bonus, un coffre bonus. Le joueur est content, rien n'est bloqué.
6. **Coût maîtrisé** : logique pure testable en Node ; rendu en SVG procédural léger (pas d'assets), animé en CSS (transform/opacity/filter).
7. **Ce qui est écarté** : l'éditeur (coût UI élevé, à faire quand la rétention est prouvée) ; l'album (doublon) ; les saisons (FOMO à cadrer, et contenu à produire).
8. **Rythme visé** : environ 720 💧 pour tout le jardin, soit **3 à 4 semaines** pour un joueur engagé, 6 à 8 pour un joueur occasionnel. Une zone complète dès le **premier jour** (effet « waouh » immédiat).
9. **Lignes rouges** : aucune énergie ; la rosée ne s'achète pas ; aucune pub obligatoire ; la rosée n'influence ni score, ni étoiles, ni record.
10. **Mesurable** : événements `rosee_gain`, `garden_task`, `ritual_*`, `ad_*` et compteurs de rétention par jour (J1/J7/J30).

## 3. Feuille de route (classée par impact attendu sur la rétention)

1. ✅ **Le Jardin endormi** : 5 zones, 25 chantiers, rosée, récompenses de zone, graine exclusive. *(cette mission)*
2. ✅ **Rituel du jour** : 3 missions + coffre, objectif permanent sur l'accueil. *(cette mission)*
3. ✅ **AdService** (fournisseur simulé) + 4 emplacements récompensés + plafonds. *(cette mission)*
4. **Brancher un vrai fournisseur de pubs** (voir `PRODUCTION_PROGRESS.md`, section Monétisation). Il faut vos comptes.
5. **Notifications de rappel** (« ta rosée t'attend ») : nécessitent une application native (Capacitor + notifications locales) ; possible **sans backend** avec des notifications locales programmées.
6. **Nouvelles zones saisonnières** (automne, hiver…) : même moteur de chantiers, piste gratuite. Aucune perte si on rate une saison : les zones restent disponibles ensuite (pas de FOMO).
7. **Éditeur de niveaux + partage par lien** (`#lvl=…`, validé au solveur à l'ouverture) : créativité et acquisition.
8. **Collection de visiteurs du jardin** (oiseaux, papillons attirés par les zones restaurées) : petit bonus de collection, sans coût.
9. **Événements hebdomadaires thématiques** (« semaine des portails » : missions et Sentier orientés) : réutilise le générateur.
10. **Backend minimal** (classements réels entre amis) : seulement par décision consciente, projet séparé.
