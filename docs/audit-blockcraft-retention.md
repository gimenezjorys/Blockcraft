# Audit BlockCraft — de "jeu avec du contenu" à "jeu auquel on revient"

*Audit critique, basé sur l'état réel du code (fichier unique HTML, sans serveur), et sur des données de marché vérifiées où c'était possible. Les affirmations non sourcées sont explicitement signalées comme opinion de game design, pas comme fait.*

---

## 0. Le constat qui change tout : BlockCraft n'a pas de serveur

Avant toute chose, il faut dire ce qui n'a probablement pas été assez répété pendant qu'on empilait les fonctionnalités : **BlockCraft est aujourd'hui un fichier HTML unique, sans backend, sans compte, sans base de données partagée**. Tout tourne en `localStorage`, sur l'appareil du joueur, avec un solveur BFS local qui valide les niveaux.

Ce n'est pas un détail technique. C'est **la contrainte qui détermine ce qui est réellement faisable** dans tout ce qui suit. Concrètement :

| Idée du brief | Faisable sans backend ? | Pourquoi |
|---|---|---|
| Ligues (Bronze→Grand Master) | ❌ Non, pas sérieusement | Nécessite un classement global synchronisé, anti-triche serveur, saisons avec reset serveur |
| Duels asynchrones | ❌ Non | Nécessite de stocker/valider le score d'un adversaire quelque part de commun |
| Guildes | ❌ Non | Nécessite des comptes, une messagerie, une persistance partagée |
| Classement mondial/régional | ❌ Non, sauf simulé (déjà le cas et déjà signalé comme tel) | Idem |
| Mode infini/score attack | ✅ Oui, entièrement | Local, déterministe, aucune donnée à partager |
| Collection cosmétique (Blockdex) | ✅ Oui | Déjà en place (4 catégories) |
| Méta-progression solo | ✅ Oui | Déjà en place (coins, succès, profil) |
| Streaks + protection | ✅ Oui | Déjà en place |
| LiveOps *avec contenu généré par une IA/un serveur* | ❌ Non tel quel | Nécessite au minimum un endpoint qui pousse un JSON quotidien |
| LiveOps *avec génération procédurale locale* | ✅ Oui | Le solveur existant peut valider des niveaux générés à la volée |

**Verdict immédiat, brutal comme demandé** : la moitié des idées les plus enthousiasmantes du brief (League, Duels, Guildes, vrais classements) sont des projets **d'infrastructure**, pas des fonctionnalités de jeu. Les proposer comme "prochaine feature" sans dire qu'elles impliquent de construire un backend, une authentification, une base de données et une politique anti-triche serait vous mentir par omission. Ce n'est pas "trop compliqué" au sens where on abandonnerait — c'est juste un **projet différent**, qui doit être décidé consciemment (voulez-vous devenir un studio avec un serveur, ou rester un jeu client pur ?), pas glissé discrètement dans une roadmap de "features".

La bonne nouvelle : **le vrai problème que vous décrivez (contenu trop court, pas de "encore une partie") se résout à 90% sans serveur.** C'est tout l'objet de cet audit.

---

## 1. Diagnostic honnête de l'état actuel

### Ce qui fonctionne bien
- **Le moteur et le solveur.** Un jeu de glissement à mécaniques multiples (murs, rochers, ancres, portails, interrupteurs) avec une garantie mathématique de solvabilité et de coup minimal par niveau est rare, même chez les gros studios. C'est un vrai actif technique, pas juste "un puzzle de plus".
- **La sauvegarde versionnée.** `SCHEMA_MIGRATIONS`, migrations propres, robustesse aux données corrompues — c'est le genre de fondation qu'on regrette de ne pas avoir quand on en a besoin, et vous l'avez déjà.
- **La boucle cosmétique.** 4 catégories, achat/équipement cohérents, reflétées jusque dans la carte de partage. C'est plus abouti que la plupart des prototypes indés à ce stade.
- **Le défi quotidien avec streak + protection.** Conforme aux bonnes pratiques (voir §3).

### Ce qui fonctionne moyennement
- **Les succès.** 9-10 succès, c'est un bon début, mais ils sont presque tous des jalons "one-shot" (premier niveau, 20 niveaux à 3 étoiles, 7 jours de streak...). Aucun n'est *récurrent* ou *évolutif* — une fois débloqués, ils ne reviennent jamais dans le champ de vision du joueur. Un succès qu'on ne peut regarder qu'une fois ne fait pas revenir.
- **La monnaie (coins).** Fonctionnelle, mais son seul vrai débouché "excitant" (les cosmétiques) est un achat ponctuel par catégorie. Une fois les 4 catégories vidées de leurs items intéressants, les coins n'ont plus d'usage — la monnaie meurt.

### Ce qui est faible
- **La campagne comme colonne vertébrale de la session.** C'est le cœur du diagnostic que vous posez vous-même, et il est juste : 60 niveaux, 5-10 secondes chacun une fois connus, ça fait **une campagne de 10-15 minutes non-stop**, jouable en une seule session, jamais recyclable. Une fois terminée, il ne reste que le défi quotidien (une partie par jour) et le farming de coins/succès. Ce n'est pas un problème de qualité des niveaux — c'est un problème de **format**.
- **L'absence totale de contenu rejouable.** Aucun mode où le joueur peut décider "je vais jouer encore 10 minutes" un mardi soir sans but précis. C'est la boucle des 10 minutes qui est vide (voir §4).

### Ce qui est inutile ou redondant (à dire franchement)
- **Rien à ce stade ne mérite d'être supprimé.** C'est en fait un signe positif : contrairement à beaucoup de prototypes qui accumulent des systèmes concurrents, chaque système présent a un rôle distinct. Le vrai problème n'est pas la redondance, c'est le **vide** — pas assez de raisons de revenir, pas trop de mauvaises raisons.
- Point de vigilance néanmoins : **les paliers 3-4 de l'indice payants risquent de devenir sans objet** une fois qu'un mode infini existe (pourquoi payer pour voir la solution d'un niveau fini une fois, sur un contenu qui ne se rejoue plus une fois vu ?). Pas à supprimer maintenant, mais à surveiller.

### La plus grosse faiblesse de BlockCraft aujourd'hui

**Le jeu n'a pas de destination.** Il a un début (niveau 1) et une fin (niveau 60 + défi du jour perpétuel). Entre les deux, il n'y a rien vers quoi un joueur peut se projeter sur plusieurs semaines. Royal Match a son château qui se reconstruit visuellement pendant des mois (voir §2) ; Block Blast a un score personnel qui ne cesse jamais de pouvoir monter ; Clash Royale a une progression de trophées quasi infinie. BlockCraft, une fois la campagne finie, n'offre **aucun nombre qui peut encore grandir de façon significative**, sauf le streak (qui casse à la moindre absence malgré la protection) et le total de coins (plafonné par les catalogues cosmétiques).

### Pourquoi un joueur désinstallerait après quelques jours
Il a fini la campagne, fait 3-4 défis quotidiens, débloqué la moitié des cosmétiques accessibles avec ses coins, et se rend compte qu'il n'y a plus rien de nouveau à faire — seulement répéter. Sans un mode qui se renouvelle de lui-même, la désinstallation n'est pas un échec du jeu, c'est la conséquence logique et normale d'un contenu épuisable.

### Pourquoi un joueur resterait plusieurs mois
S'il a une raison de revenir chercher un nombre qui grandit (score, maîtrise, collection) **et** que cette raison ne dépend pas d'avoir terminé du contenu fini. C'est exactement ce que la §5-§6 ci-dessous propose de construire.

---

## 2. Audit de marché — le mécanisme derrière la fonctionnalité, pas juste la fonctionnalité

*(Données vérifiées quand une source est citée ; sinon, raisonnement de game design déclaré comme tel.)*

### Block Blast (et la famille Block Blast / 1010! / Woodoku)
**Boucle** : placer des blocs sur une grille jusqu'à ne plus pouvoir, score qui monte tant qu'on survit, pas de fin scriptée. Rapporté par des analyses tierces à environ **26% de rétention J1** [DONNÉE VÉRIFIÉE, source tierce, à considérer comme un ordre de grandeur plutôt qu'une vérité absolue] — un score solide pour le genre casual.
**Pourquoi ça marche** : c'est un mode infini pur. Il n'y a littéralement rien à "finir", donc rien qui expire. La tension vient de la gestion de l'espace (chaque pièce posée réduit les options futures), pas de la difficulté d'un niveau précis.
**Transposable à BlockCraft ?** Oui, avec adaptation — voir §6 ("Mode Infini de Maîtrise"). BlockCraft n'a pas de "grille qui se remplit", donc il faut une autre source de pression croissante (générer des plateaux de plus en plus contraints, par exemple).
**Ne fonctionnerait pas tel quel** : copier littéralement le remplissage de grille — ce n'est pas le gameplay de BlockCraft (glissement déterministe, pas placement).

### Woodoku / 1010!
Même famille que Block Blast, variante bois/couleur. Le mécanisme de rétention est identique (mode infini + record personnel). Rien à ajouter de spécifique.

### Royal Match
**Boucle** : niveaux match-3 classiques, mais la vraie couche de rétention est le **château qui se décore visuellement** au fil de la progression — une méta-progression *délibérément superficielle*. Dream Games a testé en interne plusieurs profondeurs de méta (sans meta / meta légère / meta narrative par épisodes) et **c'est la version la plus simple qui a le mieux retenu les joueurs** [DONNÉE VÉRIFIÉE, retours de développeurs sur leur propre A/B testing, largement rapportés dans la presse spécialisée jeu mobile]. Royal Match produit également des dizaines de nouveaux niveaux par semaine avec une équipe de contenu dédiée — plus de 12 000 niveaux au total à ce jour.
**Pourquoi ça marche** : la méta légère crée un objectif visible et cumulatif ("je veux voir la pièce suivante du château") sans demander au joueur de comprendre un système complexe. C'est un "sunk cost" positif — plus on a investi, plus on veut continuer à voir le résultat.
**Transposable à BlockCraft ?** Oui, directement, et c'est peut-être le point le plus actionnable de tout cet audit : **une légère.** Vous avez déjà 8 mondes thématiques avec palette propre — il manque juste un objet visuel qui se construit progressivement à travers ces mondes (voir §13, méta-progression "Jardin/Atelier").
**Ne fonctionnerait pas tel quel** : le rythme de production de contenu de Royal Match (50-100 niveaux/semaine avec une équipe dédiée) est totalement hors de portée d'un développement solo — c'est justement l'argument le plus fort pour NE PAS répondre au "contenu trop court" en fabricant plus de niveaux à la main (voir §5).

### Candy Crush / King
**Boucle** : essentiellement la même famille que Royal Match, avec en plus un calendrier d'événements très dense (défis chronométrés, quêtes collectives, saisons). Le point clé du LiveOps King : **la plupart des "événements" ne sont pas du nouveau contenu, ce sont des règles temporaires appliquées à du contenu existant** (objectifs différents sur les mêmes niveaux, minuteur, score multiplié). C'est un point capital pour BlockCraft.
**Transposable ?** Oui — voir §7 sur le LiveOps sans production manuelle.

### Tetris (toutes versions)
**Boucle** : mode infini pur (Marathon), plus des modes secondaires (Sprint = time attack, Ultra = score attack sur temps fixe, Battle = compétitif). Tetris est la preuve depuis 40 ans qu'**un système déterministe et rejouable à l'infini bat n'importe quelle quantité de niveaux faits main** en durée de vie. C'est probablement la référence la plus pertinente pour BlockCraft de toute cette liste : un puzzle à règles fixes, sans narration, dont toute la rétention vient de la maîtrise et du score.
**Transposable ?** Directement, conceptuellement — voir §6.

### Subway Surfers / endless runners
**Boucle** : infini, avec missions quotidiennes qui donnent un objectif court par-dessus le score pur ("parcours 500m en marchant sur des rails"). Le mécanisme clé : le mode infini seul finit par lasser, donc on lui superpose des **micro-objectifs renouvelés chaque jour** pour donner une raison précise de jouer aujourd'hui plutôt qu'hier.
**Transposable ?** Oui, directement applicable à un futur mode infini BlockCraft (missions quotidiennes générées, sans besoin de serveur — un simple seed déterministe par date, exactement comme le défi du jour actuel).

### Brawl Stars / Clash Royale / Clash of Clans
**Boucle** : compétition PvP synchrone ou quasi-synchrone, ligues de trophées, clans. Le mécanisme de rétention est réel et puissant (la comparaison sociale directe est un des plus forts leviers de rétention connus), **mais il repose intégralement sur un serveur, un matchmaking, et une modération anti-triche** — voir §0. Point critique et rarement dit assez fort : même Supercell, avec des années de télémétrie et des dizaines d'ingénieurs, **s'est trompé sur sa propre courbe de perte de trophées** et a dû faire marche arrière après une vague de frustration joueurs [DONNÉE VÉRIFIÉE, incident largement documenté et discuté publiquement par le studio lui-même]. Si Supercell se trompe sur l'équilibrage d'une ligue, un système de ligues improvisé sur un jeu solo sans infrastructure de test A/B a un risque d'échec très élevé.
**Transposable ?** Pas sous forme de ligue/PvP réel sans backend. Le *sentiment* de compétition peut en revanche être recréé en asynchrone pur local (voir §8, "Fantômes locaux").

### Archero / Survivor.io / Vampire Survivors
**Boucle** : "roguelite mobile" — runs courtes et rejouables, avec une méta-progression permanente entre les runs (améliorations d'armes, de personnage) qui rend chaque run suivante légèrement plus forte, même après un échec. C'est un mécanisme psychologique précis : **transformer un échec en investissement plutôt qu'en perte sèche.**
**Pourquoi c'est pertinent pour BlockCraft** : c'est exactement le manque identifié en §1. Un mode infini BlockCraft qui se termine par un échec (le joueur est bloqué, ou le plateau devient insoluble) doit laisser quelque chose de permanent derrière lui — pas juste "recommence à zéro".
**Transposable ?** Oui, fortement recommandé comme principe de conception pour le mode infini (voir §6).

---

## 3. Les idées déjà envisagées — évaluation franche, une par une

### 🏆 Blockcraft League — **NE PAS FAIRE, pas sous cette forme**
Raisons : (1) nécessite un backend qui n'existe pas — c'est un changement de nature du projet, pas une feature ; (2) même les meilleurs studios se trompent sur l'équilibrage des ligues (voir Clash Royale ci-dessus) ; (3) une ligue avec peu de joueurs simultanés (cas probable pour un jeu indé en croissance) produit des poules vides ou déséquilibrées, ce qui est pire qu'une absence de ligue.
**Ce que je proposerais à la place** : une **"Ligue Fantôme"** — le joueur progresse dans des paliers (Bronze → Grand Master) **contre un barème fixe défini par le solveur** (nombre de niveaux résolus à l'optimal, pas contre d'autres joueurs), entièrement calculable localement. Ça donne la sensation de progression par palier sans nécessiter un seul octet de synchronisation réseau. Détaillé en §9.

### ⚔️ Duels asynchrones — **NE PAS FAIRE tel quel, remplacer par une variante locale**
Sans serveur, il est impossible de garantir qu'un score adverse est réel et non falsifié (n'importe quel joueur peut éditer son `localStorage`). Publier un système de "duel" qui compare à des scores potentiellement trafiqués détruirait la confiance plus vite qu'il ne créerait de compétition.
**Alternative solide** : des **"Fantômes"** générés localement à partir de courbes de difficulté connues (pas de vrais joueurs, un adversaire simulé calibré sur le par du niveau) — voir §8. Honnête, transparent si présenté comme tel ("bats le rythme de résolution optimal"), et livrable dès maintenant.

### 🔥 Streaks — **déjà fait, et déjà bien fait**
Le système actuel (streak + gel de série achetable en coins) suit exactement le design que la littérature recommande (Duolingo : la peur de perdre un streak est un puissant moteur comportemental, mais un streak purement punitif pousse à l'abandon après la première casse — la protection réduit ce risque) [DONNÉE VÉRIFIÉE, Duolingo a publiquement documenté ce raisonnement]. Point d'amélioration mineur mais réel : Duolingo a constaté que le gel acheté à l'avance est moins valorisé qu'un mécanisme de **rattrapage après coup** ("tu as raté hier, regagne ton streak en réussissant deux défis aujourd'hui"). Je recommande d'ajouter cette variante en complément du gel existant, pas de le remplacer.

### 💎 Collection / Blockdex — **bonne idée, déjà construite, à mieux mettre en scène**
Les 4 catégories de cosmétiques EXISTENT déjà et remplissent exactement ce rôle. Ce qui manque n'est pas le système, c'est **la mise en scène du "presque complet"** — un compteur global "X/Y" par catégorie, visible depuis le profil, avec une progression barre-de-complétion. Petit ajout, gros effet psychologique (l'effet Zeigarnik : une collection incomplète tire l'attention plus qu'une collection absente).

### 🌍 Mondes — **déjà fait**
8 mondes à identité visuelle propre existent déjà. Rien à ajouter, sauf à les relier à une méta-progression visible (voir §13).

### 👥 Clubs/Guildes — **NE PAS FAIRE pour l'instant**
Même limite que League/Duels (comptes, serveur, modération de contenu généré par les joueurs). Au-delà de l'infrastructure : la modération d'un espace social pour un jeu solo est un coût opérationnel continu (signalements, contenu inapproprié, harcèlement) que rien dans le projet actuel ne permet d'absorber. À ne reconsidérer que si et seulement si un vrai backend est construit pour d'autres raisons prioritaires.

### 🧩 Spécialisations / styles de joueur (Stratège, Combo Master...) — **idée séduisante sur le papier, risquée en pratique**
Le risque concret : BlockCraft est un puzzle à solution déterministe et unique par niveau (le solveur calcule LE par). Un système de "styles de jeu" fonctionne bien quand il existe plusieurs façons valables de gagner (un RPG, un deckbuilder). Ici, il n'y a souvent qu'une bonne façon de résoudre un niveau — un habillage "Stratège vs Combo Master" au-dessus de ça risquerait de sonner creux, une étiquette sans réelle différence de gameplay.
**Meilleure version** : remplacer "styles de jeu" par des **défis de contrainte** réels et mesurables (voir §6, Mode Défi) — "résous ce plateau sans utiliser l'indice", "résous-le en glissant uniquement à droite et en bas" — qui créent une vraie différence de skill exprimée, pas juste un titre cosmétique.

---

## 4. Les boucles de BlockCraft, reconstruites honnêtement

| Boucle | Aujourd'hui | Diagnostic |
|---|---|---|
| **10 secondes** | Un glissement, un feedback (son/vibration/particule) | ✅ Solide, rien à changer |
| **1 minute** | Résoudre un niveau, voir ses étoiles/record | ✅ Solide sur un niveau de campagne |
| **10 minutes** | **Vide.** Une fois la campagne connue, il n'y a rien à faire pendant 10 minutes non planifiées | ❌ **Le trou principal identifié dans ce document.** Cible directe de §6 |
| **Quotidienne** | Défi du jour + streak | ✅ Fonctionne, bien construit |
| **Hebdomadaire** | Résumé hebdomadaire du défi du jour (passif) | 🟡 Existe mais purement informatif, aucune action/récompense n'en dépend |
| **Mensuelle** | Rien de spécifique | ❌ Vide — voir §7 (LiveOps sans contenu fait main) |
| **Long terme (mois)** | Rien au-delà des cosmétiques finis et de la campagne finie | ❌ Vide — voir §13 (méta-progression) |

Trois trous, une seule cause commune : **pas de contenu qui se renouvelle sans intervention manuelle.** Tout ce qui suit répond à ce point précis.

---

## 5. Le contenu infini — quel mode, et pourquoi

Évaluation des 5 formats proposés dans le brief :

| Mode | Adapté à BlockCraft ? | Pourquoi |
|---|---|---|
| **Mode Infini (score qui monte)** | 🟡 Partiellement — BlockCraft n'a pas de "score" naturel au sens Block Blast (pas de grille qui se remplit) | À adapter, voir plus bas |
| **Mode Survie** | ❌ Faible — la difficulté croissante n'a pas de sens naturel sur un puzzle à solution fixe (soit le plateau est solvable, soit non ; "de plus en plus dur" doit se traduire par "de plus en plus de coups", ce qui rallonge sans forcément intéresser) | Écarter |
| **Mode Score Attack (combos/multiplicateurs)** | ✅ Bon candidat, MAIS le concept de "combo" n'a pas d'équivalent naturel dans un jeu de glissement séquentiel | À réinventer, pas copier |
| **Mode Time Attack** | ✅ Solide et simple — le chronomètre existe déjà dans le moteur (state.elapsed) | Faisable immédiatement |
| **Mode Challenge (règles spéciales quotidiennes/hebdo)** | ✅✅ Le plus naturellement compatible — le défi du jour EST déjà un mode challenge à petite échelle | Le format à étendre en priorité |

### Recommandation : "Mode Infini de Maîtrise", pas un simple mode infini

La vraie carte que BlockCraft a en main et qu'aucun concurrent cité n'a : **un solveur qui connaît la solution optimale de N'IMPORTE QUEL plateau qu'il génère.** Ça change complètement ce qu'un "mode infini" peut être.

Principe : générer des plateaux procéduralement (walls/rocks/mécaniques déjà connues du joueur, combinées aléatoirement dans les contraintes d'une grille), les valider avec le solveur EXISTANT (`Solver`/`BCD_DEV.validateLevels()` fait déjà exactement ce calcul), rejeter tout plateau non solvable ou trivial, et enchaîner les plateaux valides. Le joueur ne voit jamais un plateau cassé — le filtre de qualité déjà construit s'en charge.

Le score n'est pas "combien de lignes", c'est **combien de plateaux résolus à l'optimal (par) d'affilée**, avec un multiplicateur qui augmente tant que le joueur reste à l'optimal, et qui se réinitialise (pas le run entier, juste le multiplicateur) dès qu'il dépasse le par. C'est un Score Attack ET un Mode de Maîtrise en même temps, et **le système qui le rend possible existe déjà à 80% dans le code** (le solveur). C'est la recommandation la plus actionnable de cet audit : la partie la plus dure techniquement (prouver qu'un plateau est solvable et calculer son par) est déjà faite.

Table basse pour ce mode : Time Attack (§ ci-dessus) devient un simple réglage de ce même mode infini ("3 minutes, combien de plateaux à l'optimal ?"), pas un système séparé à construire.

---

## 6. LiveOps sans production manuelle — répondre à la question centrale du brief

Votre question : *"Comment créer du contenu renouvelable sans devoir créer manuellement des centaines de niveaux ?"*

Réponse directe : **en appliquant des règles temporaires à un espace de génération procédurale, exactement comme King le fait déjà avec Candy Crush** (voir §2) — sauf que King applique ses règles à des niveaux faits main, et BlockCraft peut les appliquer à des niveaux **générés et validés à la volée**, ce qui élimine complètement le besoin d'une équipe de contenu.

Concrètement, avec un seed déterministe basé sur la date (déjà le principe du défi du jour actuel) :
- **Événement 24h** : "Défi Sens Unique" — le générateur procédural n'utilise que la mécanique sens-unique aujourd'hui.
- **Événement hebdomadaire** : "Semaine du Monde 4" — le mode infini pioche exclusivement dans les mécaniques du monde Glacier cette semaine.
- **Contrainte spéciale** : "Aujourd'hui, l'indice coûte le double" ou "aujourd'hui, viser le par exact ou rien" — des modificateurs de règles, pas du contenu.

Aucun de ces événements ne nécessite un humain qui dessine un niveau. Ils nécessitent un générateur procédural fiable (à construire une fois) et un système de règles/modificateurs (léger). C'est la réponse honnête à "comment avoir du contenu infini sans backend et sans équipe" : **on ne génère pas plus de niveaux à la main, on génère les règles qui changent la lecture d'un espace de niveaux déjà infini.**

---

## 7. Fantômes locaux — recréer la sensation de compétition sans serveur

Puisque duels/ligues réels sont écartés (§3), voici ce qui peut réellement produire une sensation de compétition en local pur :

1. **Fantôme du par** : sur chaque plateau du mode infini, une trace visuelle du chemin optimal calculé par le solveur apparaît en overlay après la résolution — "voici comment un joueur parfait aurait joué ce plateau". Comparaison directe, honnête, jamais fausse puisqu'elle vient d'un calcul, pas d'un humain.
2. **Fantôme de soi-même** : rejouer un niveau de campagne affiche le déroulé de sa MEILLEURE tentative précédente (déjà stockée via les records par niveau) en overlay semi-transparent — battre sa propre ombre. Zéro donnée à synchroniser, tout est déjà en local.
3. **"Ligue Fantôme"** (voir §3) : des paliers (Bronze → Grand Master) débloqués par un barème absolu ("X niveaux résolus à l'optimal", "Y jours de streak cumulés au total, pas seulement le record en cours") — la sensation de "monter en rang" sans qu'aucun autre joueur réel ne soit impliqué. Honnête si présenté comme tel (un système de maîtrise personnelle habillé en paliers, pas un mensonge sur une fausse compétition).

---

## 8. Méta-progression long terme — la recommandation la plus actionnable après le mode infini

Reprenant la leçon de Royal Match (§2) : la méta-progression qui retient le mieux est **la plus simple à comprendre visuellement**, pas la plus riche en systèmes.

**Proposition concrète : "Le Jardin"** (cohérent avec l'esthétique nature/cozy déjà établie). Un espace visuel unique, visible depuis l'accueil ou le profil, qui se construit/fleurit progressivement à mesure que le joueur : termine des niveaux, résout à l'optimal, maintient un streak, débloque des cosmétiques. Chaque monde déjà existant (8, avec palette propre) pourrait littéralement correspondre à une **zone du jardin** qui se "débloque visuellement" en même temps que le monde de jeu — réutilisation directe de `WORLD_THEMES` déjà construit, aucune nouvelle direction artistique à inventer.

Ce qui rend cette proposition réaliste immédiatement : contrairement à une ligue ou un duel, elle est **100% cliente, 100% dérivée de données déjà stockées** (progression, streak, cosmétiques). C'est un écran de plus et une fonction d'agrégation — pas un nouveau système de fond.

---

## 9. Vos propres idées générées — ce qui est demandé au §18 du brief

### 10 fonctionnalités
1. Mode Infini de Maîtrise (§6) — priorité #1
2. Fantômes locaux (par, soi-même) (§8)
3. Ligue Fantôme (barème absolu, pas de PvP réel) (§3/§8)
4. "Le Jardin" — méta-progression visuelle (§9)
5. Compteur de collection global sur le profil (§3)
6. Rattrapage de streak post-hoc (complément au gel existant) (§3)
7. Succès récurrents (pas seulement one-shot — ex. "10 plateaux infinis résolus à l'optimal" répétable par palier de 10)
8. Modificateurs de règles quotidiens/hebdo appliqués au mode infini (§7)
9. Replay de sa propre meilleure tentative sur un niveau de campagne (§8)
10. Un "carnet de maîtrise" listant, niveau par niveau, si le par a déjà été atteint — objectif de complétion distinct de "terminé"

### 5 modes de jeu
1. Mode Infini de Maîtrise (généré + validé par le solveur)
2. Time Attack (réglage du mode infini, chrono existant réutilisé)
3. Mode Défi quotidien étendu (règles spéciales, §7)
4. Mode "Par exact ou rien" (chaque coup au-dessus du par échoue le run — variante punitive du mode infini pour joueurs experts)
5. Mode Zen (mode infini sans chrono ni score, juste pour le plaisir de résoudre — utile pour ne pas transformer TOUT le jeu en compétitif, cf. §12 mobile/UX sur la fatigue de la pression constante)

### 5 mécaniques de progression
1. Carnet de maîtrise par niveau (par atteint ou non)
2. Jardin visuel cumulatif
3. Collection cosmétique (déjà là, mieux mis en scène)
4. Succès récurrents à paliers
5. Historique hebdomadaire du défi (déjà là) relié à une petite récompense hebdomadaire réelle (actuellement purement informatif)

### 5 mécaniques compétitives (sans serveur)
1. Fantôme du par (bats la solution optimale calculée)
2. Fantôme de soi-même (bats ta meilleure tentative)
3. Ligue Fantôme à barème absolu
4. Classement local des amis *si* un système de partage de code/QR existe déjà indirectement via le partage d'image — sinon, écarter, ça retombe sur le problème du serveur
5. "Défi du jour" comparé à un barème historique local ("tu es dans tes 10% de meilleurs résultats personnels sur ce défi")

### 5 systèmes de rétention
1. Mode infini (raison de jouer sans but précis)
2. Rattrapage de streak
3. Modificateurs hebdomadaires (raison de revenir CETTE semaine précisément)
4. Jardin visuel (raison de revenir ce mois-ci)
5. Carnet de maîtrise (raison de revenir dans plusieurs mois — "je veux finir de tout résoudre à l'optimal")

### 5 concepts potentiellement révolutionnaires pour ce jeu précis
1. **Le solveur comme personnage** — au lieu de le cacher (`BCD_DEV`, outil de développement invisible), l'exposer comme un "esprit du jardin" qui commente la qualité du jeu du joueur ("tu as trouvé LA solution", pas juste "une solution") — transforme un outil technique existant en identité de marque.
2. **Niveaux générés par IA/procédure, soumis à un vote silencieux** (pas de compte, juste un pouce local anonyme agrégé côté client puis, à terme, remonté si un backend existe un jour) — prépare le terrain à l'UGC sans s'y engager tout de suite.
3. **"Défi miroir"** — le mode infini génère occasionnellement un plateau qui est la version inversée/symétrique d'un niveau de campagne déjà connu — surprise de reconnaissance ("attends, je connais ce plateau... à l'envers").
4. **Objectifs secrets** — un plateau du mode infini a, une fois sur N, une contrainte cachée non annoncée ("tu viens de le résoudre en exactement le par sans utiliser l'indice — succès secret débloqué") — récompense la maîtrise sans l'exiger.
5. **Le par comme monnaie narrative** — reformuler tout le vocabulaire du jeu autour de "combien de coups la nature a-t-elle prévu pour toi" plutôt que "score" — cohérent avec l'univers cozy déjà établi, différencie du vocabulaire compétitif générique de la concurrence.

### "Le truc" — la fonctionnalité qui donne une identité propre
**BlockCraft est le seul jeu de puzzle mobile dont chaque plateau a une solution mathématiquement prouvée optimale, vérifiée par un vrai solveur, pas par une estimation.** Aucun concurrent cité (Block Blast, Woodoku, Royal Match, Candy Crush) n'a ce concept — ce sont tous des jeux à RNG ou à solution non garantie unique. C'est la seule vraie carte différenciante du jeu, et elle existe déjà dans le code, largement inexploitée narrativement. La phrase qu'un joueur pourrait dire à un ami : **"Tu savais que ce jeu sait TOUJOURS si t'as fait le meilleur coup possible ? Il y a même un mode qui en génère à l'infini et qui te dit si t'étais parfait."** C'est ça, l'accroche — pas un classement, pas une ligue, la maîtrise prouvée.

---

## 10. Monétisation — cohérence avec l'existant

Le système actuel (coins → cosmétiques, aucun avantage de gameplay) est déjà sain et suit les bonnes pratiques citées dans le brief. Avec un mode infini, la monnaie retrouve un débouché naturel et infini (plus de plateaux jouables = plus de coins gagnables = plus de raisons d'acheter des cosmétiques, cycle qui ne s'épuise plus une fois la campagne finie). Aucun changement de modèle nécessaire — juste plus de raisons d'utiliser ce qui existe déjà.

## 11. Triche et anti-triche

Sans backend, tout `localStorage` est modifiable par n'importe quel joueur ayant les outils de développement de son navigateur ouverts. C'est déjà vrai aujourd'hui (coins, streak, tout est éditable). Ce n'est PAS un problème tant qu'aucune fonctionnalité ne compare un joueur à un autre (mode infini solo, succès solo, jardin solo — rien de tout ça n'est "trichable de façon nuisible", un joueur qui s'auto-triche ne lèse que lui-même). Ça REDEVIENT un problème le jour où un vrai classement partagé existe — encore une preuve que ces fonctionnalités doivent rester hors scope tant qu'aucun backend n'est construit.

## 12. Mobile/UX

Peu à ajouter — le travail déjà fait (accessibilité, feedback tactile, sessions courtes de niveau) est cohérent avec les bonnes pratiques. Un seul point de vigilance pour la suite : si le mode infini/compétitif de maîtrise est ajouté, garder au moins un mode "Zen" sans pression (§9) pour ne pas transformer un jeu actuellement détendu en jeu anxiogène — c'est un choix de positionnement, pas une contrainte technique.

---

## 13. Comparaison : vos idées vs les miennes

| Idée du brief | Mon verdict | Remplacée/complétée par |
|---|---|---|
| Blockcraft League | À ne pas faire telle quelle | Ligue Fantôme (barème absolu, §3/§8) |
| Duels asynchrones | À ne pas faire tel quel | Fantômes locaux (§8) |
| Streaks | Déjà bien fait | + Rattrapage post-hoc |
| Blockdex/collection | Bonne idée, déjà construite | + compteur global visible |
| Mondes | Déjà fait | + Jardin visuel relié aux mondes |
| Guildes | À ne pas faire | Rien — hors scope tant que pas de backend |
| Spécialisations | Risqué tel quel | Défis de contrainte mesurables |
| Mode infini/survie/score/time/challenge | Bonne intuition générale | Fusionnés en un seul "Mode Infini de Maîtrise" |

---

## 14. Architecture finale proposée

```
🧱 CORE GAMEPLAY (existant, inchangé)
   ↓
🎮 MODES DE JEU
   Campagne (existant) + Mode Infini de Maîtrise (nouveau, priorité #1) + Défi du jour (existant)
   ↓
🏅 MAÎTRISE (nouveau — remplace "compétition" au sens PvP)
   Carnet de maîtrise par niveau + Fantômes locaux + Ligue Fantôme à barème absolu
   ↓
📈 PROGRESSION
   Coins (existant) + Succès récurrents (extension) + Streak/protection (existant)
   ↓
💎 COLLECTION
   4 catégories cosmétiques (existant) + compteur global (extension)
   ↓
🌍 MONDE
   8 mondes (existant) + Jardin visuel cumulatif (nouveau)
   ↓
🔥 LIVEOPS LOCAL
   Modificateurs de règles quotidiens/hebdo sur le Mode Infini (nouveau, sans production manuelle)
   ↓
👤 PROFIL
   Existant + Jardin + Carnet de maîtrise + compteur de collection
```

Notez ce qui a disparu par rapport à l'architecture proposée dans le brief : **SOCIAL et SAISONS synchronisées** — retirées non par manque d'intérêt, mais parce qu'elles nécessitent un projet d'infrastructure séparé (§0). Elles peuvent revenir en Update 6+ si vous décidez consciemment de construire un backend.

---

## 15. Roadmap réaliste

| Update | Contenu | Difficulté | Dépendances | Impact attendu |
|---|---|---|---|---|
| **Update 1** | Mode Infini de Maîtrise (générateur procédural + réutilisation du solveur existant) | Moyenne-haute (le générateur est neuf, le solveur est réutilisé) | Aucune | Le plus fort — répond directement au trou de la boucle des 10 minutes |
| **Update 2** | Fantômes locaux (par + soi-même) + Carnet de maîtrise | Faible-moyenne (données déjà stockées, juste de l'affichage) | Update 1 pour le fantôme du par en infini | Fort — donne une raison de rejouer la campagne, pas seulement le mode infini |
| **Update 3** | Jardin visuel + compteur de collection | Faible (agrégation de données existantes + un écran) | Aucune techniquement, mais plus motivant après Update 1-2 | Moyen-fort — rétention long terme (mois) |
| **Update 4** | Modificateurs LiveOps locaux (règles quotidiennes/hebdo sur le mode infini) | Moyenne | Update 1 | Moyen — rétention hebdomadaire renouvelée sans production manuelle |
| **Update 5** | Ligue Fantôme à barème absolu + rattrapage de streak | Faible | Update 1-2 pour avoir des métriques à convertir en paliers | Moyen — sensation de progression par palier |
| **Update 6 (décision consciente, pas automatique)** | Backend minimal SI vous voulez du vrai social (classements réels, duels réels) | Élevée — projet à part | Toutes les précédentes doivent avoir prouvé leur valeur d'abord | Potentiellement très fort, mais coût et risque proportionnels |

---

## 16. Verdict final

**Ce qui est réellement bon** : le moteur, le solveur, la sauvegarde, les cosmétiques, le streak — tout ce qui est déjà construit est du travail solide, pas du remplissage.

**Ce qui est moyen** : les succès (trop one-shot), la monnaie (débouché qui s'épuise).

**Ce qui est mauvais** : rien à ce stade — le problème n'est pas la qualité de ce qui existe, c'est ce qui manque.

**Ce qui manque** : une raison de jouer sans but précis pendant 10 minutes non planifiées. C'est LE trou, et il a une seule vraie réponse : du contenu rejouable généré, pas plus de contenu fini.

**Ce qui doit être supprimé** : rien maintenant. Point de vigilance à revoir plus tard : les paliers payants de l'indice, une fois le mode infini en place.

**La plus grosse erreur actuelle** : avoir laissé le brief orienter la réflexion vers du social/compétitif (League, Duels, Guildes) alors que la vraie cause du problème décrit (contenu trop court) n'a **rien à voir** avec le social — elle se résout par du contenu procédural, entièrement côté client.

**La plus grosse opportunité** : le solveur. C'est l'actif le plus sous-exploité du projet, et c'est justement celui qui rend le Mode Infini de Maîtrise possible sans quasiment aucun nouveau code de validation.

**Fonctionnalité à ajouter en premier** : le Mode Infini de Maîtrise (Update 1).

**Fonctionnalité à surtout NE PAS ajouter** : Blockcraft League ou Duels sous leur forme actuelle — pas parce que l'idée est mauvaise dans l'absolu, mais parce qu'elle demande un projet d'infrastructure que rien dans le brief ne semble avoir anticipé consciemment.

**Le nouveau cœur du jeu** : pas la campagne (qui reste l'excellent tutoriel qu'elle est déjà), mais un mode infini où chaque plateau généré est prouvé résoluble et où le joueur cherche, indéfiniment, à égaler une solution qui existe réellement et qui ne ment jamais.

**Ce qui pourrait donner à BlockCraft une identité propre face aux autres jeux de blocs** : être le seul du genre où la notion de "parfait" n'est pas un slogan marketing, mais un fait mathématique vérifié à chaque coup.
