# PROMPT CLAUDE CODE — FORT BOUTIQUE v1.1 « Plus simple, plus clair, plus joli »

> Prompt pour Claude Code. Le jeu Fort Boutique existe (version 1.0.0). Cette mise à jour le rend **plus simple, plus guidé, plus automatisable et plus beau**. Toutes les décisions de design sont prises ici : tu n'as qu'à développer.

---

## 0. CONTEXTE ET OBJECTIF

Le concept fonctionne (le jour on vend, la nuit les meubles se battent), mais le joueur trouve le jour trop « laissé à lui-même », l'aménagement trop compliqué, et l'habillage (écran titre, hub du matin) trop générique. Les arcade idle qui marchent (Eatventure, Idle Food Bar, Supermarket Idle, My Supermarket!) sont beaucoup plus simples. On leur emprunte ce qui marche :

| Ce qu'on reprend | Vient de | Ce que ça devient ici |
|---|---|---|
| Une liste d'objectifs courts, toujours visible, avec une petite récompense à chaque étape | Eatventure | Les **Objectifs de Mamie** (V2) |
| Un repère clair sur LA prochaine chose à faire, sans tracer le chemin | arcade idle (My Supermarket!, Supermarket Idle) | La **flèche d'objectif** (V2) |
| Des icônes au-dessus des postes (étagère vide, file d'attente, amélioration prête) | Idle Food Bar, jeux de supermarché | Les **bulles d'état** (V2) |
| Des emplacements prévus dans le magasin, qui apparaissent dans un ordre logique | arcade idle | Les **emplacements** et les **plans de boutique** (V3, V4) |
| Embaucher caissiers et employés de rayon pour tout automatiser | My Supermarket!, Supermarket Idle | Le **personnel en boutique** et le **pilote automatique** (V5) |
| Accélérer le temps | Eatventure, la plupart des idle | **Vitesse ×1 / ×2 / ×3** (V6) |

**Version visée : 1.1.0.**

---

## A. RÈGLES DE TRAVAIL

### A0. Règles absolues
1. **Ne jamais poser de question.** Décider, noter dans DECISIONS.md, continuer.
2. **Ne jamais perdre la progression ni les achats d'un joueur.** La sauvegarde passe à la version suivante, avec une migration qui conserve tout (A3).
3. **Jamais de pay-to-win** ; les pubs restent optionnelles (fonctions `showRewardedAd` / `showInterstitial` existantes, avec repli si indisponibles).
4. **Dates en UTC**, uniquement via `src/core/time.js`.
5. **60 images par seconde visées sur les petits téléphones**, sans fuite mémoire (réserves d'objets, aucune allocation dans les boucles chaudes).
6. **Aucune dépendance dans le jeu final** ; `dist/index.html` reste un fichier autonome jouable en double-cliquant.

### A1. Étape 1 — au début de chaque session (y compris après « Continue »)
Avant de modifier quoi que ce soit :
1. Lire `docs/PROMPT_V1_1.md` (copie de ce prompt), README, GAME_DESIGN.md, PROGRESS.md, DECISIONS.md.
2. `git status` et `git log --oneline -10`.
3. Lancer `npm test` et `npm run build` une fois, noter le résultat.
4. Audit court (10 lignes max) : mission en cours, état du build, prochaine action.

### A2. Priorité au développement : tests au strict minimum
- **Ne pas écrire de nouveaux tests**, sauf deux :
  1. la migration de sauvegarde (une fixture de l'ancienne version → nouvelle version, tout est conservé) ;
  2. le test de fumée existant du build (il doit continuer à passer).
- Lancer `npm test` **seulement en fin de mission**, pas après chaque modification.
- Si un ancien test casse parce qu'une fonctionnalité a été **volontairement** changée ou retirée (par exemple l'ancien éditeur), mettre ce test à jour ou le supprimer, et le noter en une ligne dans DECISIONS.md. Ne pas passer de temps à maintenir des tests de fonctionnalités retirées.
- Pas de playtests simulés, pas de bench. Une seule simulation d'équilibrage courte en V10.
- Vérifier soi-même dans le build que chaque fonctionnalité marche (overlay `?debug=1` pour les FPS).

### A3. Sauvegarde
- Nouvelle version de sauvegarde = version actuelle + 1, avec migration dans `save/migrations.js`.
- Nouveaux champs (défauts) : `settings.daySpeed` (1), `settings.nightSpeed` (1), `settings.guideArrow` (`"auto"`), `progress.mamieObjective` (index de l'objectif en cours), `progress.mastery` (compteurs des actions apprises), pour chaque boutique `plan` (id du plan choisi), `slots` (meuble par emplacement), `staff` (caissiers et commis), `autopilot` (booléen).
- **Migration des dispositions** : les meubles déjà posés librement sont rangés dans les emplacements du plan par défaut (même type, le plus proche d'abord). Ce qui ne rentre pas va dans la Réserve. Aucun meuble, niveau, plan, pièce ni cosmétique n'est perdu. Le personnel déjà embauché est conservé.

### A4. Organisation
- Ajouter les missions V1 à V11 dans PROGRESS.md (cases à cocher) et les faire **dans l'ordre**.
- Après chaque mission : `npm run build`, vérification dans le build, `npm test`, mise à jour de PROGRESS.md, commit `V3: titre court`, `git push` si un dépôt distant existe.
- Reprise sur « Continue » : appliquer A1 puis reprendre à la première case non cochée.
- **Fin de projet** : mettre à jour GAME_DESIGN.md (toutes les règles modifiées ci-dessous), écrire CHANGELOG.md (v1.1.0), tag `v1.1.0`, push, vérifier GitHub Pages, puis récap court à l'utilisateur.

---

## B. MISSIONS

### V1 — Audit (aucune modification)
Lire comment sont faits aujourd'hui : le tutoriel et les indices du jour, les emplacements d'achat (pads), l'éditeur d'aménagement, le personnel, l'écran titre, le hub du matin, la musique. Noter dans DECISIONS.md ce qui sera remplacé.
Copier ce prompt dans `docs/PROMPT_V1_1.md`.
- Fini quand : l'audit est écrit et PROGRESS.md contient V1 à V11.

### V2 — Un jour clair et guidé (sans être lourd)

**Principe.** On montre **où** aller, jamais **le chemin**. Une seule chose à la fois. Rien ne bloque le joueur.

**2.1 La flèche d'objectif**
- Une grosse flèche dorée (28 × 34 px, contour encre 3 px, reflet blanc) qui flotte à 36 px au-dessus de **la** cible et rebondit doucement (amplitude 6 px, période 0,8 s).
- Sous la cible, un anneau doré au sol qui pulse (ellipse, opacité 0,6 → 0, 1,2 s).
- Une seule cible à la fois. Aucune ligne de chemin, aucune trace au sol.
- **Choix de la cible** (recalculé toutes les 0,25 s, avec 1,5 s de stabilité minimale pour éviter le clignotement), par ordre de priorité :
  1. un emplacement d'achat que le joueur peut payer (pièces ≥ prix restant) ;
  2. si le marchand porte des articles : l'étagère de ce produit la plus vide (à égalité, la plus proche) ;
  3. un client attend à la caisse et il n'y a pas de caissier : la caisse ;
  4. une étagère vide ou presque (< 25 %) dont le producteur a du stock : ce producteur ;
  5. un tas de pièces ≥ 20 sur le comptoir et pas de caissier : le tas ;
  6. sinon : le producteur qui a le plus de stock.
- La nuit : seule cible = un voleur qui fuit avec un sac.
- **Quand l'afficher (pas abusif) :**
  - **Phase d'apprentissage** : tant que le joueur n'a pas fait 3 fois chacune des actions de base (prendre, poser, encaisser, payer un emplacement), la flèche est toujours visible.
  - **Ensuite**, elle n'apparaît que : après 4 s sans action utile ; lors d'un imprévu (client qui attend devant une étagère vide, file de 3 clients ou plus, voleur) ; quand un nouvel emplacement devient payable (3 s).
  - Option dans Paramètres : « Flèche d'aide : Auto / Toujours / Jamais » (Auto par défaut).

**2.2 Les bulles d'état** (lisibles d'un coup d'œil, au-dessus des objets)
- Étagère vide : bulle blanche avec l'icône du produit + petit « ! » rouge.
- Étagère à moins de 50 % : petite icône du produit, grisée.
- Producteur plein : bulle avec une coche verte et le nombre d'articles prêts.
- Caisse avec une file : bulle avec le nombre de clients qui attendent + petite horloge.
- Client qui s'impatiente : sa bulle passe du blanc à l'orange puis au rouge.
- Meuble améliorable (plans et pièces suffisants) : petite flèche verte qui pulse dans un coin, visible le jour comme la nuit.

**2.3 Les Objectifs de Mamie** (le fil rouge des premières heures)
- Une carte-objectif en haut à gauche (étiquette kraft avec une icône, 6 mots maximum, barre de progression), qui remplace l'ancien « Prochain objectif » tant qu'il reste des Objectifs de Mamie.
- Objectifs **un par un, dans l'ordre**. À chaque réussite : coup de tampon « Fait ! », petite récompense qui vole vers le compteur, puis l'objectif suivant glisse en place.
- Liste (Quartier 1) :

| # | Objectif (texte affiché) | Récompense |
|---|---|---|
| 1 | Remplis l'étagère de pommes (0/4) | 10 pièces |
| 2 | Sers 3 clients | 15 pièces |
| 3 | Achète la 2e étagère | 20 pièces |
| 4 | Gagne 100 pièces aujourd'hui | 2 plans Étagère |
| 5 | Survis à ta première nuit | 30 pièces |
| 6 | Améliore une étagère | 20 pièces |
| 7 | Achète le frigo à lait | 2 plans Frigo |
| 8 | Vends 10 bouteilles de lait | 40 pièces |
| 9 | Embauche un caissier | 50 pièces |
| 10 | Choisis un plan de boutique | 2 plans Comptoir |
| 11 | Embauche un commis | 60 pièces |
| 12 | Passe une journée en pilote automatique | coffre en bois |
| 13 | Réussis une nuit ★★★ | 3 plans au hasard |
| 14 | Bats le Roi Raton | coffre d'argent |

  Dans les quartiers 2 à 5, une liste courte de 5 objectifs fait découvrir les nouveaux meubles et le nouveau boss (même format). Quand la liste est finie, la carte reprend son rôle de « Prochain objectif » (quêtes, déblocages).
- Les objectifs suivent le rythme du joueur : s'il fait déjà la chose avant qu'elle soit demandée, l'objectif est validé dès qu'il apparaît.

**2.4 Un peu plus d'immersion** (sans ralentir)
- **Ouverture de la journée** (2 s) : le marchand retourne le panneau « Ouvert », le carillon sonne, deux ou trois clients attendent déjà devant la porte.
- **Moka**, le chat, est présent dès le jour 1 (il ne se bat qu'à partir du niveau 5, comme avant). Quand un nouvel objectif apparaît, il trotte jusqu'à la cible, s'y assoit 2 s et miaule. C'est un clin d'œil : la flèche reste le vrai repère.
- Les seuls textes en jeu restent courts : objectifs (6 mots max), nombres, « RUSH! », « NOUVEAU ».

**2.5 À retirer**
La main fantôme et les anciens indices du jour qui font doublon avec la flèche (garder la main fantôme uniquement pour montrer le geste du joystick lors du tout premier déplacement).

- Fini quand : dans le build, un nouveau joueur sait toujours quoi faire en regardant l'écran ; la flèche disparaît d'elle-même quand il joue bien et revient quand il hésite.

### V3 — Emplacements prévus : la boutique se range toute seule

**Principe.** On abandonne le placement libre. Chaque boutique a des **emplacements prévus**, dessinés comme dans un vrai magasin. Acheter un meuble le met automatiquement au bon endroit. Plus jamais d'étagère posée n'importe où.

**3.1 Types d'emplacements**
- `producteur` : les meubles qui fabriquent (cagette, frigo, four…). Toujours contre un mur (fond ou côtés), donc près des entrées des Grignotins, où ils servent aussi de tourelles.
- `presentoir` : étagères et vitrine. Ils forment **une allée** entre les producteurs et la caisse.
- `defense` : plante, comptoir, lanterne, ventilateur, aimant, horloge, machine à café, distributeur de bonbons. Placés sur le trajet des Grignotins, sans jamais couper l'allée des clients.
- `caisse` : fixe.
- `personnel` : un poste derrière la caisse (caissier), un coin réserve (commis).

**3.2 Règles de dessin d'un plan** (à respecter pour tous les plans que tu dessines)
1. Producteurs contre le mur du fond (et sur les côtés si besoin).
2. Une allée de présentoirs **juste devant les producteurs** : trajet producteur → étagère de 3 cases maximum.
3. Couloir du marchand libre entre la rangée des producteurs et l'allée des présentoirs.
4. Allée des clients libre entre les présentoirs et l'avant de la boutique : trajet étagère → caisse de 4 cases maximum.
5. Caisse en bas à droite de la porte ; la case devant la porte toujours libre.
6. Emplacements `defense` sur le trajet des Grignotins, en laissant toujours un chemin ouvert (validation existante des chemins, appliquée au plan **rempli à 100 %**).
7. Alignements propres : rangées et colonnes, pas de meuble isolé au milieu de nulle part.
8. Les emplacements ont un **ordre de remplissage** : l'emplacement N+1 est toujours à côté d'un meuble déjà posé du même type (une 2e étagère se pose à côté de la 1re, un 2e producteur à côté du 1er).

**3.3 Le plan de départ de l'Épicerie (E0, 5 × 6)** — coordonnées (colonne, ligne), ligne 0 = fond
```
          col 0         col 1     col 2         col 3         col 4
ligne 0   [P1 Cagette]  [PD]      [P2 Cagette]  [P3 Frigo]    [P4 Chaudron]
ligne 1   .             .         .             .             [FD]
ligne 2   [D1 défense]  [É1]      [É2]          [É3]          .
ligne 3   [FG]          .         .             .             .
ligne 4   [D2 défense]  .         .             Caisse        [D3 défense]
ligne 5   .             .         [PORTE]       .             .
[PD] porte de derrière  [FG]/[FD] fenêtres  P = producteur  É = présentoir  D = défense
```
- Ligne 1 = couloir du marchand (il prend en haut, il pose en bas : boucle très lisible).
- Postes du personnel (ce sont des personnages, ils ne bloquent pas les chemins) : caissier en (3, 5), juste derrière la caisse ; commis qui attend en (0, 5), le coin réserve.
- Lignes 3 et 4 = allée des clients (de la porte vers les étagères, puis vers la caisse).
- Au départ : Cagette (P1), Étagère (É1), Caisse. Ordre des achats guidés : É2 (à côté de É1), P2 (2e cagette), P3 (frigo), É3, D1, D3, P4 (chaudron), D2.
- Trajet des Grignotins depuis la porte de derrière : (1,1) → couloir → (4,1) → (4,2) → (4,3) → caisse : D3 et le côté droit le couvrent. Depuis la fenêtre gauche : (0,3) → allée → caisse : D1 et D2 la couvrent.

**3.4 Les autres plans**
Dessiner, avec les règles 3.2, les plans de départ de chaque taille (E0 à E3) pour chacun des 5 quartiers. Un agrandissement ajoute une ligne en haut (une nouvelle rangée de producteurs) et, pour E1 et E2, une colonne à droite (présentoirs et défense supplémentaires). Les emplacements déjà occupés gardent leurs meubles. Tous les plans sont des **données** (`src/data/shop-plans.js`), aucun code spécifique par plan.

**3.5 Achats**
- **Emplacements d'achat sur le sol** (pads) : toujours sur l'emplacement prévu suivant (ordre 3.3). La flèche d'objectif les montre quand ils sont payables.
- **Catalogue** : acheter un meuble le pose immédiatement dans le meilleur emplacement libre de son type (ordre de remplissage), avec l'animation de chute. S'il n'y a plus de place de ce type : il va dans la Réserve, avec le message « Plus de place : agrandis ou change de plan ».

- Fini quand : dans une nouvelle partie, chaque achat se pose à un endroit logique ; une ancienne sauvegarde se charge avec ses meubles rangés dans les emplacements.

### V4 — Aménagement simplifié : choisir un plan, échanger deux meubles

**Principe.** L'éditeur libre est remplacé par deux gestes simples. Le choix « jour contre nuit » (un trajet long pour les monstres est aussi long pour les clients) reste, mais il devient un choix entre 3 plans clairs.

**4.1 Les plans de boutique** (bouton « Plans » au Matin, icône : rouleau de plan bleu)
Pour chaque taille de boutique, 3 plans dessinés à la main :

| Plan | Idée | Clients | Défense |
|---|---|---|---|
| L'Allée (par défaut) | équilibré, celui de 3.3 | ★★ | ★★ |
| Le Comptoir rapide | présentoirs près de la porte et de la caisse, trajets clients très courts ; les Grignotins arrivent vite | ★★★ | ★ |
| La Forteresse | présentoirs disposés en chicane : les Grignotins font un grand détour, les clients aussi | ★ | ★★★ |

- L'écran montre les 3 plans en **mini-cartes dessinées** (vue du dessus de la boutique avec les meubles du joueur à leur futur emplacement), avec les deux notes en étoiles calculées à partir des longueurs de trajets réelles.
- Un tap sur un plan, puis « Choisir » : les meubles se rangent tout seuls dans les emplacements du nouveau plan (même type, ordre de remplissage), avec une petite animation de glissement. Gratuit, autant de fois qu'on veut, uniquement au Matin.
- Les plans Comptoir rapide et Forteresse se débloquent au niveau 3 (comme l'ancien aménagement).

**4.2 Échanger deux meubles**
Dans l'écran Plans, un tap sur un meuble le soulève (il flotte, ombre agrandie), un tap sur un autre emplacement du **même type** le pose ou l'échange. C'est tout : pas de glisser, pas de rotation, pas de validation compliquée. Bouton « Annuler » pour revenir à l'état d'ouverture de l'écran.

**4.3 À retirer**
Le bouton « Aménager » et l'éditeur libre disparaissent de l'interface. Garder le code derrière une option de Paramètres « Aménagement libre (expert) », désactivée par défaut.

- Fini quand : changer de plan prend 2 taps et la boutique se réorganise correctement ; les trajets restent valides.

### V5 — Personnel et automatisation complète

**Principe.** Comme dans les jeux de supermarché : on embauche dans la boutique, avec des emplacements d'achat, et on peut finir par **tout automatiser**. Le personnel arrive beaucoup plus tôt qu'avant (avant : niveau 10).

**5.1 Embaucher**
- Embauche par un **emplacement d'achat** dans la boutique (silhouette du personnage dessinée dans le carré doré), posé sur l'emplacement `personnel` du plan : derrière la caisse pour le caissier, au coin réserve pour le commis.

| Poste | Apparaît (Quartier 1) | Prix (Q1) | Maximum | Rôle |
|---|---|---|---|---|
| Caissier n°1 | jour 4 | 250 | — | encaisse à la caisse |
| Commis n°1 | jour 5 | 350 | — | réapprovisionne les étagères |
| Commis n°2 | jour 7 | 700 | 1 commis pour 2 producteurs (arrondi au-dessus), 4 au total | — |
| Caissier n°2 | boutique agrandie (E1) et jour 10 | 1 200 | 2 | 2e caisse ouverte à côté de la 1re |

- Dans les quartiers 2 à 5 : mêmes postes, prix × m_Q (m_Q = 1 + 0,75 × (Q − 1)), dès le jour 2 du quartier.

**5.2 Ce qu'ils font**
- **Caissier** : encaisse en 0,9 s par client (−0,1 s par niveau, minimum 0,4 s). Avec un caissier, les pièces vont **directement** dans le porte-monnaie (plus de tas à ramasser).
- **Commis** : porte 3 articles (+1 par niveau), se déplace à 2,2 cases/s (+0,2 par niveau). Il remplit l'étagère la plus vide dont le producteur a du stock. Deux commis ne visent jamais la même étagère (réservation).
- Améliorations (Améliorer → Personnel), niveaux 2 à 5 : caissier 300 / 700 / 1 500 / 3 000 × m_Q ; commis 400 / 900 / 1 800 / 3 600 × m_Q.
- La nuit, le personnel rentre chez lui (inchangé).
- Le personnel garde son style : tablier de la couleur du quartier, petite animation de travail, bulle « Zzz » s'il n'a rien à faire.

**5.3 Boutique automatisée et pilote automatique**
- Une boutique est **automatisée** quand elle a au moins 1 caissier et assez de commis (1 pour 2 producteurs). Un badge « Auto » (engrenage doré) apparaît dans le HUD du jour et sur la façade au Matin.
- **Pilote automatique** (interrupteur dans le HUD du jour, seulement si la boutique est automatisée) : la journée tourne toute seule. Le marchand peut aider (c'est plus rentable) ou rester à la caisse en souriant.
- **Passer la journée** (bouton dans le HUD, seulement en pilote automatique) : le reste de la journée est simulé instantanément, exactement comme s'il avait été joué en ×3 sans intervention. Animation de 1,5 s : le soleil file dans le ciel, le compteur de pièces défile. Puis la nuit commence normalement.
- Équilibrage : une boutique automatisée sans aide du joueur rapporte environ 85 % de ce que rapporte un bon joueur actif. Jouer reste un peu plus rentable, mais l'automatisation n'est jamais une punition.
- Les gains hors ligne existants (livraison du matin) s'appliquent dès qu'une boutique a un caissier et un commis.

- Fini quand : on peut, au Quartier 1, arriver à une journée entièrement automatique vers le jour 6 ou 7 et la passer en un tap.

### V6 — Accélérer le temps

- Un bouton en haut à droite du HUD (étiquette kraft, à côté de la pause) affiche la vitesse : un tap fait défiler **×1 → ×2 → ×3** pendant le jour, et **×1 → ×2** pendant la nuit.
- Déblocage : ×2 dès le jour 2, ×3 dès le jour 4 (ou dès que la boutique est automatisée). Avant, le bouton n'apparaît pas.
- Tout le monde du jeu accélère (clients, production, personnel, marchand, Grignotins la nuit). Mise en œuvre : faire 2 ou 3 pas de simulation fixes par image (ne **jamais** agrandir le pas de temps, pour garder des collisions stables). Si une image dépasse le budget, redescendre automatiquement d'un cran, avec une petite icône.
- La musique garde son tempo ; à ×2 et ×3, on ajoute seulement la couche de percussions légères (V9).
- La vitesse choisie est mémorisée (`settings.daySpeed`, `settings.nightSpeed`).
- Aucune pub liée à la vitesse : c'est gratuit.

### V7 — Un écran titre qui donne envie

**Diagnostic** : fond plat, texte système, « Touche pour jouer » posé au milieu : ça fait maquette.

**Nouvelle scène** (canvas animé, 360 × 640) :
- **Ciel du soir** en dégradé (#2A2466 en haut → #F59E6B à l'horizon), 40 étoiles qui scintillent, une lune avec un halo en haut à droite.
- **Deux plans de toits** de Bourg-Lanterne en silhouettes (#3B2F6E et #4E3D82) qui défilent très lentement (parallaxe).
- **Au centre, la façade de Fort Boutique**, grande (260 px de large) :
  - murs menthe, auvent rayé menthe et blanc ;
  - grande vitrine chaude où l'on devine les étagères ;
  - porte avec carillon, deux lanternes qui vacillent ;
  - une cagette de pommes sur le trottoir, Moka endormi sur la marche (sa queue bat doucement) ;
  - l'**enseigne en bois crénelée** au-dessus de la porte, avec le logo.
- **Vie** : dans le buisson de gauche, une paire d'yeux vert acide clignote toutes les 4 à 6 s, et un raton passe la tête une fois ; 12 lucioles flottent ; des feuilles tombent (citrouilles à Halloween, neige en hiver, selon la saison existante).
- **Logo** : lettres « Fort Boutique » placées **une par une** (rotation de −3° à +3°, petite variation de hauteur), en police arrondie très grasse, avec trois couches : contour encre de 6 px, remplissage `orReflet`, reflet blanc en haut de chaque lettre, ombre encre décalée de 4 px. Deux petits yeux sur l'enseigne s'ouvrent et regardent à gauche puis à droite.
- **Animation d'entrée** (1,6 s) : la caméra descend du ciel jusqu'à la façade (ralentissement en fin), l'enseigne tombe et rebondit, les lanternes s'allument une à une, les yeux de l'enseigne s'ouvrent.
- **« Touche pour jouer »** : écrit sur une **étiquette kraft suspendue à une ficelle** sous l'auvent, qui se balance doucement (±2,5°, période 2,4 s) et pulse légèrement (×1 → ×1,04).
- En bas, discrets : version, bouton son, roue des paramètres (dessinés en bois, pas en icônes plates).
- **Au tap** : la porte s'ouvre, une lumière chaude envahit l'écran, zoom dans l'embrasure, fondu vers le hub du matin (0,8 s).
- Musique : le thème joué à la boîte à musique (V9).

### V8 — Un hub du matin vivant, plus du tout « IA »

**Diagnostic** : grille de cartes arrondies identiques, icônes au trait façon bibliothèque d'icônes, composition symétrique et centrée, ombres floues : c'est ce qui fait « généré par IA ».

**Règles d'art pour toute l'interface**
- **Aucune icône au trait (stroke-only).** Toutes les icônes sont **illustrées** dans le style du jeu : formes pleines, contour encre de 2,5 px, aplats + un reflet. Chaque objet a sa propre silhouette et sa propre couleur.
- **Aucune carte rectangulaire identique répétée.** Les éléments sont des objets du monde : panneaux en bois, étiquettes kraft, ardoise, papier, tampons. Ils sont légèrement inclinés (entre −2° et +3°).
- **Ombres « tampon »** : ombre pleine couleur encre à 25 %, décalée de 3 px vers le bas, jamais floue.
- **Matières** : grain de papier et veinage du bois générés par code (motif de bruit sur canvas, opacité 6 à 10 %).
- **Composition asymétrique** et vivante : petites animations au repos sur chaque objet.

**Le nouveau hub : la boutique vue de la rue, le matin** (même façade que l'écran titre, mais en plein jour)
- **En haut** : une étiquette de prix suspendue qui affiche les pièces et les rubis ; à gauche, un **médaillon en bois** avec le niveau et un anneau d'XP.
- **Au centre, la façade**. À travers la vitrine, on voit **l'intérieur réel du joueur** en miniature (ses meubles, Moka, son personnel).
- **Objets interactifs**, chacun avec une petite étiquette kraft écrite à la main en dessous :

| Objet | Ouvre | Signal quand quelque chose attend |
|---|---|---|
| La porte et le panneau « Fermé » | **OUVRIR la journée** (action principale : la porte luit doucement, plaque « Jour 4 » à côté) | le panneau se balance |
| L'ardoise sur le trottoir | Quêtes | des points de craie montrent l'avancée ; une étoile de craie si une récompense est prête |
| Le calendrier accroché dans la vitrine | Calendrier | la page du jour se soulève |
| La boîte aux lettres | Défi du jour (et lettres de Mamie) | le petit drapeau rouge est levé |
| Le poteau de rue avec ses flèches | Carte des quartiers | une flèche clignote si un quartier se débloque |
| Moka sur l'auvent | Garde-robe | il miaule et agite la queue |
| La lune pâle dans le ciel du matin | infos de la Pleine Lune | le chiffre des nuits restantes |

- **En bas, un établi en bois** avec trois objets dessinés, posés dessus (et non trois boutons) :
  - le **catalogue** : un livret ouvert → Catalogue ;
  - la **boîte à outils** : → Améliorer ;
  - le **rouleau de plan bleu** : → Plans (V4).

  Une notification prend la forme d'un **cachet de cire rouge** ou d'une étiquette accrochée à l'objet, jamais un point rouge générique.
- **Transitions** : un tap sur un objet fait zoomer la caméra dessus (0,3 s) puis ouvre l'écran correspondant habillé comme l'objet : catalogue = livret à deux pages avec onglets en marque-pages ; Améliorer = plateau de boîte à outils ; Quêtes = ardoise plein écran ; Calendrier = page de calendrier. Le contenu fonctionnel actuel est gardé, seul l'habillage change.
- Le hub est dessiné sur le canvas (scène + zones de tap), avec des panneaux DOM seulement pour les écrans qui défilent.
- Le bouton OUVRIR doit rester **évident** : en plus de la porte, une grande étiquette verte « Ouvrir » est accrochée à la poignée.

### V9 — Une musique qu'on a envie de réentendre

**Principe.** Fini la mélodie générée au hasard : on joue **un vrai thème écrit**, court et accrocheur, qui revient partout (titre, matin, jour, nuit, boss) avec des habillages différents. Ambiance : boutique de village cosy, ukulélé, glockenspiel, sifflement, groove léger.

**9.1 Le thème (à écrire tel quel dans `src/data/music-score.js`)**
- Fa majeur, 112 BPM, swing 56 %. Notation : note+octave:durée en temps ; `-` = silence.
- **Partie A** (accords : Fa | Rém | Solm7 | Do7 | Fa | Lam | Si♭ | Do) :
  - m1 : `C5:0.5 F5:0.5 A5:1 G5:0.5 F5:0.5 C5:1`
  - m2 : `D5:0.5 F5:0.5 A5:0.5 G5:0.5 F5:1 D5:1`
  - m3 : `Bb4:0.5 D5:0.5 F5:1 E5:0.5 F5:0.5 G5:1`
  - m4 : `E5:1.5 C5:0.5 -:2`
  - m5 : `C5:0.5 F5:0.5 A5:1 C6:1 A5:1`
  - m6 : `G5:0.5 A5:0.5 G5:0.5 E5:0.5 C5:2`
  - m7 : `D5:0.5 F5:0.5 Bb5:1 A5:0.5 G5:0.5 F5:1`
  - m8 : `G5:1 E5:1 F5:2`
- **Partie B** (accords : Si♭ | Do | Lam | Rém | Solm7 | Do | Fa | Do7) :
  - m1 : `F5:1 D5:0.5 F5:0.5 G5:2`
  - m2 : `E5:1 C5:0.5 E5:0.5 G5:2`
  - m3 : `A5:0.5 G5:0.5 E5:0.5 C5:0.5 E5:1 A4:1`
  - m4 : `D5:0.5 E5:0.5 F5:0.5 A5:0.5 D6:2`
  - m5 : `Bb5:1 A5:0.5 G5:0.5 F5:1 D5:1`
  - m6 : `E5:0.5 F5:0.5 G5:1 C5:2`
  - m7 : `A5:1 F5:1 C6:1 A5:1`
  - m8 : `G5:1.5 -:0.5 E5:1 C5:1`
- **Basse** : fondamentale sur le temps 1, quinte sur le temps 3, note de passage sur le « et » du 4 vers l'accord suivant.
- **Accompagnement ukulélé** : rythme `bas - bas haut - haut bas haut` en croches, 12 ms d'écart entre les cordes, accents sur 2 et 4.
- **Batterie légère** : grosse caisse sur 1 et 3 (+ le « et » du 2 dans la partie A'), rim shot doux sur 2 et 4, shaker en croches swinguées, charleston ouvert sur le « et » du 4 toutes les 2 mesures, claps sur 2 et 4 dans A'.

**9.2 Instruments (synthèse WebAudio)**
- **Ukulélé** : Karplus-Strong (bruit de 10 ms dans une ligne à retard, rétroaction 0,985, passe-bas 3 kHz dans la boucle). Les notes utiles sont **pré-rendues une fois au chargement** dans des AudioBuffers (22 050 Hz, 1,2 s), puis rejouées.
- **Glockenspiel** (mélodie) : sinus + partiels à ×2,76 et ×5,4, décroissance 0,8 s.
- **Sifflement** (mélodie du matin) : sinus avec vibrato à 5,5 Hz (±12 cents), souffle léger (bruit filtré autour du double de la fréquence), glissé de 30 ms entre les notes.
- **Piano électrique** : FM (ratio 1, indice 1,5 qui retombe), trémolo stéréo à 4 Hz.
- **Contrebasse** : triangle + sinus, attaque rapide, petit bruit de pincement, passe-bas 700 Hz.
- **Batterie** : grosse caisse = sinus 120 → 50 Hz en 120 ms ; rim = bruit passe-bande 1,8 kHz 60 ms + clic triangle 330 Hz ; shaker et claps comme avant.

**9.3 Arrangements**
| Moment | Arrangement |
|---|---|
| Écran titre | thème A à la boîte à musique seule, 90 BPM, réverbération large |
| Matin (hub) | thème au **sifflement** + ukulélé + contrebasse, sans batterie, 100 BPM |
| Jour | structure de 36 mesures : intro (4, ukulélé seul) → A (glockenspiel) → B (marimba + contre-chant de glockenspiel en arpèges) → A' (tout le monde + claps) → pont (4, basse + percussions). Puis on recommence avec un autre habillage |
| Nuit | le même thème en **ré mineur** (accords Rém \| Si♭ \| Solm7 \| La7 \| Rém \| Fa \| Si♭ \| La), 92 BPM, boîte à musique + pizzicato + nappe ; toms pendant les vagues |
| Boss | thème de nuit à 100 BPM + timbales sur 1 et 3 + chœur |
| Aube | les 4 dernières mesures de A en ré majeur, boîte à musique + oiseaux |

- **Anti-lassitude** : 3 habillages du jour qui tournent (glockenspiel en tête ; marimba en tête doublé par le sifflement ; piano électrique en tête avec glockenspiel en contre-chant) et, une boucle sur quatre, une respiration de 8 mesures (ukulélé + sifflement seuls). Il faut environ 4 min 30 avant d'entendre deux fois exactement la même chose.
- **Couches selon l'action** (gardées) : plus de clients = plus d'instruments ; Rush et vitesse ×2/×3 = percussions en plus.
- **Mixage** : volume de la musique par défaut 0,28 ; panoramique (ukulélé à gauche, piano à droite, mélodie au centre) ; légère saturation douce sur le bus musique (WaveShaper), filtre « chaleur » au-dessus de 9 kHz ; la musique baisse de 5 dB sous les gros effets sonores.

### V10 — Équilibrage rapide et finitions
- Lancer **une seule fois** la simulation existante en version courte (`npm run sim -- --runs 50 --district q1,q2`). Vérifier seulement : pas de mur, pas d'inflation, Roi Raton battu entre les cycles 7 et 10. Ajuster si besoin les prix du personnel et des emplacements de ±25 %, et noter les changements dans DECISIONS.md.
- Relire en jouant les 15 premières minutes dans le build et corriger tout ce qui embrouille.
- Vérifier les 60 images/s avec l'overlay debug en ×3 sur une boutique pleine (sinon, réduire les particules à ×3).

### V11 — Livraison v1.1.0
- Mettre à jour GAME_DESIGN.md avec toutes les nouvelles règles (V2 à V9), PROGRESS.md, CHANGELOG.md.
- `npm test`, `npm run build`, commit, tag `v1.1.0`, push, vérifier GitHub Pages.
- **Récap court à l'utilisateur** : ce qui a changé (une ligne par mission), le lien pour jouer, et 3 idées pour la suite.
