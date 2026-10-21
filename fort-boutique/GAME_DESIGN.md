# Fort Boutique — Game Design Document

> Copie intégrale et fidèle de l'Annexe G du prompt (docs/PROMPT.md). Toute modification de valeur est justifiée dans DECISIONS.md et signalée ici par une note « (réglé : … ) ».

# ANNEXE G — GAME DESIGN DOCUMENT
*(À copier intégralement dans GAME_DESIGN.md dès M0, puis à tenir à jour. Les renvois [S1]…[S23] pointent vers les sources de G25.)*

## G1. Vision

- **Nom : Fort Boutique.** Sous-titre de store : « Vends le jour, défends la nuit » / *Shop by day, defend by night*.
- **Accroche :** Le jour, tu vends. La nuit, tes meubles se battent.
- **Genre :** arcade idle (tycoon) × tower defense, portrait, jouable d'un pouce.
- **Public :** 12–40 ans ; fans d'arcade idle (Monkey Mart, My Perfect Hotel, Pizza Ready) et de tower defense / Clash.
- **Session :** un cycle jour + nuit dure 4 à 6 min ; 2 à 4 cycles par session.
- **Univers :** Bourg-Lanterne, village douillet en lisière du Bois-Grignote. Tu hérites de l'épicerie de Mamie Lulu. La nuit, les **Grignotins** (petites créatures chapardeuses, mignonnes et ridicules) viennent voler le **Bocal de Mamie**, posé sur la caisse. Les meubles de Mamie sont enchantés : quand la lune se lève, **ils ouvrent les yeux** et défendent la boutique. Ton cosy et drôle, jamais gore : un Grignotin vaincu fait « pouf » dans un nuage d'étoiles.

### G1.1 Les 5 piliers
1. **Chaque meuble a deux vies** : chaque achat améliore la vente ET la défense.
2. **Toujours un objectif visible, toujours une raison de revenir.**
3. **On ne perd jamais sa boutique** : pas d'échec dur, seulement une partie du Bocal.
4. **Lisible et juteux** : chaque action a un retour visuel et sonore satisfaisant.
5. **Équitable** : jamais de pay-to-win ; les pubs sont des cadeaux optionnels.

### G1.2 Le nom : 10 propositions vérifiées (recherches web, octobre 2026)

| Nom | FR / EN | Vérification | Verdict |
|---|---|---|---|
| **Fort Boutique** | compris tel quel dans les deux langues | aucun jeu trouvé sous ce nom | ✅ **retenu** |
| Nightmart | bon jeu de mots en anglais (night + mart, et « nightmare ») | aucun jeu trouvé | 2e choix : ne dit pas « défense », « mart » parle peu en français |
| Moonmart | facile à dire | aucun jeu trouvé | joli, mais ne dit pas le twist |
| Shopfort | « chop-fort » en français | trop proche de *ShopFront* (jeu itch.io où un vieux boutiquier se défend au balai) et noyé sous « Shop Fortnite » [S23] | écarté |
| Mart Attack | jeu de mots anglais | les recherches renvoient à *Mars Attacks* | écarté (introuvable en recherche) |
| Shelfguard | anglais seulement | aucun jeu trouvé (brevets d'étagères) | écarté : difficile en français |
| Bouticat | mignon | aucun jeu trouvé | écarté : parle du chat, pas du jeu |
| Lunashop | doux | aucun jeu trouvé | écarté : sonne comme une boutique en ligne |
| Dusk Mart | facile | « Dusk » est déjà pris (FPS *Dusk*, *Dusk Diver* et sa supérette) | écarté |
| Moonshelf | facile | aucun jeu trouvé, mais c'est surtout un nom de meuble | écarté |

**Pourquoi Fort Boutique :** c'est le seul nom qui raconte tout le jeu en deux mots, en français comme en anglais (« fort » = forteresse et solide ; « boutique » existe dans les deux langues). Le logo s'impose de lui-même : une enseigne de boutique surmontée de créneaux de château, avec deux yeux qui s'ouvrent la nuit. Seul défaut : deux mots courants, donc moins faciles à trouver en recherche ; on le compense par une graphie constante (« Fort Boutique ») et le sous-titre de store.

## G2. Inspirations : ce qu'on reprend, d'où ça vient, ce qui le rend unique

| Idée reprise | Vient de | Ce que Fort Boutique en fait |
|---|---|---|
| Joystick + empiler des produits + emplacements à débloquer | arcade idle : My Mini Mart, Burger Please, My Perfect Hotel [S11][S12][S13] | chaque emplacement débloqué le jour est aussi une tourelle la nuit |
| Petite zone au début, le jeu montre où se placer | My Mini Mart [S11] | boutique de 5 × 6 cases qui s'agrandit ; chaque agrandissement change aussi le labyrinthe |
| Labyrinthe + tourelles | tower defense (Kingdom Rush, Plants vs. Zombies) | le labyrinthe EST ta boutique : un trajet long pour les monstres est aussi un trajet long pour les clients |
| Tutoriel invisible, apprendre en jouant, une pièce + une flèche géante | Plants vs. Zombies, George Fan (GDC 2012) [S9] | les 10 premières minutes sans aucune phrase (G19) |
| Coffres, plans de cartes, niveaux | Clash Royale | les plans ne s'obtiennent qu'en jouant, jamais en payant |
| Run court, puissance qui monte, choix rapides | Archero, Survivor.io | la nuit est un « run » de 1 à 3 min avec une progression permanente |
| Un mode court qui relance tout | Merge Tactics dans Clash Royale [S20] | Défi du jour et Nuit sans fin, courts et rejouables |
| Rendez-vous quotidien partagé | Wordle | Défi du jour identique pour tous (graine UTC), résultat partageable en émojis |
| Personnel qui automatise, déménager vers un nouveau lieu | My Mini Mart [S11] | personnel le jour + quartiers avec leurs propres monstres et boss |
| Série + gel de série | Duolingo [S10] | la flamme de la boutique, qui ne punit jamais brutalement |
| Récompense doublée par une pub | hybrid-casual [S6] | plafonnée, toujours optionnelle |
| Changer de méta pour relancer l'intérêt (« étincelles ») | Supercell, Clash Royale 2025 [S19] | événements hebdomadaires et saisons calculés hors ligne |
| Arcade + roguelite + base entre les parties | Ball x Pit [S21] | ici la « base » est la boutique elle-même, utilisée en direct |
| **Les meubles ont des yeux** | invention | signature visuelle : à la tombée de la nuit, tous les meubles ouvrent les yeux |
| **Rattraper le voleur en fuite** | invention | moment de skill : le Grignotin qui a volé fuit avec un sac ; le frapper rend les pièces |
| **Le ticket de caisse** | invention | les résultats de la journée s'impriment sur un vrai ticket qui se déroule |

Jeux les plus proches à connaître : *Tavernhold* et *Clearance Defence* (PC) mélangent déjà gestion le jour et défense la nuit [S22]. Aucun n'est un arcade idle mobile où le même objet vend et défend : c'est notre différence.

## G3. Rétention : ce qui donne envie de lancer, d'enchaîner et de revenir

**Ce que disent les données.** Les joueurs restent après leur première session surtout parce qu'ils aiment les mécaniques (69 %) et ressentent une forte progression avec des récompenses (67 %) ; ils partent surtout à cause du pay-to-win (77 %), de trop de pubs (72 %) et de pubs mensongères (66 %) [S3]. Les bugs (55 %) et l'absence de sentiment de progrès (55 %) font aussi fuir [S4]. Le jeu mobile médian ne garde que ~22 % de ses joueurs à J1, < 4 % à J7 et < 1 % à J30 ; le top 10 % fait ~40 / 12 / 4 % [S2]. **Notre cible : J1 ≥ 40 %, J7 ≥ 12 %, J30 ≥ 4 %.**

### G3.1 Boucle courte (quelques secondes)
- Jour : prendre → poser → le client sert → encaisser → les pièces volent vers le compteur → l'emplacement d'achat se remplit → « pop », un meuble apparaît.
- Nuit : un Grignotin entre → les meubles tirent → « pouf » + pièces → tu te places pour encourager tes meubles ou tu rattrapes un voleur.

### G3.2 Boucle moyenne (un cycle, 4 à 6 min)
Matin (préparer) → Jour (vendre) → Crépuscule (les yeux s'ouvrent) → Nuit (défendre) → Aube (ticket, étoiles, coffre) → amélioration → Matin. **Chaque cycle se termine par un coffre et un nouvel objectif affiché.**

### G3.3 Boucle longue (semaines de jeu)
Semaine de 7 nuits → Pleine Lune (boss) → nouveau quartier ; niveaux des meubles (plans) ; niveau de marchand et déblocages ; agrandissements ; personnel ; franchises ; collections (bestiaire, garde-robe).

### G3.4 Boucle quotidienne (jours réels)
Calendrier de 7 jours, 3 quêtes du jour, Défi du jour, série, livraison du matin, événement de la semaine, saison.

### G3.5 Objectif toujours visible
Une étiquette kraft « Prochain objectif » en haut à gauche (Matin et Jour) montre **un seul** objectif, avec icône et barre de progression. Priorités : 1) emplacement d'achat sur le sol (montant restant) ; 2) amélioration prête (plans suffisants, flèche verte) ; 3) quête presque finie (≥ 80 %) ; 4) prochain déblocage au niveau N+1 (silhouette) ; 5) Pleine Lune dans X nuits. Un tap sur l'étiquette emmène à l'endroit concerné.
- *M11 :* pendant les 10 premières minutes, l'étiquette n'a pas de mot (G19) : icône, nombre, barre ; « Prochain objectif » est son nom pour les lecteurs d'écran. Avant la première vente, elle montre déjà P1 (40). Au Matin, elle est dans la rangée du haut, entre la carte et la lune (le coin gauche porte le niveau). Un tap emmène à l'endroit : pendant le Jour, la flèche dorée montre l'emplacement d'achat 3 s (le reste se fait au Matin : petite secousse) ; au Matin, OUVRIR pulse (emplacement), Améliorer ou la lune s'ouvrent, le bouton verrouillé du déblocage pulse.

### G3.6 Surprises programmées
Jour : client VIP, Rush, Commande spéciale (G7.7). Nuit : Raton doré (G8.8). Coffres : tirage des plans avec révélation carte par carte. Semaine : événement (G13.5). Saisons (G13.6).

### G3.7 Leviers par palier

| Palier | Ce qui fait revenir dans Fort Boutique |
|---|---|
| J1 | Première victoire en 2 min, premier coffre et première amélioration en moins de 3 min ; le calendrier montre le coffre d'argent de demain avec compte à rebours ; « tes cagettes se remplissent pendant ton absence » ; la Pleine Lune dans 6 nuits |
| J7 | Deuxième couche débloquée vers J2–J3 (aménagement, quêtes, Défi du jour, Moka) ; premier boss ; série de 7 jours avec gel offert ; quartier 2 |
| J30 | Quartiers 3 à 5 et leurs boss ; plans vers les niveaux 6–10 ; personnel et franchises ; bestiaire ; garde-robe ; événements hebdomadaires et saisons ; Nuit sans fin |

### G3.8 Ce que les joueurs détestent, et notre parade

| Ce qui fait fuir | Notre parade |
|---|---|
| Mur de difficulté | Aucun échec dur ; Courage de Mamie au boss ; simulations anti-mur (D2) |
| Attentes forcées, énergie | Aucun minuteur pour jouer ; on joue autant qu'on veut |
| Pubs mal placées | Aucune pub pendant le jeu ; interstitielle seulement à l'aube, rare (G18) [S5][S7] |
| Pay-to-win | Plans et niveaux impossibles à acheter [S3][S4] |
| Ennui | Nouveauté tous les 1 à 2 cycles au début, nouveau monstre presque chaque nuit de la semaine 1 |
| Confusion | Un seul objectif affiché ; apprentissage par l'image ; textes de 8 mots max [S9] |
| Punition de l'absence | Rien ne se perd hors ligne ; la série a un gel ; cadeau de retour |
| Bugs | Tests automatisés, playtests simulés, robustesse (M26) |

## G4. Contrôles

- **Jour et nuit :** joystick flottant (B6). Toutes les interactions sont automatiques par proximité : prendre, poser, encaisser, payer un emplacement, réparer. Aucun bouton nécessaire pour jouer.
- **Nuit :** bouton **Cloche** en bas à droite (64 px, se remplit en cercle) ; en mode gaucher, en bas à gauche.
- **Menus :** taps sur de grandes étiquettes ; retour avec un bouton en haut à gauche ou Échap.
- **Aménagement :** tap pour sélectionner, glisser pour déplacer, boutons Tourner et Ranger.
- **Clavier :** ZQSD / WASD / flèches, Espace, Échap, Entrée.

## G5. Structure d'un cycle

### G5.1 Les phases

| Phase | Durée | Ce que fait le joueur | Fin |
|---|---|---|---|
| Matin | libre | hub : catalogue, aménagement, améliorations, quêtes, calendrier, défi | bouton OUVRIR |
| Jour | 90 s (jour 1), 120 s (jour 2), puis 150 s (+10 s avec l'Horloge de Mamie) | vendre | le soleil touche l'horizon |
| Fermeture | 6 s | plus aucun client n'entre ; ceux qui sont dedans finissent ou partent sans pénalité | auto |
| Crépuscule | 4 s | regarder : rideau, lumières, les meubles ouvrent les yeux | auto |
| Nuit | vagues (≈ 45 s à 3 min) | défendre | dernière vague vidée (plafond de sécurité : 240 s) |
| Aube | 15 à 40 s | ticket, étoiles, coffre, ×2 optionnel par pub | bouton CONTINUER |

Le Défi du jour et la Nuit sans fin sont des nuits seules, précédées d'un aménagement libre.

### G5.2 Reprise après rechargement
- Jour : reprend avec le temps restant, la recette déjà faite et les stocks.
- Nuit : recommence au début de la nuit (même graine, donc mêmes vagues).
- Aube : les récompenses déjà attribuées ne sont jamais rendues deux fois (drapeau `dawnClaimed`).

## G6. La boutique

### G6.1 Grille
- Une case = 48 px logiques. Tailles (colonnes × lignes) : **E0 5 × 6**, **E1 6 × 7**, **E2 7 × 8**, **E3 7 × 9**.
- Coordonnées (colonne, ligne) ; ligne 0 = fond (mur du haut), ligne H−1 = devant (mur avec la porte).
- La boutique est centrée horizontalement ; son mur du haut est à 80 px du haut de l'écran.

### G6.2 Cases fixes et entrées (toujours libres, jamais de meuble)
- **Porte d'entrée** des clients : case (2, H−1). Sa colonne ne change jamais.
- **Porte de derrière** (Grignotins) : case (1, 0), active dès la nuit 1.
- **Fenêtre gauche** : case (0, H−3), active à partir de la nuit 3 du quartier 1.
- **Fenêtre droite** : case (W−1, 1), active à partir de la nuit 5 du quartier 1.
- **Cheminée** (volants seulement) : au-dessus de la case (W−2, 0), à partir du quartier 2 ; aucune case réservée.
- **Trappe de la cave** : case (2, H−4), à partir du quartier 3 ; des monstres au sol en sortent au milieu de la boutique.
- **Caisse + Bocal** : déplaçable uniquement sur les deux dernières lignes, jamais sur la case de la porte.

Les cases réservées sont **traversables** mais on ne peut rien y poser.

### G6.3 Déplacements
- 4 voisins par case ; champs de flux par parcours en largeur (BFS), recalculés à chaque changement (aménagement, meuble cassé ou réparé).
- Clients et Grignotins au sol ne traversent pas les meubles ; les volants et les fantômes vont tout droit (trajectoire légèrement ondulée).
- Le marchand est un cercle de rayon 0,32 case ; il glisse le long des obstacles. Les clients ne le bloquent pas (ils s'écartent doucement).

### G6.4 Règles de placement
1. Chaque meuble « à accès » (étagère, producteur, caisse) a au moins une case voisine libre atteignable depuis la porte d'entrée.
2. Depuis chaque entrée de Grignotins active **ou future** du quartier, un chemin au sol existe jusqu'à une case voisine de la caisse.
3. Les cases réservées (G6.2) restent vides.
4. Un meuble 2 × 1 occupe deux cases et peut tourner de 90°.

Placement invalide → fantôme rouge, icône « chemin bloqué », son d'erreur doux ; impossible de valider.

### G6.5 Éditeur d'aménagement (débloqué au niveau 3)
- Plein écran : la grille avec repères ; en bas, la **Réserve** (meubles rangés, à faire glisser sur la grille) ; en haut, deux interrupteurs : **Trajet des clients** (pointillés bleus) et **Trajet des Grignotins** (pointillés vert acide), avec la longueur moyenne en cases et une flèche ↑ ou ↓ par rapport à l'ouverture de l'éditeur.
- Gestes : tap = sélectionner (cadre pointillé + boutons Tourner ⟳ et Ranger ⬇) ; glisser = déplacer (fantôme aimanté à la grille, vert si valide, rouge sinon) ; relâcher sur une case invalide = retour à la place d'origine.
- Valider (étiquette verte) / Annuler (étiquette corail).
- **Conseil de Mamie** : si la dernière nuit était ★, une ampoule propose une disposition (algorithme : maximiser le trajet des Grignotins en gardant le trajet des clients ≤ +30 %) que le joueur applique ou non.

### G6.6 Agrandissements
Chaque agrandissement ajoute une ligne en haut et, pour E1 et E2, une colonne à droite : E0 → E1 (6 × 7) → E2 (7 × 8) → E3 (7 × 9). Les meubles gardent leur colonne et descendent d'une ligne par ligne ajoutée ; comme toutes les cases réservées sont définies depuis le bas ou le haut, une disposition valide reste valide. Coûts (G12.6).

### G6.7 L'Épicerie au départ (E0, 5 × 6) et ses emplacements d'achat
```
          col 0        col 1    col 2        col 3        col 4
ligne 0   .            [PD]     .            .            Frigo(P3)
ligne 1   Cagette A    .        Comptoir(P6) .            [FD]
ligne 2   Cagette B(P2) .       Plante(P5)   .            Étagère B(P1)
ligne 3   [FG]         .        .            .            Étagère C(P4)
ligne 4   Étagère A    .        .            Caisse+Bocal .
ligne 5   .            .        [PORTE]      .            .
[PD] porte de derrière  [FG] fenêtre gauche  [FD] fenêtre droite  (P#) emplacement d'achat
```
Au départ, seuls Cagette A, Étagère A et la Caisse existent. Les emplacements apparaissent un par un sur le sol (carré pointillé doré, prix au centre) et le marchand paie en restant dessus (les pièces volent dans le carré, G20.6) :

| Emplacement | Meuble | Prix | Apparaît |
|---|---|---|---|
| P1 | Étagère B | 40 | après la 1re vente du jour 1 |
| P2 | Cagette B | 60 | quand P1 est construit |
| P3 | Frigo à lait | 150 | début du jour 2 (niveau 2) |
| P4 | Étagère C | 80 | quand P3 est construit |
| P5 | Plante carnivore | 90 | début du jour 3 (niveau 3) |
| P6 | Comptoir | 20 | quand P5 est construit |

Ces prix « tutoriel » remplacent les prix du catalogue pour ces six achats. Ensuite, tout passe par le catalogue : son bouton est visible en silhouette dès le premier Matin et s'ouvre quand P6 est construit (jour 3). Chaque nouveau quartier commence en E0 avec la caisse en (3, 4), le premier producteur du quartier en (0, 1), une étagère en (0, 4) et deux comptoirs dans la réserve.

## G7. Le jour : clients et produits

### G7.1 Arrivée des clients
- Intervalle (s) = max(1,6 ; base_Q × 0,95^(jour − 1) × 0,97^(semaine − 1)) ÷ (1 + 0,015 × attractivité).
- base_Q : Q1 4,2 ; Q2 3,9 ; Q3 3,6 ; Q4 3,3 ; Q5 3,0.
- Attractivité = somme des bonus de décor (comptoir +1, plante +3, lanterne +4, distributeur de bonbons +6).
- Clients présents en même temps : 3 + floor(nombre de cases / 8) au maximum.

### G7.2 Types de clients

| Type | Part | Patience | Panier | Paiement | Apparaît |
|---|---|---|---|---|---|
| Villageois | le reste | 10 s | 1 (55 %), 2 (35 %), 3 (10 %) | normal | toujours |
| Pressé (casquette) | 15 % | 6 s | 1 | pourboire +50 % | Q1, jour 3 |
| Gourmand (grosse sacoche) | 10 % | 12 s | 3 | normal | Q1, jour 2 |
| VIP (couronne dorée) | 1 par jour au Q1 dès le jour 2, 2 par jour ensuite | 7 s | 2, produit le plus cher | ×3 | Q1, jour 2 |

Apparence des clients : combinaisons procédurales (6 couleurs de corps × 6 chapeaux × 3 visages), toujours lisibles.

### G7.3 Comportement
Entre → choisit ses produits parmi ceux exposés (au hasard, uniformément) → va à l'étagère → prend un article (si vide : attend avec une bulle « ? » + l'icône du produit, la patience décompte) → rejoint la file de caisse → paie quand le marchand ou le caissier est à ≤ 1,3 case de la caisse → sort. Patience épuisée : il part avec un petit nuage gris, sans vente et **sans autre pénalité**.

### G7.4 Paiement et pièces
- Prix payé = prix de base × (1 + 0,15 × (niveau de recette − 1)).
- Pourboire de 10 % si le client est servi moins de 3 s après son arrivée en caisse (Pressé : +50 % au lieu de 10 %).
- Encaissement : 0,6 s par client (−0,04 s par niveau de caisse, minimum 0,25 s).
- Les pièces forment un petit tas sur le comptoir ; passer à ≤ 0,8 case les ramasse (elles volent vers le compteur). Les tas oubliés sont ramassés automatiquement à la fermeture : **aucune perte**.

### G7.5 Produits

| Quartier | Produit | Prix de base | Source |
|---|---|---|---|
| Q1 Épicerie | Pomme | 4 | Cagette de pommes |
| Q1 | Lait | 7 | Frigo à lait |
| Q1 | Confiture | 12 | Chaudron à confiture |
| Q2 Boulangerie | Baguette | 14 | Four à pain |
| Q2 | Croissant | 20 | Pétrin |
| Q2 | Gâteau | 45 | Vitrine à gâteaux |
| Q3 Pharmacie | Pastilles | 18 | Pilulier |
| Q3 | Tisane | 30 | Herbier |
| Q3 | Potion | 60 | Alambic |
| Q4 Quincaillerie | Clous | 40 | Établi |
| Q4 | Pot de peinture | 55 | Mélangeur de peinture |
| Q4 | Marteau | 80 | Enclume |
| Q5 Emporium | Bonbons magiques | 60 | Distributeur de bonbons |
| Q5 | Boule de cristal | 140 | Boule de cristal |
| Q5 | Grimoire | 220 | Pupitre à grimoires |

**Recettes** (niveau 5 au maximum par produit, débloqué au niveau 5) : +15 % de prix par niveau ; coût = prix de base × 25 / 60 / 140 / 320 pièces pour les niveaux 2 / 3 / 4 / 5.

### G7.6 Producteurs, étagères et pile du marchand
- Un producteur fabrique son produit à intervalle fixe dans une réserve plafonnée (G9) ; il s'arrête quand sa réserve est pleine.
- Une étagère expose un seul produit à la fois (défini par le premier article posé ; modifiable dans l'éditeur) ; capacité 4 + (niveau − 1).
- La pile du marchand : 4 articles au départ (+1 par niveau de Panier, max 14), produits mélangés autorisés. Prise automatique à ≤ 1 case d'un producteur (6 articles/s), dépose automatique à ≤ 1 case d'une étagère du bon produit (8 articles/s). Les articles s'empilent sur sa tête.

### G7.7 Événements du jour
- **Rush** (dès le jour 2) : une fois par jour, entre 35 % et 70 % de la journée, 5 clients entrent en 4 s ; bannière « RUSH! » ; pourboires ×1,5 pendant 20 s ; couche musicale 3.
- **Commande spéciale** (dès le jour 3, une par jour max) : un client avec un parchemin demande 4 à 6 exemplaires d'un produit exposé, à livrer en 50 s (il attend près de la caisse, carte en haut à droite avec minuteur) ; réussite : +30 % de leur valeur + 1 coffre en bois ; échec : il repart en souriant, sans pénalité.
- **VIP** : voir G7.2 ; son passage est annoncé par un petit carillon doré.
- *M11 :* le client de la Commande attend sur une case voisine de la caisse (hors de la file) ; le marchand lui donne les articles en passant à côté (8 par seconde, comme sur une étagère) ; le minuteur part quand il est à sa place ; le produit demandé est exposé ET fabriqué dans la boutique. Le coffre en bois s'ouvre à l'aube, après celui de la nuit (gardé dans la journée sauvegardée, ouvert tout seul si on quitte l'aube). Une seule Commande et un seul Rush par jour, même après un rechargement.

### G7.8 Fermeture
Quand la barre de soleil est pleine : l'enseigne passe sur « Fermé », plus aucun client n'entre, 6 s de grâce, puis Crépuscule.

## G8. La nuit

### G8.1 La transformation
Au Crépuscule, tous les meubles passent en forme de nuit (G9) ; les producteurs s'arrêtent ; les étagères gardent leurs articles. Éclairage : clair de lune par les fenêtres, lanternes, et la petite lanterne du marchand (rayon 1,8 case). Au Quartier 3, l'obscurité est plus profonde : les fantômes ne sont visibles et ciblables qu'à la lumière.

### G8.2 Le Bocal
Valeur au début de la nuit = max(20 × Q, arrondi(0,5 × recette du jour)), Q étant le numéro du quartier. Affiché sur la caisse et en jauge dans le HUD.

### G8.3 Vagues
- Nombre de vagues selon la nuit k de la semaine : N1 2 ; N2 3 ; N3 3 ; N4 4 ; N5 4 ; N6 4 ; N7 5 (la dernière contient le boss). Semaine 2 et suivantes : 5 (N7 : 6).
- Budget de menace de la vague i (1 à W) : **B = (6,25 + 3,125 × (k − 1)) × (0,7 + 0,15 × (i − 1)) × F_Q × (1 + 0,1 × (s − 1))** (M10 : 5 et 2,5 au départ, +25 %, D2.5), avec F_Q = 1,0 / 1,15 / 1,3 / 1,45 / 1,6 pour Q1 à Q5 et s le numéro de la semaine. La vague du boss n'a que 50 % de ce budget en escorte.
- Chaque monstre coûte son « coût de menace » (G10). Le générateur, à graine (graine de partie, quartier, semaine, nuit), tire des groupes de 2 à 5 du même type parmi ceux autorisés à cette nuit, avec les pondérations de `data/waves.js`, et les répartit entre les entrées actives.
- Un type nouveau apparaît d'abord **seul**, en petit groupe, dans la vague 1 de sa nuit d'introduction.
- **Télégraphe** : 2,5 s avant chaque vague, chaque entrée active montre une bulle pulsante avec les icônes des types qui vont sortir (et une étiquette « NOUVEAU » pour un type jamais vu).
- Rythme : 0,35 s entre deux membres d'un groupe, 0,9 s entre deux groupes (0,7 s à partir du Q3), 3,5 s de pause entre deux vagues (bannière « Vague 2/4 »).
- *M11 (rythme des premières nuits, DECISIONS.md) :* la nuit 1 scénarisée suit G19 (bulle 3 s, 2 s entre deux ratons, 5 s de pause, ratons à 20 PV comme avant M10 : ≈ 34 s) ; les nuits 2 et 3 de la semaine 1 au Q1 sont des « nuits d'apprentissage » (1,05 s entre membres, 2,7 s entre groupes, 6 s de pause, budget inchangé : nuit 2 ≈ 58 s au lieu de 28 s, G19 ≈ 60 s). Dès la nuit 4, le rythme ci-dessus s'applique.

### G8.4 Vol et fuite
- Un Grignotin qui atteint une case voisine de la caisse prend **son % de vol du Bocal initial** (plafonné à ce qui reste), devient **voleur** (sac sur le dos, vitesse +50 % ; M10 : +20 % au départ, D2.5 ; le voleur scénarisé de la première nuit garde +20 % et 20 PV, G19) et repart vers l'entrée par laquelle il est venu (la plus proche s'il venait de la trappe).
- Le vaincre pendant sa fuite fait tomber le sac : les pièces retournent dans le Bocal **avec +10 % de bonus**.
- S'il sort, les pièces sont perdues pour cette nuit.

### G8.5 Fin de nuit et récompenses
- La nuit se termine quand toutes les vagues sont sorties et qu'aucun Grignotin ne reste.
- Bocal gardé (%) = Bocal final ÷ Bocal initial.
- Étoiles : ★ dans tous les cas ; ★★ si ≥ 70 % gardé ; ★★★ si 100 % gardé (les pièces récupérées comptent).
- Récompenses : pièces = Bocal final + butin des monstres ; XP (G12.3) ; un coffre selon les étoiles (★ Bois, ★★ Argent, ★★★ Or).

### G8.6 Meubles abîmés et cassés
- Un meuble à 0 PV est **cassé** : fumée, il ne tire plus et devient franchissable au sol.
- Le marchand répare à 12 PV/s un meuble voisin abîmé ; un meuble cassé revient en service à 30 % de ses PV après 3 s de réparation.
- À l'aube, tout est réparé gratuitement.

### G8.7 Le marchand la nuit
- **Encouragement** : les meubles à ≤ 1,6 case de lui gagnent +35 % de cadence (aura visible : cercle de craie qui pulse).
- **Coup de balai** automatique sur le Grignotin le plus proche à ≤ 0,68 case : 4,5 dégâts toutes les 1 s (M10 : 6 dégâts / 0,8 s à ≤ 0,9 case au départ, D2.5).
- **Réparation** : voir G8.6.
- **Cloche** : se charge avec 14 Grignotins vaincus ; un tap étourdit tous les Grignotins 1,5 s et leur inflige 15 dégâts.
- Le marchand ne peut pas être blessé. Seul le Champiboum l'étourdit 0,8 s s'il explose à côté.

### G8.8 Le Raton doré
Une nuit sur 10 (tirage à graine), un Raton doré apparaît une fois dans une vague au hasard : PV × 2, vitesse 1,5, butin × 10, traînée d'étincelles. S'il est vaincu, le coffre de l'aube monte d'un rang (Bois → Argent → Or).

### G8.9 La Pleine Lune (nuit 7)
- Une lune pleine grossit dans le HUD toute la semaine (compte à rebours en nuits).
- La nuit 7 contient le boss du quartier (G10.3). **Victoire** = boss vaincu, même s'il avait volé (le vaincre pendant sa fuite rend tout). Récompenses : Coffre de Lune (au lieu du coffre d'étoiles), XP de boss, quartier suivant si le niveau requis est atteint, bannière et fanfare.
- **Échec** = le boss sort avec le butin : ★ 0, pas de Coffre de Lune, la Pleine Lune revient la nuit suivante avec le **Courage de Mamie** (+15 % de dégâts des meubles par échec, max +60 %, affiché à l'écran d'intro). Option pub : « Rejouer tout de suite (+25 % de dégâts) ».
- Après la victoire, la semaine 2 commence (G13.1).

## G9. Les meubles (jour + nuit)

### G9.1 Règles générales
- Chaque meuble a une **forme de jour** (vendre, produire, décorer) et une **forme de nuit** (tourelle, mur ou soutien).
- **Niveaux 1 à 10**, améliorés avec des **plans** (propres à chaque meuble) + des pièces. Les niveaux sont **globaux** : un niveau gagné vaut pour tous les exemplaires de ce meuble, dans toutes les boutiques.
- Gains par niveau : dégâts ×1,12 (M10 : ×1,20 au départ, D2.5) ; cadence +3 % ; PV ×1,15 ; portée +0,1 case aux niveaux 4, 7 et 10 ; effets (ralentissement, durée, poison) +5 % (max ×1,45) ; intervalle de production ×0,93 ; réserve +1 aux niveaux 3, 5, 7, 9 ; étagère : capacité 4 + (niveau − 1) ; caisse : encaissement −0,04 s.
- **Plafond de niveau** = min(10 ; 1 + arrondi supérieur(niveau de marchand ÷ 3)).
- **Coût pour passer du niveau L à L+1** :

| L → L+1 | 1→2 | 2→3 | 3→4 | 4→5 | 5→6 | 6→7 | 7→8 | 8→9 | 9→10 |
|---|---|---|---|---|---|---|---|---|---|
| Plans | 2 | 4 | 8 | 14 | 24 | 40 | 64 | 100 | 150 |
| Pièces | 30 | 80 | 200 | 500 | 1 200 | 2 800 | 6 000 | 12 000 | 24 000 |

  Meubles rares : pièces ×1,5 ; mêmes plans, mais leurs plans tombent 3 fois moins souvent.
- **Achat** : prix du catalogue × 1,6^(exemplaires déjà possédés dans cette boutique). Ranger un meuble est gratuit ; pas de revente.
- Les meubles **génériques** s'achètent dans toutes les boutiques une fois débloqués ; les **producteurs** seulement dans la boutique de leur quartier.

### G9.2 Règles de combat
- Dégâts reçus = max(1 ; dégâts − armure). Feu, brûlure, poison et lumière **ignorent l'armure**.
- Multiplicateurs : faiblesses (G10), « taché » +25 %, bonus de bestiaire (G14.4), Courage de Mamie (G8.9).
- Ciblage par défaut : le Grignotin **le plus avancé** sur son chemin (le plus proche de la caisse en distance de trajet). Plante et Marteau-pilon : le plus proche. Rayon : garde sa cible tant qu'elle est à portée. Mitraille : les 3 plus avancés.
- Ralentissements **non cumulables** : seul le plus fort s'applique ; la durée se rafraîchit.
- Boss : effets de contrôle (ralentissement, étourdissement, recul) ×0,5 sauf immunité indiquée.
- Colonne « Air » : peut toucher les volants (chauves-souris, corbeaux, phalènes, fantômes).
- « Orientable » : le joueur choisit l'une des 4 directions dans l'éditeur (cône, ligne ou souffle).

### G9.3 Meubles génériques (toutes les boutiques)

| ID | Meuble | Taille | Débloqué | Prix | Max / boutique | Jour (niveau 1) | Nuit (niveau 1) | PV | Air |
|---|---|---|---|---|---|---|---|---|---|
| etagere | Étagère | 1×1 | Q1, niv. 1 | 40 | 12 | présentoir, capacité 4 | **Lance-conserves** : 6 dégâts, 1,0 tir/s, portée 2,5, projectile 9 cases/s | 60 | oui |
| caisse | Caisse enregistreuse | 1×1 | départ, unique | — | 1 | encaisse en 0,6 s par client | **Canon à pièces** : 2,5 dégâts, 3,0 tirs/s, portée 2,2 ; invulnérable | — | oui |
| comptoir | Comptoir | 1×1 | Q1, niv. 2 | 20 | 16 | attractivité +1 | **Mur** : ne tire pas | 140 | — |
| plante | Plante carnivore | 1×1 | Q1, niv. 3 | 90 | 6 | attractivité +3 | **Croc** : 16 dégâts, 0,8/s, portée 1,1 ; toutes les 8 s, avale d'un coup un Grignotin (hors boss) sous 15 % de ses PV max | 90 | non |
| cafe | Machine à café | 1×1 | Q2, niv. 8 | 350 | 3 | clients à ≤ 2 cases : vitesse +20 % | **Expresso** : meubles à ≤ 1,5 case +30 % de cadence (non cumulable entre machines) | 70 | — |
| lanterne | Lanterne | 1×1 | Q3, niv. 12 | 300 | 6 | attractivité +4 | **Lumière** : révèle les invisibles à ≤ 2,5 cases ; rayon 7 dégâts (×2 contre fantômes), 1,0/s, portée 2,5 | 50 | oui |
| ventilo | Ventilateur (orientable) | 1×1 | Q4, niv. 18 | 600 | 4 | patience des clients +15 % à ≤ 2 cases | **Bourrasque** : toutes les 2,5 s, repousse d'une case les Grignotins d'un couloir de 3 cases devant lui + 4 dégâts ; boss immunisés | 80 | oui |
| aimant | Aimant géant | 1×1 | Q4, niv. 20 | 700 | 2 | attire les tas de pièces vers le marchand (rayon 3) | **Magnétisme** : Grignotins « métal » ralentis de 40 % à ≤ 2 cases ; butin attiré vers le marchand | 100 | oui |
| horloge | Horloge de Mamie (rare) | 1×1 | Q5, niv. 26 | 1 500 | 1 | journée +10 s | **Tic-tac** : ralentit de 30 % à ≤ 2 cases ; toutes les 10 s, étourdit 0,8 s à ≤ 2 cases | 150 | oui |

### G9.4 Producteurs (boutique de leur quartier uniquement)

| ID | Meuble | Taille | Débloqué | Prix | Max | Jour (niveau 1) | Nuit (niveau 1) | PV | Air |
|---|---|---|---|---|---|---|---|---|---|
| cagette | Cagette de pommes | 1×1 | Q1, niv. 1 | 60 | 4 | 1 pomme / 2,2 s, réserve 6 | **Lance-pommes** : zone rayon 0,8, 8 dégâts, 0,6/s, portée 3,5 | 60 | non |
| frigo | Frigo à lait | 1×1 | Q1, niv. 2 | 150 | 3 | 1 lait / 3,0 s, réserve 5 | **Souffle glacé** : 3 dégâts + ralentit de 40 % pendant 1,5 s, 1,0/s, portée 2,2 | 80 | oui |
| chaudron | Chaudron à confiture | 1×1 | Q1, niv. 4 | 300 | 2 | 1 confiture / 4,5 s, réserve 4 | **Confiture brûlante** : zone rayon 1,0, 6 dégâts + collant (−25 % de vitesse, 2 s), 0,5/s, portée 3,0 | 90 | non |
| four | Four à pain (orientable) | 2×1 | Q2, niv. 7 | 500 | 2 | 1 baguette / 3,5 s, réserve 6 | **Lance-flammes** : cône de 90°, longueur 2,2 ; 5 ticks/s de 2 dégâts + brûlure 3/s pendant 2 s | 140 | non |
| petrin | Pétrin | 1×1 | Q2, niv. 9 | 650 | 2 | 1 croissant / 4,0 s, réserve 5 | **Tourbillon** : toutes les 2,5 s, 12 dégâts à ≤ 1,3 case + recul de 0,5 case | 110 | non |
| vitrine | Vitrine à gâteaux | 2×1 | Q2, niv. 10 | 900 | 1 | 1 gâteau / 7,0 s, réserve 3 | **Chantilly** : 5 dégâts + ralentit de 50 % pendant 1,5 s, 1,2/s, portée 3,0 | 100 | oui |
| herbier | Herbier | 1×1 | Q3, niv. 12 | 1 100 | 3 | 1 tisane / 4,0 s, réserve 5 | **Spores** : nuage de rayon 1,0 au point visé, poison 6/s pendant 3 s, 0,5/s, portée 3,0 | 80 | non |
| pilulier | Pilulier | 1×1 | Q3, niv. 13 | 1 300 | 3 | 1 pastilles / 2,8 s, réserve 6 | **Lance-pastilles** : 4 dégâts, 2,5/s, portée 2,6 | 70 | oui |
| alambic | Alambic (rare) | 1×1 | Q3, niv. 14 | 2 400 | 1 | 1 potion / 6,5 s, réserve 3 | **Potion explosive** : zone rayon 1,3, 30 dégâts, 0,33/s, portée 4,0 | 100 | non |
| etabli | Établi (orientable) | 2×1 | Q4, niv. 18 | 3 000 | 2 | 1 clous / 3,5 s, réserve 6 | **Cloueuse** : tir perçant en ligne sur 4 cases, 14 dégâts à chaque Grignotin traversé, 0,7/s | 160 | oui |
| enclume | Enclume | 1×1 | Q4, niv. 19 | 3 600 | 1 | 1 marteau / 6,0 s, réserve 3 | **Marteau-pilon** : toutes les 3 s, 35 dégâts à ≤ 1,2 case + étourdit 0,6 s | 220 | non |
| peinture | Mélangeur de peinture | 1×1 | Q4, niv. 21 | 4 200 | 2 | 1 pot / 4,5 s, réserve 4 | **Pistolet à peinture** : 3 dégâts + « taché » (+25 % de dégâts subis, 3 s), 1,5/s, portée 3,0 | 80 | oui |
| bonbons | Distributeur de bonbons | 1×1 | Q5, niv. 24 | 6 000 | 2 | 1 bonbons / 3,0 s, réserve 6 ; attractivité +6 | **Mitraille sucrée** : 3 cibles, 4 dégâts chacune, 2,0/s, portée 2,6 | 80 | oui |
| cristal | Boule de cristal (rare) | 1×1 | Q5, niv. 28 | 9 000 | 1 | 1 boule / 8,0 s, réserve 2 | **Rayon** : 10 dégâts/s sur une cible, +50 % par seconde sur la même cible (max ×4), portée 3,2 | 90 | oui |
| pupitre | Pupitre à grimoires (rare) | 1×1 | Q5, niv. 30 | 12 000 | 1 | 1 grimoire / 10,0 s, réserve 2 | **Pages volantes** : projectile à tête chercheuse qui rebondit sur 3 cibles, 18 dégâts puis −20 % par rebond, 0,6/s, portée 3,5 | 90 | oui |

### G9.5 Comportements de nuit (architecture)
Chaque forme de nuit est un **comportement** paramétré par les données : `projectile` (une cible), `lob` (zone au sol), `cone` (ticks continus), `pulse` (zone périodique autour de soi), `auraBuff`, `auraSlow`, `melee`, `beamRamp`, `multiShot`, `pierceLine`, `push`, `light` (révèle + tire), `wall`, `homingBounce`, `stunPulse`. Ajouter un meuble = ajouter une ligne de données, jamais de code spécifique.

## G10. Les Grignotins

### G10.1 Tableau des Grignotins (valeurs de base, semaine 1, nuit 1 du Q1)

| ID | Grignotin | PV | Armure | Vitesse (cases/s) | Vol | Butin | Menace | Spécial | Apparaît |
|---|---|---|---|---|---|---|---|---|---|
| raton | Raton chapardeur | 25 (M10 : 20) | 0 | 1,0 | 4 % | 2 | 1 | aucun : le Grignotin de base | Q1 N1 |
| souris | Souris grignoteuse | 11 (M10 : 9) | 0 | 1,8 | 2 % | 1 | 0,5 | arrive en groupes de 3 à 5 | Q1 N2 |
| gloubi | Gloubi | 62 (M10 : 50) | 0 | 0,6 | 6 % | 3 | 2 | en mourant, se divise en 2 mini-gloubis (PV 17, M10 : 14 ; vitesse 0,9, vol 2 %, butin 1) ; feu ×1,5 | Q1 N4 |
| termite | Termite rongebois | 42 (M10 : 34) | 0 | 0,8 | 4 % | 3 | 1,5 | s'arrête 1 s pour ronger chaque meuble voisin de son chemin (10 dégâts/s) | Q1 N5 |
| chauvesouris | Chauve-souris | 14 | 0 | 1,4 | 3 % | 2 | 1 | vole : ignore le labyrinthe | Q2 N1 |
| herisson | Hérisson | 44 | 3 | 0,9 | 5 % | 4 | 2 | armure ; feu et poison l'ignorent | Q2 N2 |
| champiboum | Champiboum | 18 | 0 | 1,1 | 0 % | 2 | 1 | explose au contact d'un meuble : 40 dégâts aux meubles à ≤ 1 case ; étourdit le marchand 0,8 s s'il est à ≤ 1 case | Q2 N4 |
| fantome | Fantôme | 26 | 0 | 0,9 | 5 % | 4 | 2 | invisible et non ciblable hors lumière ; traverse les meubles ; lumière ×2 | Q3 N1 |
| lutin | Lutin farceur | 30 | 0 | 1,0 | 6 % | 4 | 2 | toutes les 4 s, se téléporte 2 cases plus loin sur son chemin (signalé 0,5 s avant) | Q3 N3 |
| gourmand | Gros Gourmand | 200 | 4 | 0,5 | 15 % | 15 | 6 | lent et costaud ; immunisé au recul | Q3 N5 |
| corbeau | Corbeau voleur | 20 | 0 | 1,7 | 5 % | 3 | 1,5 | vole ; arrive en V de 3 | Q4 N1 |
| golem | Golem de ferraille | 360 | 8 | 0,45 | 20 % | 25 | 10 | métal (l'aimant le ralentit) ; ralentissements de froid ×0,5 | Q4 N3 |
| phalene | Phalène | 24 | 0 | 1,2 | 4 % | 3 | 1,5 | vole ; attirée par les lanternes, qu'elle attaque (6 dégâts/s) | Q5 N1 |
| raton_dore | Raton doré | 50 (M10 : 40) | 0 | 1,5 | 4 % | 20 | 0 | rare (G8.8) ; traînée d'étincelles | tous |

Faiblesses visibles : chaque Grignotin a une petite icône d'élément au-dessus de la tête quand il est visé pour la première fois (flamme pour le gloubi et le hérisson, soleil pour le fantôme).

### G10.2 Mise à l'échelle
- PV = PV de base × M_Q × (1 + 0,12 × (k − 1)) × 1,35^(s − 1), avec M_Q = 1,0 / 2,0 / 3,6 / 6,2 / 10,0 pour Q1 à Q5, k la nuit de la semaine, s la semaine.
- Butin = butin de base × (1 + 0,6 × (Q − 1)) × (1 + 0,1 × (s − 1)).
- Vitesse, armure et % de vol ne changent jamais.

### G10.3 Les boss (Pleine Lune)

| Boss | Quartier | PV (semaine 1) | Armure | Vitesse | Vol | Butin | Capacités |
|---|---|---|---|---|---|---|---|
| Le Roi Raton | Q1 | 1 125 (M10 : 900) | 2 | 0,55 | 35 % | 150 | toutes les 4,8 s (M10 : 6 s), invoque 3 ratons ; immunisé au recul ; fuit à 0,75 case/s |
| La Grande Pâte | Q2 | 1 700 | 0 | 0,5 | 35 % | 250 | à 66 % et 33 % de PV, se scinde et lâche 4 gloubis ; feu ×1,5 ; ralentissements ×0,5 |
| La Dame Blanche | Q3 | 1 500 | 0 | 0,6 | 35 % | 350 | traverse les meubles ; disparaît 3 s toutes les 7 s hors lumière ; invoque 2 fantômes toutes les 10 s ; lumière ×2 |
| Le Ferrailleur | Q4 | 3 400 | 10 | 0,4 | 40 % | 500 | frappe les meubles voisins (30 dégâts/s) ; immunisé au recul et à l'étourdissement ; métal |
| La Reine Phalène | Q5 | 4 800 | 2 | 0,6 | 40 % | 800 | vole ; éteint les lanternes à ≤ 2 cases pendant 4 s toutes les 9 s ; invoque 4 chauves-souris toutes les 8 s |

- Les PV des boss sont ceux de la semaine 1, × 1,35^(s − 1) ensuite (pas de multiplicateur de nuit).
- Entrée d'un boss : ralenti de 0,4 s, zoom de caméra ×1,08, carte de présentation (silhouette + nom), changement de couche musicale.
- Une barre de PV du boss apparaît en haut de l'écran.

### G10.4 Calendrier d'apparition et poids des vagues

| Quartier | Nuit 1 | Nuit 2 | Nuit 3 | Nuit 4 | Nuit 5 | Nuit 6 | Nuit 7 |
|---|---|---|---|---|---|---|---|
| Q1 Épicerie | raton (porte de derrière) | + souris | + fenêtre gauche | + gloubi | + fenêtre droite, + termite | mélange | Roi Raton |
| Q2 Boulangerie | + chauve-souris (cheminée) | + hérisson | mélange | + champiboum | mélange | mélange | Grande Pâte |
| Q3 Pharmacie | + fantôme (obscurité) | + trappe | + lutin | mélange | + gros gourmand | mélange | Dame Blanche |
| Q4 Quincaillerie | + corbeau | mélange | + golem | mélange | mélange | mélange | Ferrailleur |
| Q5 Emporium | + phalène | mélange | mélange | mélange | mélange | mélange | Reine Phalène |

À partir du Q2, toutes les entrées déjà connues sont actives dès la nuit 1. Poids de tirage (seuls les types déjà introduits sont éligibles) :

| Quartier | Poids |
|---|---|
| Q1 | raton 40, souris 25, gloubi 20, termite 15 |
| Q2 | raton 15, souris 15, chauve-souris 20, hérisson 20, champiboum 15, gloubi 15 |
| Q3 | fantôme 25, lutin 20, gros gourmand 10, chauve-souris 15, hérisson 15, termite 15 |
| Q4 | corbeau 20, golem 10, gros gourmand 15, hérisson 20, champiboum 15, lutin 20 |
| Q5 | phalène 25, corbeau 15, fantôme 15, golem 10, lutin 15, gloubi 10, champiboum 10 |

## G11. Le marchand, Moka et le personnel

### G11.1 Améliorations du marchand (onglet Marchand, dès le niveau 2)

| Amélioration | Effet au niveau 1 | Gain par niveau | Niveau max | Coûts des niveaux 2, 3, 4… |
|---|---|---|---|---|
| Baskets | vitesse 3,0 cases/s | +0,15 case/s | 9 (4,2) | 80, 180, 400, 850, 1 700, 3 300, 6 500, 12 000 |
| Panier | pile de 4 articles | +1 article | 11 (14) | 60, 140, 300, 650, 1 300, 2 600, 5 000, 9 000, 16 000, 28 000 |
| Balai | 4,5 dégâts toutes les 1 s, rayon 0,68 (M10 : 6 / 0,8 s / 0,9) ; réparation 12 PV/s | dégâts +20 %, réparation +10 % | 10 | 100, 250, 600, 1 300, 2 600, 5 000, 9 000, 16 000, 30 000 |
| Sifflet | aura +35 % de cadence, rayon 1,6 | +5 % | 6 (+60 %) | 300, 900, 2 500, 6 000, 14 000 |
| Cloche | 14 Grignotins vaincus pour charger ; étourdit 1,5 s + 15 dégâts | −1 Grignotin, +0,1 s | 6 | 400, 1 200, 3 000, 7 000, 15 000 |

### G11.2 Moka, le chat de Mamie (niveau 5)
- Arrivée : Moka saute sur la caisse, s'étire, miaule, puis suit le marchand (retard 0,4 s, décalage 0,6 case).
- Jour : toutes les 8 s, il rapporte au marchand un tas de pièces situé à ≤ 3 cases.
- Nuit : bondit sur le Grignotin le plus proche de lui à ≤ 2,0 cases : 9 dégâts, 1,0/s, touche les volants. Il ne peut pas être blessé.
- Niveaux 1 à 10 avec des **croquettes** : 5, 10, 20, 35, 55, 80, 110, 150, 200 croquettes pour les niveaux 2 à 10. Dégâts ×1,18 par niveau ; portée +0,1 case aux niveaux 4, 7 et 10.
- Cosmétiques propres (G17).

### G11.3 Personnel (niveau 10, par boutique)

| Rôle | Effet au niveau 1 | Gain par niveau | Max | Embauche | Niveaux 2 à 5 |
|---|---|---|---|---|---|
| Commis (2 par boutique max) | porte 3 articles à 2,2 cases/s ; remplit d'abord l'étagère la plus vide | +1 article, +0,2 case/s | 5 | 1 500 × Q | 2 000, 4 000, 8 000, 15 000 (× Q) |
| Caissier (1 max) | encaisse en 0,9 s | −0,1 s (min 0,5 s) | 5 | 2 500 × Q | 3 000, 6 000, 12 000, 24 000 (× Q) |

Le personnel travaille le jour (et pendant l'absence, G16) ; la nuit, il dort dans un coin (« Zzz ») sans gêner personne.

## G12. Économie

### G12.1 Monnaies

| Monnaie | Gagnée par | Sert à |
|---|---|---|
| Pièces | ventes, pourboires, Bocal, butin, coffres, quêtes, calendrier, livraison du matin | meubles, niveaux de meubles, marchand, recettes, agrandissements, personnel |
| Plans (par meuble) | coffres, quêtes, calendrier, Défi du jour, succès | niveaux de meubles |
| Rubis | quêtes, succès, calendrier, Défi du jour, série, pub « Rubis du jour », événements | **uniquement** des cosmétiques (et rallumer la série) |
| Croquettes | quêtes, coffres d'argent, d'or et de Lune, calendrier | niveaux de Moka |
| XP | ventes, clients, nuits, boss, quêtes | niveau de marchand |

### G12.2 La règle d'or
Plans, niveaux et statistiques ne s'achètent jamais, ni en argent réel ni en rubis. Les pubs accélèrent un peu, elles ne débloquent jamais rien d'exclusif.

### G12.3 XP et niveau de marchand
- XP gagnée : article vendu 2 × X_Q ; client servi 1 × X_Q ; nuit 15 × étoiles × X_Q ; boss vaincu 100 × X_Q ; quête du jour 40 × X_Q. X_Q = 1 / 2 / 3,2 / 4,6 / 6,4 selon le quartier de la boutique où l'on joue.
- XP pour passer au niveau suivant :

| Niveaux | 1→2 | 2→3 | 3→4 | 4→5 | 5→6 | 6→7 | 7→8 | 8→9 | 9→10 | 10→11 | 11→12 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| XP | 120 | 150 | 200 | 240 | 280 | 320 | 650 | 700 | 750 | 800 | 850 |

| Niveaux | 12→13 | 13→14 | 14→15 | 15→16 | 16→17 | 17→18 | 18→19 | 19→20 | 20→21 | 21→22 | 22→23 | 23→24 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| XP | 1 150 | 1 200 | 1 250 | 1 300 | 1 350 | 1 400 | 1 700 | 1 750 | 1 800 | 1 850 | 1 900 | 1 950 |

| Niveaux | 24→25 | 25→26 | 26→27 | 27→28 | 28→29 | 29→30 | 30→40 |
|---|---|---|---|---|---|---|---|
| XP | 2 900 | 3 000 | 3 100 | 3 200 | 3 300 | 3 400 | 3 600 + 200 × (niveau − 30) |

- Calibrage du début : avec ces valeurs, les niveaux 2, 3 et 4 sont atteints à l'aube des cycles 1, 2 et 3 (l'XP des ventes ne suffit jamais seule à franchir ces paliers pendant la journée).
- *M11 (règle, DECISIONS.md) :* pendant le Jour et la Nuit, l'XP s'additionne mais le passage de niveau attend l'aube (ruban de G19 à 2:57 et 6:30) ; au Matin (quêtes), il est immédiat. Le niveau à la fin de chaque cycle ne change pas ; avec le Rush et la Commande spéciale, un joueur efficace franchissait sinon le niveau 3 en pleine journée 2.
- Niveau maximum 40. Au-delà du niveau 30 : +2 % de ventes par niveau (jusqu'à +20 %) et un badge.

### G12.4 Déblocages par niveau de marchand

| Niveau | Débloque |
|---|---|
| 1 | Étagère, Cagette, Caisse, coffres, niveaux de meubles |
| 2 | Frigo à lait, Comptoir, Calendrier, améliorations du marchand |
| 3 | Aménagement, Plante carnivore |
| 4 | Chaudron à confiture, Quêtes du jour, Défi du jour |
| 5 | Moka, Agrandissement E1, Recettes |
| 6 | Garde-robe et rubis, Bestiaire, Succès |
| 7 | Quartier 2 (si le Roi Raton est vaincu), Four à pain |
| 8 | Machine à café, Quêtes de la semaine |
| 9 | Pétrin, Agrandissement E2 |
| 10 | Vitrine à gâteaux, Personnel |
| 12 | Quartier 3 (si la Grande Pâte est vaincue), Lanterne, Herbier |
| 13 | Pilulier |
| 14 | Alambic, Agrandissement E3 |
| 16 | Nuit sans fin, Franchise de quartier |
| 18 | Quartier 4 (si la Dame Blanche est vaincue), Établi, Ventilateur |
| 19 | Enclume |
| 20 | Aimant géant |
| 21 | Mélangeur de peinture |
| 24 | Quartier 5 (si le Ferrailleur est vaincu), Distributeur de bonbons |
| 26 | Horloge de Mamie |
| 28 | Boule de cristal |
| 30 | Pupitre à grimoires |

- Un déblocage est fêté **au Matin suivant** (une carte par déblocage, 3 au maximum, les autres regroupées), avec une silhouette qui se révèle. Pendant le jour ou la nuit, seule une petite bannière « Niveau 5 ! » s'affiche.
- Un quartier exige le boss précédent vaincu **et** le niveau. Si le boss est vaincu mais le niveau manque, la carte affiche « Niveau 12 requis » avec la barre d'XP, et le joueur continue en semaine 2 du quartier actuel.

### G12.5 Rythme visé (bot Moyen, vérifié par D2)

| Moment | Cible |
|---|---|
| Premier achat (P1) | ≤ 0:45 de jeu |
| Première nuit | ≈ 1:45 |
| Premier coffre ouvert | ≤ 2:45 |
| Première amélioration de meuble | ≤ 3:10 |
| Niveau 3 (aménagement) | fin du cycle 2 |
| Niveau 4 (quêtes, Défi du jour) | fin du cycle 3 |
| Niveau 5 (Moka) | cycle 4 ou 5 |
| Roi Raton vaincu | cycle 7 à 10 |
| Achat utile disponible | au moins tous les 2 cycles |

Ordres de grandeur des gains par cycle (Moyen) : Q1 300 à 800 pièces ; Q2 1 500 à 2 500 ; Q3 3 000 à 4 500 ; Q4 4 500 à 7 000 ; Q5 8 000 à 12 000.

### G12.6 Agrandissements et recettes
- E1 : 300 × m_Q (niveau 5) ; E2 : 1 500 × m_Q (niveau 9) ; E3 : 6 000 × m_Q (niveau 14), avec m_Q = 1 + 0,75 × (Q − 1). Chaque boutique s'agrandit séparément.
- Recettes : G7.5.

### G12.7 Coffres

| Coffre | Pièces | Plans | Types de plans | Croquettes | Rubis | Plan rare |
|---|---|---|---|---|---|---|
| Bois (★) | 25–45 × m_Q | 6 × p_Q | 2 | 0 | 0 | 0 % |
| Argent (★★) | 70–120 × m_Q | 14 × p_Q | 3 | 2 | 0 | 10 % |
| Or (★★★) | 180–300 × m_Q | 30 × p_Q | 4 | 5 | 2 | 25 % |
| Lune (boss) | 600 × m_Q | 70 × p_Q | 5 | 10 | 10 | 100 % si un meuble rare est débloqué, + le cosmétique du quartier la 1re fois |
| Bienvenue (retour) | 150 × m_Q | 14 × p_Q | 3 | 2 | 5 | 10 % |

- p_Q = 1 + 0,25 × (Q − 1).
- **Premier coffre du jeu** (nuit 1) : coffre en bois au contenu fixe : 30 pièces, 4 plans Étagère, 2 plans Cagette (garantit la première amélioration).
- Tirage des plans : parmi les meubles débloqués, 70 % de chances pour un meuble possédé, 30 % pour un débloqué non possédé ; poids ×1,5 pour un meuble à qui il manque des plans pour son prochain niveau ; un type rare donne un tiers des plans tirés.
- Ouverture : 3 taps (le coffre tremble de plus en plus), puis les cartes sortent une par une (G20.6).

## G13. Contenu et modes

### G13.1 Campagne : 5 quartiers

| Quartier | Lieu | Accent | Produits | Nouveaux meubles | Nouveaux Grignotins | Boss | Entrées |
|---|---|---|---|---|---|---|---|
| Q1 L'Épicerie de Mamie | Rue des Pommiers | #FF4F5E | pomme, lait, confiture | étagère, comptoir, plante, cagette, frigo, chaudron | raton, souris, gloubi, termite | Roi Raton | porte de derrière, fenêtres |
| Q2 La Boulangerie | Place du Four | #FF9F43 | baguette, croissant, gâteau | four, pétrin, vitrine, machine à café | chauve-souris, hérisson, champiboum | Grande Pâte | + cheminée |
| Q3 La Pharmacie de l'Alchimiste | Ruelle des Brumes | #9B5DE5 | pastilles, tisane, potion | lanterne, herbier, pilulier, alambic | fantôme, lutin, gros gourmand | Dame Blanche | + trappe |
| Q4 La Quincaillerie | Quai des Forges | #4D96FF | clous, peinture, marteau | établi, enclume, peinture, ventilateur, aimant | corbeau, golem | Ferrailleur | toutes |
| Q5 L'Emporium Magique | Colline de la Lune | #2EC4B6 | bonbons, boule de cristal, grimoire | bonbons, boule de cristal, pupitre, horloge | phalène | Reine Phalène | toutes |

- Chaque quartier a **sa propre boutique** : disposition, exemplaires de meubles, agrandissements, personnel, recettes, semaine en cours. Sont **globaux** : pièces, rubis, croquettes, plans, niveaux des meubles, niveau de marchand, cosmétiques, Moka.
- **Semaines** : après la victoire sur le boss, la semaine 2 commence, puis 3, etc., sans fin (G8.3, G10.2). Chaque Pleine Lune vaincue redonne un Coffre de Lune : c'est la boucle de récolte des plans.
- **Carte des quartiers** (au Matin) : une rue du village avec 5 façades ; un tap change de boutique ; les quartiers verrouillés ont un cadenas et leur condition.

### G13.2 Nuit sans fin (niveau 16)
- Choisir une boutique : sa disposition et ses meubles sont utilisés tels quels.
- Vagues infinies : budget de la vague i = 6 × 1,12^(i − 1) × F_Q ; PV × 1,08^(i − 1) en plus de la mise à l'échelle du quartier ; types : ceux du quartier et des quartiers précédents.
- Le Bocal vaut 1 000 points ; chaque vol en retire ; la partie s'arrête à 0. Score = vagues tenues.
- Récompenses : un coffre en bois toutes les 5 vagues (3 coffres par jour au maximum dans ce mode) ; record personnel → succès.
- Tableau des **Rivaux simulés** de la semaine : 15 boutiques aux noms générés (« Chez Paulette », « La Boutique des Hiboux »…), scores tirés à partir de la graine de la semaine UTC autour de la tranche de niveau du joueur. Toujours étiqueté « Rivaux simulés » : on ne fait jamais croire à de vrais joueurs.

### G13.3 Défi du jour (niveau 4)
- Graine = hash du jour UTC : **le même défi pour tout le monde**.
- Contenu : une boutique E1 (6 × 7) aux couleurs d'un quartier tiré au sort, 8 à 10 meubles imposés (tous au niveau 5, pris dans tout le catalogue), 5 vagues fixes tirées dans tout le bestiaire. Un joueur débutant y découvre des meubles et des Grignotins qu'il ne possède pas encore (étiquette « NOUVEAU ») : c'est aussi une vitrine du contenu futur.
- Déroulé : aménagement libre des meubles imposés, puis la nuit.
- Score = arrondi(1 000 × Bocal gardé) + 25 × voleurs rattrapés + 100 si aucun meuble cassé + 50 × vagues sans aucun vol. Étoiles : mêmes seuils qu'une nuit.
- Seule la **première** tentative du jour UTC est récompensée et compte pour le classement ; ensuite, mode Entraînement sans récompense.
- Récompenses : ★ ou ★★ : 3 rubis + coffre en bois ; ★★★ : 5 rubis + coffre d'argent.
- **Partager** (`navigator.share` si disponible, sinon copie dans le presse-papiers avec repli, puis « Copié ! ») :
```
Fort Boutique — Défi du 19/10/2026 🌙
★★★ 1 240 pts
🟩🟩🟨🟩🟩
https://{owner}.github.io/fort-boutique/
```
  🟩 vague sans vol ; 🟨 vol rattrapé ; 🟥 vol perdu.
- Classement des **Rivaux simulés du jour** : 20 scores tirés à partir de la graine du jour (loi normale de moyenne 900 et d'écart-type 150, bornée entre 300 et 1 400), avec le rang du joueur.

### G13.4 Franchise de quartier (niveau 16, boss du quartier vaincu au moins une fois)
- Bouton « Franchiser » sur la carte : la semaine de ce quartier repart à 1, la disposition et les meubles sont conservés, et la boutique passe en **Lune rouge** : PV des Grignotins × (1,5 + 0,5 × étoiles de franchise actuelles).
- Battre à nouveau le boss → +1 **étoile de franchise** pour cette boutique (5 max) : +10 % de ventes et +10 % de butin par étoile, de façon permanente, et une enseigne de plus en plus prestigieuse (bois, bronze, argent, or, lune).

### G13.5 Événements de la semaine (hors ligne, rotation selon `utcWeek mod 6`)

| # | Événement | Effet | Défi de la semaine | Récompense |
|---|---|---|---|---|
| 0 | Semaine des Gloubis | gloubis ×2 dans les vagues, leur butin ×1,5 | vaincre 150 gloubis | chapeau « Gloubi » pour Moka |
| 1 | Marché aux petits prix | le produit le moins cher de chaque quartier se vend ×1,5 | vendre 300 de ces articles | tablier « Pomme » |
| 2 | Nuits venteuses | Grignotins +15 % de vitesse, butin ×1,3 | 10 nuits ★★ ou mieux | effet de pièces « feuilles » |
| 3 | Festival des lanternes | une lanterne prêtée dans chaque boutique (la Pharmacie en reçoit deux), fantômes ×2 | vaincre 100 fantômes | lanterne en papier (cosmétique) |
| 4 | Fête de Mamie | XP ×1,25, coffre d'argent bonus le dimanche | réussir 20 commandes spéciales | tablier « Mamie » |
| 5 | Semaine des Ratons | ratons ×2, Raton doré une nuit sur 5 | vaincre 300 ratons | couronne du Roi Raton pour le marchand |

Une bannière au Matin annonce l'événement avec son compte à rebours. Les récompenses déjà obtenues ne se regagnent pas (on reçoit 20 rubis à la place).

### G13.6 Saisons (date UTC)
- **Halloween** (15 oct. – 5 nov.) : citrouilles dans la boutique, Grignotins déguisés (petits chapeaux), 3 cosmétiques exclusifs. Le jeu sortant fin octobre, cette saison sera active au lancement.
- **Hiver** (1er – 31 déc.) : neige aux fenêtres, guirlandes, 3 cosmétiques.
- **Printemps** (20 mars – 10 avr.) et **Été** (1er – 31 juil.) : décor et 2 cosmétiques chacun.
- Pendant une saison : XP +10 %. Saisons et événements de la semaine se cumulent.

## G14. Quêtes, succès, bestiaire

### G14.1 Quêtes du jour (niveau 4 ; 3 par jour UTC, tirées à graine)
Q = quartier le plus avancé débloqué.
1. Servir {30 + 10 × Q} clients.
2. Vendre {12 + 4 × Q} {un produit exposé}.
3. Réussir une nuit ★★★.
4. Rattraper {2 + floor(Q / 2)} voleurs.
5. Vaincre {40 + 15 × Q} Grignotins.
6. Améliorer 1 meuble.
7. Ouvrir 2 coffres.
8. Terminer le Défi du jour.
9. Encaisser {150 × m_Q} pièces en une journée.
10. Servir 3 VIP.
11. Réussir une commande spéciale.
12. Utiliser la Cloche 3 fois.
13. Finir un Rush sans client fâché.
14. Ramasser {60 × m_Q} pièces de butin.
15. Déplacer 3 meubles dans l'aménagement.

Récompenses : 1re quête 80 × m_Q pièces + 4 plans ; 2e quête 3 rubis + 2 croquettes ; 3e quête coffre d'argent ; les 3 → +5 rubis. Une relance gratuite par jour (+1 avec une pub). Une quête impossible avec les déblocages actuels n'est jamais tirée.

### G14.2 Quêtes de la semaine (niveau 8 ; 5 par semaine UTC)
Vaincre une Pleine Lune ; servir 400 clients ; gagner 15 étoiles ; terminer 5 Défis du jour ; monter 5 niveaux de meubles. Chacune : un coffre d'or ; les 5 : Coffre de Lune + cosmétique de la semaine.

### G14.3 Succès (niveau 6 ; environ 45, récompensés en rubis)
- Commerce : articles vendus 100 / 1 000 / 10 000 / 100 000 (5 / 10 / 20 / 40) ; VIP servis 10 / 100 (5 / 15).
- Défense : nuits ★★★ 1 / 10 / 50 / 200 (5 / 10 / 20 / 40) ; voleurs rattrapés 10 / 100 / 500 (5 / 15 / 30).
- Boss : chaque boss vaincu (10 chacun) ; chaque boss vaincu en semaine 5 (20 chacun).
- Collection : meubles différents possédés 5 / 12 / 24 (5 / 15 / 40) ; un meuble au niveau 5 / 10 (10 / 40).
- Défi du jour : série de 3 / 7 / 30 jours (5 / 15 / 50).
- Bestiaire : 100 vaincus de chaque type (3 chacun).
- Moka : niveau 5 / 10 (10 / 25).
- Franchise : 1 / 5 / 25 étoiles au total (10 / 25 / 60).

### G14.4 Bestiaire
Une carte par Grignotin (silhouette tant qu'il n'a pas été rencontré). Paliers de victoires : 25 / 250 / 2 500 → +3 % / +6 % / +10 % de dégâts contre ce type (seul le palier le plus haut compte) + 2 / 5 / 10 rubis.

## G15. Calendrier et série

### G15.1 Calendrier de 7 jours (niveau 2)
Une réclamation par jour UTC ; les jours n'ont pas besoin d'être consécutifs ; le cycle recommence après J7.

| J1 | J2 | J3 | J4 | J5 | J6 | J7 |
|---|---|---|---|---|---|---|
| 150 × m_Q pièces | coffre d'argent | 10 rubis | 20 plans (au choix parmi 3 meubles possédés) | coffre d'or | 10 croquettes + 10 rubis | Coffre de Lune + cosmétique du calendrier (rotation de 8) |

Affichage : 7 étiquettes kraft suspendues à une ficelle ; celle du jour se balance ; celle de demain montre un cadenas et le compte à rebours.

### G15.2 Série (la flamme de la boutique)
- +1 si au moins une nuit est terminée dans la journée UTC.
- Bonus : +2 % de pièces par jour de série (maximum +20 % à 10 jours).
- Paliers 3 / 7 / 14 / 30 / 100 jours : 5 / 15 / 25 / 50 / 100 rubis ; flamme bleue à 30 jours, dorée à 100.
- **Gel de série** : un gel offert à chaque palier de 7 jours (2 en réserve au maximum), consommé automatiquement un jour manqué [S10].
- Flamme éteinte : pendant 48 h, « Rallumer » avec une pub (une fois par semaine) ou 20 rubis. Jamais de message culpabilisant.

## G16. Hors ligne et retour
- **Livraison du matin** (absence ≥ 15 min) : les réserves des producteurs sont pleines ; chaque boutique qui a au moins 1 commis et 1 caissier rapporte 0,2 × (recette de son dernier jour ÷ durée de ce jour en minutes) × minutes d'absence, plafonné à 8 h. Ticket « Pendant ton absence » + bouton ×2 (pub).
- **Coffre de Bienvenue** après une absence de 3 jours ou plus (une fois par absence), avec une lettre illustrée de Mamie.
- **Rien ne se perd** : aucun vol hors ligne, aucune dégradation ; la série a son gel.
- Pas de notifications (web) : les raisons de revenir sont visibles dans le jeu (coffre de demain, Pleine Lune, livraison).

## G17. Cosmétiques (Garde-robe, niveau 6 ; rubis uniquement)
Un joueur régulier gagne environ 15 à 20 rubis par jour (quêtes ~8, calendrier ~5, Défi 3 à 5, pub 3).

| Catégorie | Objets et prix en rubis |
|---|---|
| Tenues du marchand | Tablier rayé (de base), Chapeau de paille 30, Salopette 40, Toque 50, Bonnet de laine 60 (Hiver), Chapeau citrouille 80 (Halloween), Cape de sorcier 90, Armure en carton 120, Costume de lune 150, Tablier Pomme (événement), Tablier Mamie (événement), Couronne du Roi Raton (événement) |
| Moka | Nœud papillon 20, Bonnet 40, Lunettes rondes 40, Écharpe 50 (Hiver), Couronne 60, Citrouille 60 (Halloween), Cape 70, Casque de chevalier 90, Auréole 100, Chapeau Gloubi (événement) |
| Thèmes de boutique (sol + murs) | Classique (de base), Pastel 150, Forêt 200, Bonbon 220, Néon nocturne 250, Halloween 200 (saison), Hiver 200 (saison) |
| Effets | Traînée de pas 80, Confettis de victoire 100, Pièces-étoiles 120, Pièces-cœurs 120, Pièces-feuilles (événement) |
| Yeux des meubles | Ronds (de base), Endormis 60, Lunettes 60, Grands cils 60, Sourcils froncés 60 |
| Enseignes | Bois (de base), Néon 150, Dorée 200, Lune (Coffre de Lune), Franchise bronze à lune (franchise) |

Les achats sont enregistrés dans `purchases` et `cosmetics` (G23) et ne sont jamais perdus. Plus tard (hors version 1), seuls des packs de rubis et un « Pack sans pub » pourront être vendus en argent réel ; le champ `purchases.noAds` existe déjà.

## G18. Publicités [S5][S6][S7][S8]

### G18.1 Placements récompensés (toujours au choix du joueur)

| ID | Où | Récompense | Plafond |
|---|---|---|---|
| rw_double_night | Aube | pièces de la nuit ×2 (Bocal + butin, jamais les plans) | 1 par nuit |
| rw_bonus_chest | Aube après ★★★ | +1 coffre en bois | 3 par jour |
| rw_morning_delivery | Livraison du matin | ×2 | 1 par retour |
| rw_daily_rubies | Garde-robe | +3 rubis | 1 par jour |
| rw_quest_reroll | Quêtes | relancer une quête | 1 par jour |
| rw_streak_restore | Série | rallumer la flamme | 1 par semaine |
| rw_boss_retry | Échec de Pleine Lune | rejouer tout de suite avec +25 % de dégâts | 2 par jour |

Plafond global : 12 pubs récompensées par jour UTC. Bouton : étiquette dorée avec une petite télé et la récompense (« ×2 »).

### G18.2 Interstitielle (une seule : `it_dawn`)
Uniquement au passage Aube → Matin, et seulement si **toutes** ces conditions sont vraies : niveau ≥ 5 ; au moins 15 min de jeu cumulé ; au moins 3 cycles et 4 min depuis la dernière ; aucune pub récompensée dans les 3 dernières minutes ; pas juste après une victoire de boss ou un déblocage ; `purchases.noAds` faux ; 6 par jour UTC au maximum.

### G18.3 Interdits
Jamais de bannière, jamais de pub au lancement, jamais pendant le Jour, la Nuit, l'aménagement ou les 10 premières minutes, jamais une pub qui interrompt un geste.

## G19. Les 10 premières minutes, seconde par seconde

**Principes [S9] :** aucune phrase à lire. On enseigne par l'image : main fantôme qui montre le geste, flèche dorée au sol, halo qui pulse. Un indice n'apparaît qu'après 4 s sans l'action attendue, disparaît dès qu'elle est faite et ne bloque jamais : le joueur peut tout faire dans le désordre. Seuls textes autorisés pendant ces 10 minutes : des nombres, « RUSH! » et « NOUVEAU ». On n'apprend qu'une chose à la fois, au moment où elle sert.

*M11 (réalisation) :* deux sortes d'aide. Le **guide** du tout premier jour (0:06 à 0:40) : la flèche dorée au sol montre tout de suite l'étape suivante (Cagette A, Étagère A, caisse qui brille, emplacement payable), comme dans le tableau ; la main fantôme du geste est là dès 0:06. Les **indices** : main fantôme, halo, flèche, traînée rouge, seulement après 4 s sans l'action attendue (3 s pour un voleur : « réagir », c'est s'en approcher au joystick) ; ils disparaissent dès qu'il agit. Ils servent pendant les 3 premiers cycles. Un geste appris (prise, dépose, encaissement, premier achat, aura, voleur rattrapé par le marchand) est sauvegardé et ne revient pas. Aube : 2,5 s de pluie de pièces, ticket ≈ 10 s, cartes une par seconde, ruban de niveau après l'amélioration (ou 6 s après les cartes) ; la sortie, elle, ne bloque jamais. Mesures : docs/playtests/P2.md.

| Temps | Ce que le joueur voit et entend | Ce qu'il fait | Ce qu'il apprend |
|---|---|---|---|
| 0:00 | Écran titre : la façade de nuit ; l'enseigne crénelée « Fort Boutique » ouvre ses deux yeux ; boîte à musique ; un doigt animé tape | Tape n'importe où | — (le son démarre, « ding » de porte) |
| 0:02 | Fondu vers l'intérieur poussiéreux au matin ; le portrait de Mamie fait un clin d'œil ; une enveloppe tombe sur la caisse et brille | Tape l'enveloppe | Une clé en sort, tourne dans la porte, les rideaux s'ouvrent, la lumière entre : c'est ta boutique |
| 0:06 | **Jour 1 (90 s).** Le marchand apparaît ; une main fantôme glisse en bas de l'écran ; une flèche dorée au sol pointe vers la Cagette A, où des pommes poussent en « pop » | Pose le doigt et glisse | Le joystick suit le doigt, n'importe où |
| 0:10 | Près de la cagette, 4 pommes sautent sur sa tête une par une (notes qui montent) | Rien | On ramasse en passant |
| 0:13 | La flèche passe sur l'Étagère A | Va à l'étagère | On pose en passant (tocs en bois) |
| 0:16 | « Ding » : le premier client entre, prend une pomme et file à la caisse ; la caisse brille | Va près de la caisse | On encaisse en étant à côté (« ka-ching », pièces qui volent vers le compteur) |
| 0:22 | Les clients s'enchaînent toutes les 4 s environ | Boucle cagette → étagère → caisse | Le rythme de base |
| 0:25 | Un carré pointillé doré « 40 » apparaît (P1), une grosse pièce rebondit au-dessus ; l'étiquette « Prochain objectif » montre P1 et sa barre | Gagne 40 pièces | L'objectif est toujours affiché en haut à gauche |
| ~0:40 | Il se tient sur P1 : les pièces volent dans le carré (ticks qui montent), « pop » : l'Étagère B tombe du ciel dans un nuage de poussière | **Premier achat** | Acheter = rester dessus |
| 0:45 | P2 (Cagette B, 60) apparaît ; les clients arrivent un peu plus vite | Gère seul | Plus d'indice tant qu'il agit |
| ~1:05 | Une étagère se vide : un client attend avec une bulle « ? » et l'icône de la pomme | Remplit l'étagère | Garder les étagères pleines (un client déçu part, sans autre pénalité) |
| ~1:15 | P2 construit | **Deuxième achat** | — |
| 1:25 | Le soleil approche de l'horizon (barre du haut), lumière orangée, la musique se feutre | Dernières ventes | La journée a une fin |
| 1:36 | L'enseigne passe sur « Fermé » ; les derniers clients sortent (6 s) | — | — |
| 1:42 | **Crépuscule (4 s)** : les lampes s'allument une à une, le ciel devient violet, puis **tous les meubles ouvrent les yeux** ; l'étagère sort un petit canon, la caisse un canon à pièces | Regarde | La boutique se transforme (moment signature) |
| 1:46 | **Nuit 1** : la porte de derrière tremble ; une bulle avec 3 icônes de raton pulse | Se place | Les Grignotins viennent de là |
| 1:49 | Vague 1 : 3 ratons marchent vers la caisse ; les meubles tirent seuls ; « pouf », pièces. Quand le marchand passe près d'un meuble, un cercle de craie pulse et le meuble tire plus vite (main fantôme s'il reste immobile 4 s) | Reste près des meubles | L'aura du marchand |
| ~2:03 | Dernier raton : ralenti, bannière « Vague 1/2 » cochée | — | Une vague se gagne |
| ~2:08 | Vague 2 : 4 ratons ; le 4e (scénarisé, plus rapide) atteint la caisse, prend des pièces du Bocal (« oh-oh ») et s'enfuit avec un sac ; flèche rouge pulsante au-dessus de lui | Le poursuit et le frappe (s'il ne réagit pas en 3 s, le voleur ralentit de moitié, uniquement cette nuit-là) | Rattraper un voleur rend les pièces, avec un bonus |
| ~2:22 | Pluie de pièces dans le Bocal ; la nuit se termine | — | — |
| 2:25 | **Aube** : cocorico synthétique, oiseaux ; le ticket de caisse s'imprime ligne par ligne (Ventes, Pourboires, Bocal gardé 100 %, Butin) ; 3 étoiles tombent une à une | Regarde | **Première victoire** |
| 2:37 | Le premier coffre tremble au centre de l'écran | Tape 3 fois | Ouvrir un coffre |
| 2:42 | Les cartes volent : Étagère ×4, Cagette ×2, 30 pièces | — | **Première récompense marquante** |
| 2:46 | La carte Étagère indique « 4/2 » avec une flèche verte qui pulse | Tape la flèche | — |
| 2:50 | L'étagère saute, ses chiffres montent (dégâts 6 → 7), étincelles | **Première amélioration** | Les plans font monter les meubles |
| 2:57 | Niveau de marchand 2 : ruban, confettis, fanfare | Continue | — |
| 3:02 | **Premier Matin** : carte de déblocage (le Frigo à lait se révèle). Le calendrier s'ouvre seul : J1 réclamé (150 pièces) ; **J2 montre un coffre d'argent sous cadenas, « dans 13 h 20 min »** ; en haut, une lune avec « 6 » (nuits avant la Pleine Lune) | Tape J1, puis OUVRIR | **La raison claire de revenir demain** |
| 3:15 | **Jour 2 (120 s)** : P3 (Frigo, 150) presque aussitôt payable ; premier Gourmand ; premier VIP (couronne, carillon doré) qui paie ×3 s'il est servi vite | Achète, sert le VIP | Surprise et nouveau produit |
| ~4:10 | Rush : bannière « RUSH! », musique qui s'emballe, 5 clients en 4 s | Gère le coup de feu | Les pics d'activité |
| ~4:40 | P4 (Étagère C, 80) construit | — | — |
| 5:15 | Fermeture, crépuscule ; le frigo ouvre les yeux à son tour | — | Chaque meuble a sa forme de nuit |
| 5:25 | **Nuit 2** (3 vagues) : des souris arrivent seules en petit groupe avec l'étiquette « NOUVEAU » ; le frigo souffle du givre | Défend | Nouveau Grignotin, nouveau rôle de meuble |
| 6:30 | Aube 2 : ticket, étoiles, coffre ; **niveau 3** | — | — |
| 6:50 | Matin : la carte « Aménagement » se révèle ; le bouton Aménager brille. Dans l'éditeur, une main fantôme propose un déplacement (calculé par le Conseil de Mamie) qui allonge le trajet des Grignotins d'au moins 2 cases sans gêner les clients ; la ligne vert acide s'allonge, « 5 → 8 ↑ » | Glisse le meuble, valide | La boutique est un labyrinthe |
| 7:35 | Matin : les Quêtes apparaissent en silhouette avec « Niv. 4 » | OUVRIR | Avant-goût de la suite |
| 7:40 | **Jour 3 (150 s)** : P5 (Plante carnivore, 90) puis P6 (Comptoir, 20) ; premier client Pressé ; première **Commande spéciale** (parchemin : 5 pommes en 50 s → coffre) | Achète, relève le défi | Des objectifs courts dans la journée |
| 10:10 | Fermeture ; la nuit 3 s'annonce avec une **nouvelle entrée** (fenêtre gauche) | — | Le danger change chaque nuit |

**Bilan à 10 minutes :** 3 jours, 2 nuits gagnées, 6 achats, 1 à 2 améliorations, niveau 3, un premier aménagement, le calendrier réclamé, et trois raisons visibles de revenir : le coffre d'argent de demain, la Pleine Lune, les quêtes et le Défi du jour au niveau 4.

## G20. Direction artistique

### G20.1 Intention : « Cosy nocturne »
- **Un seul élément audacieux** : la bascule jour → nuit, quand la boutique s'assombrit et que **tous les meubles ouvrent les yeux**. Tout le reste est calme, lisible et discipliné.
- **Interface diégétique**, empruntée au vocabulaire d'une vraie boutique : menus sur **ardoise à la craie**, boutons en **étiquettes de prix en kraft** (avec leur petit trou et leur ficelle), résultats sur un **ticket de caisse** qui s'imprime. Reconnaissable en une capture d'écran.
- Pas de rendu « générique » : ni fond crème avec accent terre cuite, ni cartes grises identiques avec ombres floues, ni dégradés décoratifs.

### G20.2 Palette (jetons de `src/data/palette.js`)

| Jeton | Hex | Usage |
|---|---|---|
| mur | #8ED8C4 | murs de la boutique (menthe) |
| murOmbre | #5FB8A3 | plinthes, ombres des murs |
| parquetA / parquetB | #F2C26B / #E2A94E | sol en lames, damier |
| bois / boisFonce | #B86B3C / #8A4A26 | meubles |
| encre | #2B1A33 | contours, texte foncé |
| or / orOmbre / orReflet | #FFD23F / #E59E1B / #FFF6C8 | pièces, récompenses |
| pomme | #FF4F5E | accent Q1, alertes douces |
| ciel | #8FD3FF | fenêtres de jour |
| voileNuit | #1A1446 | obscurité (opacité 0,62 ; Q3 : 0,80) |
| lueur | #FFB547 | lampes, four |
| lune | #FFF3B0 | lune, rais de lune |
| yeuxGrignotins | #C8FF2E | yeux des monstres (vert acide), trajet des Grignotins |
| danger | #FF3D6E | vol, PV bas |
| fantome | #BDEBFF | fantômes |
| ardoise | #2E4B44 | panneaux de menu, bandes latérales |
| craie | #F2F6EE | texte et traits sur l'ardoise |
| craieRose / craieJaune / craieBleue | #FF8FB1 / #FFE066 / #7FD8FF | accents sur l'ardoise |
| kraft / kraftOmbre | #DDB389 / #B8895C | étiquettes-boutons |
| etiquetteVerte | #46D39A | action principale |
| etiquetteDoree | #FFD23F | pub récompensée |
| etiquetteCorail | #FF6B6B | annuler, fermer |
| ticket | #FFFDF6 | papier du ticket de caisse |

Accents de quartier : Q1 #FF4F5E, Q2 #FF9F43, Q3 #9B5DE5, Q4 #4D96FF, Q5 #2EC4B6. Aucun dégradé, sauf pour l'éclairage nocturne, les halos et le ciel : partout ailleurs, des aplats + une forme de reflet + une forme d'ombre.

### G20.3 Typographie (aucune police externe)
- **Titres et étiquettes** : `ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif`, graisse 800–900, traitement « sticker » : remplissage + contour encre de 4 px (`strokeText`, ou `-webkit-text-stroke` avec `paint-order: stroke`) + ombre décalée de 3 px vers le bas.
- **Chiffres-tampons (signature)** : chiffres dessinés par code sur une grille de 3 × 5 pastilles arrondies (côté 1, espace 0,12, rayon 0,35) avec un contour encre commun ; glyphes 0–9, +, −, ×, %, :, /, ★ ; pré-rendus dans un atlas aux tailles 14, 20, 28, 40 et 56 px. Utilisés pour les pièces, les dégâts, les minuteurs, les scores et les prix.
- **Texte des menus** : `system-ui` 600–700, 15 à 17 px, casse normale (pas de majuscules partout, sauf OUVRIR, RUSH! et NOUVEAU).
- **Ticket de caisse** : `ui-monospace, "SF Mono", Menlo, Consolas, monospace`, 13 px, espacement 0,5 px : c'est l'impression thermique d'un vrai ticket.

### G20.4 Formes et personnages
- Vue de dessus légèrement oblique : chaque meuble montre son dessus et une face avant de 12 px.
- Contours encre de 2,5 px logiques, coins arrondis (rayon 6 à 10), ombre portée douce (ellipse encre à 18 % sous chaque objet). Chaque silhouette doit se reconnaître en une seconde, même en noir.
- **Marchand** : style chibi (tête = 45 % de la hauteur), tablier rayé, petite lanterne à la ceinture la nuit ; marche en 4 poses avec un rebond de 2 px ; sa pile d'articles oscille comme un ressort.
- **Clients** : corps en goutte, petites jambes, chapeaux variés ; bulles avec l'icône du produit voulu.
- **Grignotins** : ronds, oreilles ou antennes exagérées, yeux vert acide qui brillent (dessinés après le voile de nuit), démarche sautillante. Une silhouette unique par type : raton masqué, souris fine à longue queue, gloubi en goutte, termite allongé, chauve-souris en V, hérisson pointu, champiboum à chapeau de champignon, fantôme en drap, lutin à bonnet pointu, gros gourmand tout rond, corbeau, golem cubique, phalène aux ailes rondes. Les boss sont 2 à 2,5 fois plus grands, avec un attribut (couronne, pâte qui déborde, voile, armure de ferraille, ailes immenses).
- **Meubles la nuit** : deux yeux (ovales blancs, pupilles encre avec un reflet blanc) s'ouvrent et **suivent leur cible** ; chaque meuble sort son « arme » (canon de conserve, bouche du four qui rougeoie, pales du ventilateur…). Un meuble cassé ferme les yeux en spirale et fume.
- **Produits** : icônes de 3 couleurs maximum (pomme rouge, bouteille de lait, pot de confiture violet, baguette dorée…).
- **Boutique** : murs menthe avec plinthe en bois, fenêtres (ciel le jour, lune la nuit), parquet en lames, porte d'entrée avec carillon, enseigne crénelée visible sur l'écran titre et la carte.

### G20.5 Éclairage nocturne
- Calque d'éclairage à demi-résolution : remplir avec `voileNuit` (0,62 ; Q3 : 0,80), puis découper (`destination-out`) des dégradés radiaux pour les lanternes (2,5 cases), la lanterne du marchand (1,8), le four (1,2, teinte lueur), les flashs de tir ; rais de lune en trapèzes depuis les fenêtres. Composer sur la scène, puis dessiner les éléments lumineux par-dessus (yeux des Grignotins, projectiles lumineux, pièces).
- Crépuscule : teinte orange (#FFB36B à 30 %) → violet → voile de nuit en 4 s.

### G20.6 Animations et « juice » [S14]

| Événement | Effet |
|---|---|
| Pièce ramassée | vole en arc (Bézier, 0,35 s) vers le compteur ; le compteur grossit ×1,15 puis revient (0,12 s) ; note qui monte (combo) |
| Pile d'articles | chaque article se pose avec un rebond (0,1 s) ; la pile s'incline dans le sens de la marche (ressort) |
| Dépose sur une étagère | l'article saute en arc (0,18 s), écrasement 1,2 × 0,8 à l'arrivée |
| Emplacement d'achat | anneau qui se remplit, 6 pièces/s volent dedans ; à la fin, le meuble tombe du haut (0,25 s, rebond) + 8 particules de poussière + secousse de 2 px pendant 0,1 s |
| Client servi vite | petit cœur qui monte (0,6 s) |
| Tir | recul du meuble de 2 px, éclair de bouche pendant 1 image |
| Coup | Grignotin blanc pendant 60 ms, recul de 0,1 case, chiffre de dégâts (chiffres-tampons) qui monte et disparaît en 0,6 s |
| Gros coup (> 20 % des PV max) | arrêt sur image de 50 ms + secousse de 3 px |
| Grignotin vaincu | « pouf » : 8 étoiles + 2 à 4 pièces qui jaillissent |
| Dernier Grignotin d'une vague | ralenti de 0,35 s à 30 % + zoom ×1,04 |
| Vol | le Bocal tremble, la jauge clignote en rouge, sac sur le dos du voleur, flèche rouge pulsante |
| Voleur rattrapé | pluie de pièces vers le Bocal + icône « rattrapé » |
| Cloche | onde de choc circulaire couleur craie, secousse de 6 px, étoiles qui tournent sur les Grignotins étourdis |
| Crépuscule | lampes qui s'allument une à une, puis les yeux qui s'ouvrent un par un (60 ms d'écart) |
| Étoiles de l'aube | chaque étoile tombe de ×2 à ×1 avec un « thud » et 6 étincelles |
| Coffre | tremble de plus en plus à chaque tap (3 taps), éclate ; les cartes sortent une par une (0,25 s), halo selon la rareté |
| Amélioration | le meuble saute (écrasement), flèches de stats qui montent, étincelles |
| Niveau de marchand | ruban qui descend, 40 confettis, fanfare |
| Boutons | s'enfoncent de 2 px au toucher, rebondissent au relâcher |

Limites : secousse ≤ 6 px ; flashs désactivables ; particules plafonnées (B5) ; si `prefers-reduced-motion`, secousses désactivées et ralentis raccourcis.

### G20.7 Logo et icône
- **Logo** : enseigne en bois arrondie surmontée de 4 créneaux de château ; « Fort Boutique » en lettrage sticker (couleur `orReflet` sur bois, contour encre) ; deux petits yeux sur l'enseigne qui s'ouvrent à l'écran titre. Dessiné en SVG inline.
- **Icône** : l'enseigne crénelée avec ses deux yeux ouverts, sur fond `voileNuit`, avec la lune en haut à droite.

### G20.8 Écrans

Matin (hub) :
```
┌────────────────────────────────────┐
│ [Niv 4 ▰▰▰▱]  (pièces) (rubis) [⚙] │
│ [Prochain objectif : Chaudron 220] │
│ (carte)                 (lune · 3) │
│  ┌──────────────────────────────┐  │
│  │  la boutique au matin,       │  │
│  │  Moka endormi sur la caisse  │  │
│  └──────────────────────────────┘  │
│ [Catalogue] [Aménager] [Améliorer] │
│ [Quêtes •] [Calendrier •] [Défi •] │
│        ╔══════════════════╗        │
│        ║  OUVRIR · Jour 4 ║        │
│        ╚══════════════════╝        │
└────────────────────────────────────┘
```
Jour (HUD sur le canvas) :
```
┌────────────────────────────────────┐
│ soleil ━━━━━━━○───── (pièces) [⏸]  │
│ [objectif]           [commande ⏱]  │
│         la boutique (grille)       │
│                                    │
│   (joystick là où le doigt se pose)│
└────────────────────────────────────┘
```
- **Nuit** : lune et pastilles de vagues en haut ; jauge du Bocal (un bocal qui se vide) ; barre de PV du boss si besoin ; bouton Cloche en bas à droite.
- **Aube** : le ticket de caisse se déroule depuis le haut (Ventes, Pourboires, Bocal gardé %, Butin, Total), tampon d'étoiles, coffre, étiquettes « ×2 » (dorée, pub) et « Continuer » (verte).
- **Catalogue** (ardoise) : grille de cartes kraft (icône de jour + icône de nuit + prix) ; meubles verrouillés en silhouette avec « Niv. 8 » ; filtres Vendre / Défendre / Décorer.
- **Aménagement** : G6.5. **Améliorer** : onglets Meubles, Marchand, Moka, Recettes, Boutique (agrandir, personnel).
- **Quêtes** (ardoise, 3 lignes à la craie avec barres) ; **Calendrier** (7 étiquettes sur une ficelle) ; **Défi du jour** (carte du jour, Jouer, Partager, Rivaux) ; **Carte des quartiers** (rue du village, 5 façades, cadenas) ; **Garde-robe** (mannequin du marchand + Moka) ; **Bestiaire** (cartes) ; **Succès** ; **Paramètres**.
- Transitions : entre écrans de menu, glissement de 180 ms ; entre phases, transitions de lumière, jamais d'écran noir.

## G21. Design sonore (tout en WebAudio, aucun fichier) [S15][S16]

### G21.1 Principes
- **Tout sonne juste ensemble** : chaque son tonal utilise une note de la tonalité de la musique en cours (jour : pentatonique de fa — fa, sol, la, do, ré ; nuit : ré dorien — ré, mi, fa, sol, la, si, do). Les combos (pièces, prises d'articles) jouent donc de petites mélodies au lieu de bips.
- **Jamais lassant** : chaque son fréquent a 2 ou 3 variantes de timbre jouées à tour de rôle, + hauteur ±3 % et volume ±1,5 dB au hasard. Les sons qui doivent rester reconnaissables (« ding » de porte, Cloche) ne varient que très peu.
- **Lisible** : les sons de récompense montent, les sons de problème descendent doucement ; aucun son strident ; aucun son ne dépasse 1,8 s, sauf les jingles et la musique.

### G21.2 Musique (séquenceur procédural, motifs écrits dans `data/audio.js`)
- **Thème de Fort Boutique** : un motif de 2 mesures (motif A) qui sert d'ADN à toutes les musiques. Il est écrit à la main avec 7 autres motifs ; des variations à graine (octave, rythme, ornements) évitent la répétition.
- **Jour** — fa majeur, 104 BPM, swing 54 %, boucle de 8 mesures : Fa | Rém | Si♭ | Do | Fa | Lam | Si♭ | Do (sus4 → Do).
  - Basse ronde : triangle + sinus une octave en dessous ; enveloppe A 5 ms, D 180 ms, S 0,3, R 80 ms ; passe-bas 900 Hz.
  - Marimba (mélodie) : sinus porteur + FM ratio 4, indice 1,2 qui retombe en 80 ms ; amplitude qui décroît en 350 ms.
  - Piano doux (accords sur les contretemps) : 2 triangles désaccordés de ±6 cents ; passe-bas 1 800 Hz ; A 10 ms, R 400 ms.
  - Shaker : bruit blanc → passe-bande 7 kHz, Q 1,2, 30 ms, en croches avec accents.
  - Claps : 3 bruits de 10 ms décalés, passe-bande 1,5 kHz, sur les temps 2 et 4.
  - Couches : C1 basse + shaker + piano (toujours) ; C2 + marimba (au moins 2 clients dans la boutique) ; C3 + claps + contre-chant en pizzicato (Rush, commande spéciale). Entrées et sorties calées sur la mesure, fondu d'une mesure.
- **Crépuscule (4 s)** : passe-bas qui descend de 8 kHz à 500 Hz, tempo de 104 à 92 BPM, coup de cloche dans la tonalité.
- **Nuit** — ré dorien, 92 BPM, binaire : Rém | Do | Si♭ | Do | Rém | Fa | Sol | La7.
  - Boîte à musique (thème : le motif A en mineur) : sinus + 3e harmonique + FM ratio 3,5 faible ; décroissance 1,2 s.
  - Pizzicato (basse) : carré → passe-bas 700 Hz ; décroissance 150 ms.
  - Nappe : 2 dents de scie désaccordées de ±8 cents → passe-bas 650 Hz ; A 600 ms, R 900 ms ; très discrète.
  - Toms : sinus 140 → 70 Hz en 120 ms + bruit. Cloches tubulaires en fin de vague.
  - Couches : C1 nappe + boîte à musique (entre les vagues) ; C2 + pizzicato + toms (vague en cours avec au moins 6 Grignotins) ; C3 boss : + timbales (sinus 90 → 55 Hz + bruit) sur les temps 1 et 3, 100 BPM, + « chœur » (dents de scie → filtres de formants à 700 et 1 150 Hz).
- **Aube** : arpège de ré majeur (ré, fa♯, la) à la boîte à musique + gazouillis (sinus glissant de 2,4 à 3,2 kHz en 80 ms) + cocorico synthétique (dent de scie avec formants glissants, 0,9 s, désactivable).
- **Matin (hub)** : version calme du thème du jour, 96 BPM, piano et marimba clairsemés.
- **Écran titre** : boîte à musique seule, motif A, lent.

### G21.3 Mixage
Maître 0,8 ; musique 0,32 ; effets 0,7 ; interface 0,5. Compresseur sur le maître (seuil −16 dB, ratio 3,5, attaque 5 ms, relâche 120 ms). La musique baisse de 5 dB pendant 350 ms sous les gros sons (coffre, niveau, boss, Cloche). Réverbération par convolution (réponse générée : bruit stéréo, décroissance exponentielle de 1,4 s, pré-délai 15 ms) : envoi musique 0,18, effets 0,08.

### G21.4 Limites
24 voix ; un même son au plus 12 fois par seconde (au-delà, regroupement : un son pour 4 pièces) ; « coup » au plus 10 fois par seconde ; « ding » de porte au plus une fois toutes les 0,8 s.

### G21.5 Les 44 effets sonores

| # | ID | Quand | Recette | Durée |
|---|---|---|---|---|
| 1 | ui_tap | bouton | sinus 880 → 1 320 Hz en 25 ms, gain 0,18 ; 3 variantes (do, ré, fa) | 60 ms |
| 2 | ui_back | retour | sinus 660 → 440 Hz | 80 ms |
| 3 | pickup | prendre un article | triangle, un degré de la gamme plus haut à chaque article (remise à zéro après 1,5 s) + clic de bruit 5 ms | 70 ms |
| 4 | drop | poser un article | bruit 18 ms passe-bande 1,4 kHz Q 3 + sinus 320 → 190 Hz | 60 ms |
| 5 | coin | pièce ramassée | 2 sinus (note + quinte à l'octave), combo qui monte sur 2 octaves | 120 ms |
| 6 | kaching | encaissement | bruit 12 ms + arpège fa6-la6-do7 (35 ms d'écart) + FM métallique (ratio 3,5, indice 2) | 250 ms |
| 7 | door_bell | un client entre (signature) | cloche FM : porteuse 880 Hz, ratio 1,4, indice 3 → 0 | 600 ms |
| 8 | happy | client servi vite | 2 notes montantes de la gamme, carré doux | 100 ms |
| 9 | grumpy | client déçu | carré 170 → 110 Hz, passe-bas 700 Hz, très doux | 150 ms |
| 10 | pad_tick | pièce dans un emplacement | sinus 2,5 kHz 15 ms, +1 demi-ton toutes les 5 pièces | 15 ms |
| 11 | build_pop | meuble construit | sinus 180 → 620 Hz + souffle (bruit passe-bas 2 kHz) + accord majeur de la tonique | 220 ms |
| 12 | vip | arrivée d'un VIP | 3 cloches FM aiguës en arpège | 400 ms |
| 13 | rush | Rush | sifflet (sinus 2,8 kHz avec vibrato) + roulement (bruit passe-bande 2 kHz) + accord cuivré (dents de scie, passe-bas 1,2 kHz) | 500 ms |
| 14 | order_new | commande spéciale | parchemin froissé (bruit passe-bande 3 kHz modulé) + une note | 300 ms |
| 15 | close_shop | fermeture | rideau (bruit en balayage 4 kHz → 800 Hz) + clic de clé | 450 ms |
| 16 | eyes_open | chaque meuble qui s'éveille | sinus 500 → 1 000 Hz ; après le dernier, un « boing » (sinus 300 Hz avec vibrato, 250 ms) | 40 ms |
| 17 | wave_warn | télégraphe d'une vague | 2 toms doux + porte qui grince (dent de scie 90 Hz modulée au hasard) | 400 ms |
| 18 | wave_start | début de vague | 3 toms (140 → 80 Hz) | 450 ms |
| 19 | shot_can | Lance-conserves | bruit 30 ms passe-bas 1 kHz + sinus 220 → 150 Hz | 50 ms |
| 20 | shot_coin | Canon à pièces | sinus 2,6 kHz 25 ms + bruit 4 ms | 25 ms |
| 21 | lob | tir en cloche + impact | départ sinus 400 → 250 Hz (60 ms) ; impact « splat » : bruit passe-bas 600 Hz + sinus 140 → 70 Hz (120 ms) | 180 ms |
| 22 | frost | Souffle glacé, Chantilly | bruit passe-haut 3 kHz en balayage 4 → 2 kHz + sinus 1 800 → 1 200 Hz | 180 ms |
| 23 | flame | Lance-flammes (boucle) | bruit passe-bande 900 Hz Q 0,7, amplitude modulée à 18 Hz, fondu de 80 ms | boucle |
| 24 | chomp | Plante carnivore | 2 bruits de 20 ms (passe-bas 800 Hz) espacés de 60 ms + sinus 180 Hz | 120 ms |
| 25 | swirl | Tourbillon, Bourrasque | bruit en balayage passe-bande 300 → 1 500 Hz | 400 ms |
| 26 | zap | Lumière, Rayon, Pages | dent de scie 1,2 kHz avec trémolo à 30 Hz, passe-bande (boucle pour le Rayon, hauteur qui monte avec son multiplicateur) | 120 ms |
| 27 | hit | coup | bruit 20 ms, passe-bande au hasard entre 1,5 et 3 kHz, discret | 20 ms |
| 28 | armor | coup sur armure | ping métallique FM 1,2 kHz, ratio 2,7 | 80 ms |
| 29 | pouf | Grignotin vaincu | bruit avec passe-bas en balayage 3 kHz → 300 Hz + petite note de la gamme (récompense) | 180 ms |
| 30 | thief_grab | vol | « oh-oh » : carré doux la4 → fa4 (2 × 90 ms) + tintement de pièces qui descend | 300 ms |
| 31 | thief_caught | voleur rattrapé | arpège montant de 5 notes (40 ms) + pluie de 6 pièces (30 ms d'écart) | 450 ms |
| 32 | broken | meuble cassé | craquement : bruit 60 ms passe-bande 900 Hz + sinus 120 → 60 Hz | 150 ms |
| 33 | repair | réparation | tintement de marteau 1,8 kHz, toutes les 0,4 s | 20 ms |
| 34 | bell | Cloche du marchand (signature) | cloche FM : porteuse 587 Hz (ré5), ratio 1,4, indice 5 → 0 en 1,6 s + souffle (bruit passe-bas en balayage) | 1,6 s |
| 35 | wave_clear | vague terminée | 3 notes de boîte à musique | 400 ms |
| 36 | boss | arrivée d'un boss | dent de scie 55 Hz, passe-bas 400 Hz, qui enfle (1,2 s) + gong (bruit + sinus inharmoniques 140 / 221 / 317 Hz, décroissance 2 s) | 2 s |
| 37 | star | chaque étoile de l'aube | « thud » (sinus 90 Hz, 80 ms) + carillon do, puis mi, puis sol ; la 3e ajoute des étincelles | 300 ms |
| 38 | chest_tap | tap sur un coffre | coup de bois (bruit 25 ms passe-bande 700 Hz), plus aigu à chaque tap | 60 ms |
| 39 | chest_open | ouverture d'un coffre | éclat (bruit 200 ms passe-bas en balayage) + arpège majeur 9 + 8 étincelles (sinus 3 à 5 kHz de 30 ms) | 900 ms |
| 40 | card | carte de plan révélée | papier (bruit passe-bande 3 kHz, 60 ms) + une note ; carte rare : + nappe de chœur de 600 ms | 150 ms |
| 41 | upgrade | amélioration d'un meuble | balayage montant + accord + « boing » | 600 ms |
| 42 | level_up | niveau de marchand | fanfare de 6 notes (carré + triangle, avec réverbération) | 1,4 s |
| 43 | quest | quête terminée | coup de tampon (thud + papier) | 200 ms |
| 44 | error | action impossible | 2 notes douces en triangle, 330 puis 294 Hz (80 ms chacune), jamais stridentes | 180 ms |

Bonus : `meow` (Moka : dent de scie dans des filtres de formants, glissé 400 → 700 → 500 Hz, 3 variantes, 300 ms) et `rooster` (G21.2).
Tests : chaque ID a une recette ; durée et gain sous leurs plafonds ; les notes de la musique et des sons tonals appartiennent à la tonalité en cours.

## G22. Options et accessibilité
Volume de la musique ; volume des effets ; vibrations ; secousses (oui/non) ; flashs réduits ; mode gaucher ; grand texte (menus ×1,15) ; mode économie ; langue ; icônes de faiblesse des Grignotins ; cocorico (oui/non) ; sauvegarde (exporter, importer) ; carte « écran d'accueil » (iOS) ; crédits ; version.
Un danger n'est jamais signalé par la couleur seule : icônes et formes (télégraphe en icônes, voleur avec sac et flèche). `prefers-reduced-motion` est respecté (G20.6).

## G23. Sauvegarde : schéma de la version 1
```json
{
  "version": 1,
  "checksum": "crc32-hex",
  "createdAt": 0, "lastSeenAt": 0, "seed": 123456789,
  "settings": { "lang": "fr", "music": 0.8, "sfx": 0.9, "vibration": true, "shake": true,
                "reducedFlash": false, "leftHanded": false, "bigText": false,
                "economy": false, "rooster": true },
  "player": { "level": 1, "xp": 0, "coins": 0, "rubies": 0, "kibble": 0,
              "upgrades": { "shoes": 1, "basket": 1, "broom": 1, "whistle": 1, "bell": 1 },
              "cat": { "unlocked": false, "level": 1 } },
  "furniture": { "etagere": { "level": 1, "plans": 0 } },
  "shops": {
    "q1": { "unlocked": true, "week": 1, "night": 1, "bossBeatenCount": 0, "bossAssist": 0,
            "franchiseStars": 0, "redMoon": false, "expansion": 0,
            "layout": [ { "id": "caisse", "x": 3, "y": 4, "rot": 0 } ],
            "storage": [], "staff": { "clerks": [], "cashier": null },
            "recipes": { "pomme": 1 }, "pads": { "done": [], "active": null },
            "lastDayTakings": 0, "lastDayDurationS": 90,
            "phase": { "name": "morning", "dayTimeLeftS": 0, "dayTakings": 0, "dawnClaimed": true } }
  },
  "currentShop": "q1",
  "progress": { "tutorialStep": 0, "unlocksSeen": [], "flags": {} },
  "daily": { "calendarIndex": 0, "lastCalendarDay": -1,
             "quests": { "day": -1, "list": [], "rerollsUsed": 0 },
             "weekly": { "week": -1, "list": [] },
             "streak": { "count": 0, "lastDay": -1, "freezes": 0, "best": 0, "restoredWeek": -1 },
             "challenge": { "lastDay": -1, "scoreToday": 0, "history": [] },
             "eventProgress": { "week": -1, "value": 0, "claimed": [] } },
  "endless": { "best": 0, "chestsToday": 0, "day": -1 },
  "collections": { "bestiary": { "raton": 0 }, "achievements": {}, "seenMonsters": [] },
  "cosmetics": { "owned": ["apron_stripes"],
                 "equipped": { "outfit": "apron_stripes", "cat": null, "theme": "classic",
                               "coinFx": null, "eyes": "round", "sign": "wood" } },
  "purchases": { "noAds": false, "cosmetics": [], "receipts": [] },
  "ads": { "day": -1, "rewardedToday": 0, "byPlacement": {}, "lastInterstitialAt": 0,
           "cyclesSinceInterstitial": 0 },
  "stats": { "playtimeMs": 0, "cycles": 0, "sessions": 0, "nights": 0, "sold": 0,
             "served": 0, "kills": 0, "thievesCaught": 0 },
  "offline": { "lastCollectAt": 0, "welcomeChestForDay": -1 }
}
```
Chaque champ a une valeur par défaut dans `schema.js` ; au chargement, la sauvegarde est fusionnée avec ces valeurs (compatibilité ascendante). Aucune migration ne supprime `purchases`, `cosmetics`, les monnaies ou les niveaux.

## G24. Statistiques locales et interface pour les bots
- Les statistiques restent sur l'appareil (aucune donnée envoyée). Elles servent aux playtests, aux succès et aux simulations.
- La logique expose une interface sans DOM pour les simulations : `createGame({ seed, save })`, `step(dtMs)`, `setInput({ x, y, bell })`, `getState()`, plus des actions de menu (`buy`, `upgrade`, `placeFurniture`, `openChest`…). Les **simulations** (D2) l'utilisent directement ; les **playtests** (D3) passent toujours par de vrais événements DOM.

## G25. Sources
- [S1] Sensor Tower — State of Gaming 2026 : https://sensortower.com/press/press-release-sensor-tower-state-of-gaming-gaming-drove-52-billion-downloads-82b-iap-revenue-on-mobile-and-12b-premium-revenue-on-steam
- [S2] GameAnalytics — benchmarks mobile 2026 (via GameDev Reports) : https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game
- [S3] Mistplay — Mobile Gaming Growth Report 2024 (via GameDev Reports) : https://gamedevreports.substack.com/p/mistplay-mobile-gaming-growth-report
- [S4] Mistplay — joueurs nord-américains 2023 (via GameDev Reports) : https://gamedevreports.substack.com/p/mistplay-north-american-players-behaviour
- [S5] Deloitte, via eMarketer — pubs perturbantes et abandon : https://www.emarketer.com/content/poor-in-game-ads-push-1-5-mobile-gamers-quit-threaten-brand-loyalty
- [S6] PocketGamer.biz — intégrations de vidéos récompensées : https://www.pocketgamer.biz/best-practices-for-implementing-six-common-rewarded-video-integrations
- [S7] Udonis — statistiques des vidéos récompensées : https://www.blog.udonis.co/mobile-marketing/mobile-games/rewarded-video-ads
- [S8] Pangle — placement et fréquence des vidéos récompensées : https://www.pangleglobal.com/resource/27805
- [S9] George Fan, « How I Got My Mom to Play Through Plants vs. Zombies » (GDC 2012), notes : https://notes.hamatti.org/sources/talks/how-i-got-my-mom-to-play-through-plants-vs.-zombies — et https://gamerboom.com/archives/49128
- [S10] UX Magazine — psychologie des séries (Duolingo) : https://uxmag.com/articles/the-psychology-of-hot-streak-game-design
- [S11] PocketGamer.biz — déconstruction de My Mini Mart : https://www.pocketgamer.biz/under-the-hood-deconstructing-the-top-hypercasual-games
- [S12] Supersonic — concevoir un arcade idle : https://supersonic.com/?p=82671
- [S13] MAF — analyse d'Outlets Rush : https://maf.ad/en/blog/outlets-rush-arcade-idle/
- [S14] « Juice it or lose it » et « The Art of Screenshake » (synthèse) : https://rpgplayground.com/research-making-a-juicy-game/ — durées d'arrêt sur image : https://eastondev.com/blog/fr/posts/dev/20260521-game-feedback-feel/
- [S15] A Sound Effect — Bjørn Jacobsen, répétition et fatigue d'écoute : https://www.asoundeffect.com/game-audio-immersion/
- [S16] Variations et round-robin en sound design : https://violetrecording.com/sound-design-for-video-games/
- [S17] The Register — Safari et la limite de 7 jours du stockage local : https://www.theregister.com/2020/03/26/apple_relax_were_not_totally/
- [S18] Cinevva — monétisation des jeux web en 2026 (Poki, CrazyGames) : https://app.cinevva.com/fr/guides/web-game-monetization
- [S19] mobilegamer.biz — bilan 2025 de Supercell (Squad Busters, Clash Royale) : https://mobilegamer.biz/supercell-boss-laments-coasting-mobile-industry-as-clash-royale-stars-in-2025-results/
- [S20] Appfigures — Clash Royale et Merge Tactics : https://appfigures.com/resources/insights/20250808/5-a-decade-on-clash-royale-just-did-what-few-games-can
- [S21] Mezha — Ball x Pit sur mobile : https://mezha.ua/en/news/ball-x-pit-mobile-308831/
- [S22] Steam — Tavernhold : https://store.steampowered.com/app/3970620 — Clearance Defence : https://store.steampowered.com/app/4567460/
- [S23] itch.io — ShopFront : https://3d-engine.itch.io/shop-front

*Fin de l'Annexe G. Fin du prompt : commence par l'Étape 1 (A1), puis la mission M0.*
