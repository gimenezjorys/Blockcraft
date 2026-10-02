# Seedrift (ex-BlockCraft Daily) — suivi de production

*Dernière mise à jour : 01/10/2026. Sources : `index.html` (vérité technique), `docs/audit-blockcraft-retention.md` et `docs/BlockCraft_Daily_Master_Blueprint.docx` (vérité produit).*

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
| Jour (retour) | Rosée du matin à cueillir, rituel, défi, lanternes de la semaine. |
| Mois | Jardin vivant (5 zones, 8 plantes, prairie), rang du jardinier, succès évolutifs, records du Sentier. |

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

**Appliqués ensuite (§4e)** : la *Ligue Fantôme* devient les **rangs du jardinier** (barème absolu, aucun autre joueur simulé), le *rattrapage de série* est fait (rejouer le défi d'hier), le *compteur de collection* est sur le profil.

**Non appliqué (et pourquoi) :**
- *Objectifs secrets* et *modificateurs hebdomadaires du Sentier* : utiles, mais moins urgents que la boucle quotidienne. Reportés.
- *Éditeur de niveaux partagé, classements, notifications* : exigent un serveur (audit §0).

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

## 4b. Refonte visuelle et sonore

**Direction artistique : « Jardin de nuit lumineux ».** Fond forêt, texte crème, or réservé aux récompenses. Formes arrondies ; cercles pour la lumière et les graines. Mouvement « glisse et tasse » : action rapide, ambiance lente. Son : **bois** pour les actions, **verre** pour la lumière et les récompenses.

- **Ambiance** : halo, feuillage SVG et 12 lucioles en CSS pur (transform/opacity, aucune boucle JS), masquées en jeu. Transitions d'écran selon le sens (avancer, revenir, ouvrir).
- **Victoire** : emblème lumineux avec rayons et badge du monde, bouton principal qui scintille, coins comptés à l'écran.
- **L'Atelier (cosmétiques)** : scène d'essai en haut (la graine glisse vers la lumière avec sa traînée et son effet de victoire), rareté visible (commun, rare, épique, légendaire), comparaison avec l'objet équipé, bouton unique « Débloquer · prix » / « Équiper » / « Encore N 🪙 ». Déblocage célébré (étincelles, son selon la rareté). Nouveaux objets : graines Braise, Givre, Aurore, Nuit étoilée ; traînée Comète ; victoire Éclosion ; cadre Prisme animé. Aucun minuteur ni offre « limitée ».
- **Audio** : bus commun (compresseur doux + réverbération courte). Musique générative en ré majeur pentatonique, 4 ambiances (accueil 74 bpm, jeu 78, Sentier 100, Atelier 86), phrases A A' B A. Les coups enchaînés montent sur la gamme ; la victoire joue le motif signature. Réglé par rendu hors ligne (`BCD_DEV.renderAudioPreview(kind, s)`) : musique ≈ −36 dB RMS, effets −24 à −32 dB, pas d'écrêtage.
- **Tutoriels** : « montrer plutôt qu'expliquer ». Niveau 1 : graine fantôme et doigt qui glissent jusqu'à la lumière, jusqu'au premier coup. Mécanique présentée (nouvelle, INTRO/TEACH, vedette du Sentier) : ses cases pulsent 3 fois. Aide : vraies cases du plateau en miniature comme icônes.
- **Textes** : messages de mécaniques, tutoriel, victoire, réglages, confidentialité, Sentier et Jardin raccourcis (une phrase, ton direct). Notes d'introduction inutiles supprimées (profil, aide).
- **Performance** : mesuré sous CPU ×4 (proxy d'un téléphone moyen), 60 i/s stables sur l'accueil, en jeu et dans l'Atelier. Seul coût notable : la création de l'audio au tout premier geste (≈ 30 ms réels, une fois), réduite en calculant l'enveloppe de réverbération par blocs.

## 4c. Boucle de rétention : le Jardin endormi, le Rituel du jour, les pubs récompensées

Analyse, idées écartées et feuille de route : **`ROADMAP-RETENTION.md`**.

**Boucle phare : le Jardin endormi.** Jouer donne de la **rosée** 💧, qui réveille un jardin de nuit :
- 5 zones (Portail, Fontaine, Potager, Serre, Grand Arbre), 5 chantiers chacune, faits dans l'ordre ;
- chaque chantier a un « avant » (ronces, bassin plein de feuilles…) et un « après » en SVG procédural ;
- le voile de nuit s'éclaircit à chaque chantier ;
- une zone terminée déclenche une fête (non bloquante, fermée d'un toucher) avec des coins ;
- la dernière zone donne la **Graine de lune**, légendaire et exclusive : elle ne s'achète pas.

**Barème de la rosée** (constante `ROSEE`, section A4) :

| Source | Rosée | Garde-fou |
|---|---|---|
| Étoile de campagne gagnée pour la 1re fois | +1 par étoile | Rejouer un niveau déjà à 3★ ne rapporte rien |
| 1re réussite du défi du jour | +4 (+2 en 3★) | Les retentatives ne rapportent rien |
| Solution parfaite du Sentier | +1 | Plafond : 12 par jour |
| Mission du rituel | +3 | 3 missions par jour |
| Coffre du rituel | +5 et +10 🪙 | 1 par jour |
| Pub récompensée (facultative) | Arrosage +6, second coffre +5, rosée d'une victoire doublée | Plafonds, voir plus bas |

Coût total : **720 💧** (de 3 à 70 par chantier). Estimation, à vérifier en test : 3 à 4 semaines pour un joueur engagé, 6 à 8 pour un joueur occasionnel. La 1re zone se termine dès le 1er jour.

**Rituel du jour.** 3 missions, dont la 1re est toujours « Réussis le défi du jour ». Les 2 autres sont tirées de façon déterministe selon la date, parmi celles que le joueur peut faire (pas de mission Sentier avant son ouverture). Les 3 missions ouvrent un coffre.

**Crochets de retour** :
- l'accueil montre toujours le prochain chantier, sa scène miniature, sa jauge 💧 et un badge « Prêt ✨ » ;
- le bandeau du rituel indique les missions faites et le coffre ;
- en victoire, des puces annoncent la rosée gagnée, la mission accomplie et « Prêt à réveiller : … ».

**Succès** : « Jardinier » (5 chantiers) et « Le jardin s'éveille » (les 25).

**Pubs récompensées (architecture seulement).** `AdService`, section M4, avec un fournisseur **simulé** (écran « PUB SIMULÉE · TEST »). Emplacements, tous facultatifs et marqués « PUB » :

| Emplacement | Quand | Récompense | Plafond / jour |
|---|---|---|---|
| `victory_double` | Écran de victoire, sous les boutons | Double la rosée et les coins de base (jamais les succès) | 3 |
| `hint_bonus` | Indice ciblé demandé sans assez de coins (campagne et défi) | Palier 3 de l'indice ; le chrono est en pause pendant la pub | 3 |
| `garden_boost` | Carte du prochain chantier | +6 💧 | 1 |
| `ritual_chest_bonus` | Après ouverture du coffre du rituel | Second coffre, +5 💧 | 1 |
| `sentier_double` | Fin de partie du Sentier | Double les coins de la partie (jamais le score) | 2 |

Plafond global : 8 pubs par jour, avec au moins 20 s entre deux pubs. Il n'y a **pas de pub « annuler un coup »**, car Annuler est déjà gratuit et illimité : en faire payer un créerait une rareté artificielle (ligne rouge).

### Brancher une vraie régie publicitaire (ce qu'il faut fournir)

Un fichier HTML seul ne peut pas afficher de vraies pubs. Deux voies :

1. **Application mobile (recommandé pour la rétention)** : enrober le jeu avec **Capacitor**, puis ajouter le plugin `@capacitor-community/admob`. À fournir :
   - un compte **Google AdMob** ;
   - un **ID d'application** et un **ID de bloc « Rewarded »** par plateforme (Android, iOS) ;
   - les comptes **Google Play Console** (frais uniques) et **Apple Developer** (abonnement annuel) ;
   - une **politique de confidentialité** publiée ;
   - pour l'UE, le formulaire de consentement **UMP** (fourni par AdMob).
2. **Portail web de jeux HTML5** : SDK **CrazyGames** (`CrazyGames.SDK.ad.requestAd('rewarded')`) ou **Poki** (`PokiSDK.rewardedBreak()`), ou l'**Ad Placement API** de Google (AdSense pour jeux H5, validation du site requise). À fournir : le compte éditeur du portail. Ces SDK sont des scripts externes : c'est une exception assumée à la règle « fichier autonome », à ne charger que dans la version du portail.

**Où brancher** : ajouter un fournisseur dans `AD_PROVIDERS` (section M4). Il doit respecter le contrat `available()` et `showRewarded(placement) → Promise<{ rewarded }>`, puis mettre `AD_PROVIDER` à son nom. Plafonds, mesures, pause du chrono et coupure de la musique sont déjà gérés par `AdService`. `AD_PROVIDER = 'none'` masque tous les boutons.

**Mesure** : événements `ad_offered`, `ad_start`, `ad_completed`, `ad_skipped` ; `rosee_gain` par source ; `garden_task` ; `garden_zone` ; `ritual_mission` ; `ritual_chest`. Ils s'ajoutent à un agrégat **par jour** (`bcd_retention_v1`, 120 jours, indépendant du journal plafonné) : sessions par jour, victoires par session, retours J1/J7/J30, taux d'acceptation des pubs. Tout est lisible dans `BCD_DEV.getRetentionReport()`.

**Jour de référence** : depuis octobre 2026, **toutes les dates sont en UTC** (`dateKeyFor`), pour tout le monde : défi du jour, série, rituel, rosée du matin, plafonds de pubs. Le jour change donc à 1 h (hiver) ou 2 h (été) en France. Passage sans perte : une clé « du futur » héritée de l'ancienne heure locale compte comme aujourd'hui (série jamais remise à 1 pour ça). Les écarts de jours restent calculés par `dayDiff`.

## 4d. Nom, icône et tutoriel (croissance)

- **Nom : Seedrift** (ex-BlockCraft Daily). « BlockCraft » était noyé sous Minecraft, Roblox et Block Blast. Recherche, preuves et ce qui reste à vérifier (marques, domaines) : `NAMING.md`. Le nom visible se change en une ligne (`GAME_NAME`). Les clés de sauvegarde `bcd_*` sont inchangées.
- **Icône : la mascotte qui glisse** : Germain, la graine du jeu, avec un visage, file vers la lumière. Trois variantes comparées sur une planche (1024 / 120 / 60 / 40 px, fonds clair et sombre, faux écran d'accueil). Exports reproductibles pour l'App Store (RGB sans alpha), Google Play, Android adaptive, maskable, PWA et favicons. Voir `ICON.md`.
- **Tutoriel avec Germain** (principes : `ONBOARDING.md`) :
  - accueil de 10 à 15 s, puis niveau 1 guidé (doigt fantôme + réactions) ;
  - niveaux 2 et 3 en autonomie ;
  - chaque nouvelle mécanique devient une mini-scène au lieu du texte en bas ;
  - visite des onglets un par un, quand ils deviennent utiles (Jardin dès qu'un chantier est payable, Atelier dès 30 pièces, défi, succès, profil), avec un projecteur et un cadeau (+3 💧, une graine offerte) ;
  - succès « Apprenti » (+25 🪙) à la fin ;
  - rappel du défi le lendemain (première semaine seulement, jamais si déjà fait) ;
  - joueurs existants : aucune intro, une visite des nouveautés facultative.
- **Garde-fous** :
  - « Passer » toujours visible, « Plus tard » sur chaque visite (au 2e refus, l'étape est abandonnée) ;
  - rejouable depuis les Paramètres et l'Aide ;
  - une cible absente ou un changement d'écran annule l'étape ;
  - réouverture en plein tutoriel = reprise (« On reprend ? ») ;
  - **Réinitialisation de la progression = le tutoriel recommence** : choix assumé, c'est un joueur neuf.
- **Mesure** : `tutorial_started`, `step_completed` (étape), `tutorial_skipped` (étape où l'on décroche), `tutorial_completed`, dans `BCD_DEV.getRetentionReport().tutorial`.


## 4e. Le Jardin vivant, la rétention quotidienne et la refonte visuelle (octobre 2026)

**Le Jardin devient le cœur visuel du jeu.** Il passe d'une vignette 320×200 à un **panorama plein écran** de 5 tableaux (un par zone) qu'on fait défiler du doigt (ou aux flèches) :
- **profondeur** : ciel en parallaxe → montagnes en perspective atmosphérique → collines et arbres continus d'un tableau à l'autre → terrasse de la zone (scènes « avant / après » agrandies) → avant-plan (allée, plantes, prairie, rosée, Germain) → cadre de feuillage ;
- **ciel à l'heure du joueur** (aube, jour, crépuscule, nuit ; heure locale, c'est de la lumière) avec soleil et rayons, ou lune ; **la nuit, une étoile par étoile gagnée** ;
- **météo du jour** (même pour tous, UTC) : ciel clair, brise, pluie fine, brume, pluie de pétales ;
- **8 espèces** (une par monde : tournesol, pensée, digitale, lys de givre, orchidée de cristal, iris, rose des ruines, fleur d'étoile), **5 stades** chacune (graine → pousse → tige → bouton → fleur), qui ondulent au vent ; on les touche pour voir l'espèce et le prochain objectif ;
- **vie** : lucioles la nuit, papillons le jour (plus il y a de chantiers, plus il y en a), oiseaux, et **un animal par zone réveillée** (rouge-gorge, grenouille, lapin, chat, chouette) ;
- **Germain habite le jardin** (dans la zone en cours) et répond quand on le touche ;
- **moments de récompense** : chantier réveillé = la caméra s'approche, éclair, rayons, pétales, son ; **plante qui grandit** = l'ancienne forme s'efface, la nouvelle éclot avec un éclat (rejoué à l'ouverture du jardin, puis montré en grand sur l'écran de victoire) ; zone réveillée = fête.

**Le jardin reflète la régularité, jamais l'absence** (rien ne fane) :

| Ce que fait le joueur | Ce qu'il voit au jardin |
|---|---|
| Revient chaque jour | **Rosée du matin** : 3 gouttes à cueillir d'un toucher (+1 avec une série de 3 jours, +1 à 7 jours, +1 les jours de pluie ; 6 au plus). Petite mélodie qui monte goutte après goutte. |
| Réussit le défi du jour | Une **lanterne** s'allume dans la guirlande des 7 derniers jours (dorée en 3★). |
| Gagne des étoiles | Les plantes grandissent ; les étoiles s'allument dans le ciel de nuit. |
| Joue au Sentier | La prairie fleurit (1 fleur toutes les 5 solutions parfaites). |

**Rétention : ce qui a été ajouté (une phrase de justification chacun)**

| Ajout | Pourquoi (J1/J7/J30) |
|---|---|
| Rosée du matin | Une raison d'ouvrir le jeu chaque jour, en 10 secondes, même sans jouer longtemps (J1, J7). |
| Rattrapage de série : rejouer le défi d'hier (gratuit tous les 7 jours, sinon pub récompensée) | Perdre une longue série est la première cause d'abandon ; ici on la sauve par un effort, pas un achat (J7, J30). |
| Série affichée « vivante » | Corrige un bug : l'accueil montrait encore une série perdue depuis des jours. |
| Rangs du jardinier (8 paliers, barème absolu) | Un objectif long et lisible qui récompense tout ce que fait le joueur, sans faux classement (J30). |
| Bon retour après 3 jours (+6 💧, Germain, sans reproche) | Ramène le joueur qui décroche sans le culpabiliser (J30). |
| Plante qui grandit en victoire | Relie chaque étoile au jardin, tout de suite (session). |
| Compteur de collection sur le profil | Rend visible le « presque complet » (audit §3). |
| Accueil = fenêtre vivante sur le jardin | Le prochain objectif, la rosée à cueillir et le rang sont visibles dès l'ouverture. |

**Aides contextuelles** (règle : une fois chacune, passable, dans n'importe quel ordre) : Germain explique la rosée, la guirlande, la croissance des plantes, le rang et le rattrapage au moment où ils apparaissent ; jamais pendant l'intro ni par-dessus une autre bulle. Clé `bcd_tips_v1`.

**Pubs : points d'accroche** (section M4) :
- `showRewardedAd(placement, { onReward, onSkip, onUnavailable })` : repli propre si aucune pub n'est prête. Nouveaux emplacements : `streak_repair` (1/jour) et `dew_bonus` (seconde rosée, +3, 1/jour, seulement une fois la rosée cueillie).
- `showInterstitial(placement)` : **désactivé** (`INTERSTITIAL_ENABLED = false`), appelé seulement aux pauses naturelles (entre deux niveaux). Règles prêtes et testées (`interstitialAllowed`) : jamais avant 12 niveaux, une pause sur 4, 5 min d'écart, 3 par jour. L'étude de marché (§7) déconseille les interstitiels agressifs : à n'activer qu'en le mesurant.

**Refonte visuelle du reste du jeu** :
- **plateau** : dalles biseautées, murs en pierre appareillée et surélevés, rochers polis, graine avec reflet, lumière de la cible qui tourne ; **impact** : poussière au point d'arrêt et plateau qui « encaisse » d'un ou deux pixels ;
- **chaque monde a son ambiance** : décor en silhouette, lumière et particules (Cailloux : poussière chaude ; Impasses : lianes et spores ; Givre : montagnes, stalactites, neige ; Passages : cristaux et feux follets ; Courants : vagues et feuilles portées ; Ruines : colonnes et braises ; Failles : failles lumineuses et étincelles) ;
- **carte des mondes** : la plante du monde (à son stade) dans chaque en-tête, le décor du monde en fond, les niveaux parfaits dorés ;
- **profil** : rang du jardinier, compteur de collection ; **victoire** : la plante qui a grandi ;
- **transitions** : les éléments d'un écran entrent en cascade (0,4 s), le jardin se construit tableau par tableau.

**Performance** (Chromium, processeur ralenti ×4, approximation d'un téléphone moyen) : 57 à 60 images/s sur l'accueil, le jardin (y compris en faisant défiler) et en jeu avec la neige du Givre ; ouverture du jardin en 0,27 à 0,49 s. Les tableaux hors de l'écran sont en pause.

**Sauvegardes** : `bcd_garden_v1` passe au **schéma 2** (migration : les nouveaux champs démarrent « jamais vu », rien n'est écrasé ; pas de fête rétroactive). Nouvelle clé `bcd_tips_v1` (schéma 1).

## 4f. Nouvelle navigation et nouvelles raisons de revenir (octobre 2026)

**Le problème** : tous les onglets étaient serrés en haut à droite, loin du pouce, sans repère de la page active ni signal de ce qui attend le joueur.

**La structure** :

```
Écran de lancement  →  [ Marché | Collection | ▶ JOUER | Jardin | Profil ]   + ⚙ (roue dentée, discrète)
                         ←———— glisser entre les pages, ou toucher un onglet ————→
```

- **Écran de lancement** (rapide, rien à charger) : logo animé (la graine glisse vers la lumière), le jardin du joueur en fond (son ciel, son heure, sa météo), Germain, un grand bouton **Jouer**, et ce qui l'attend : série en cours, cadeau du jour prêt, défi à relever ou réussi, gouttes de rosée, récompenses à récupérer. Les cadeaux (bon retour, fête du rang) attendent la page JOUER.
- **5 pages côte à côte**, qu'on fait glisser au doigt (la page suit le doigt, ressort aux extrémités, une pichenette suffit) **ou** par la **barre d'onglets en bas** (zone du pouce, icônes dessinées, JOUER au centre en grand, page active surlignée). Retour en haut en touchant l'onglet actif. Flèches du clavier sur la barre.
- **JOUER** (centre) : le monde en cours et son bouton, le défi du jour, le Sentier, le rituel, la vignette du jardin, la carte des mondes.
- **Marché** : cadeau du jour, offre du jour, lot de la semaine, pièces contre une pub, gel de série.
- **Collection** : l'Atelier (essai en direct de chaque objet), la progression de la collection et ses paliers, les objets neufs marqués.
- **Jardin** : le panorama vivant.
- **Profil** : rang, puis trois rubriques — **Missions** (rituel du jour, missions de la semaine, passe de saison), **Succès**, **Stats**.
- **Paramètres** : roue dentée en haut à droite, seule avec « ? » (aide) ; ce sont des écrans par-dessus, sans barre d'onglets.
- **Pastilles** sur les onglets (nombre, ou point rouge sur JOUER tant que le défi du jour est à faire) et sur les rubriques du Profil ; elles disparaissent dès que c'est fait ou vu. À la mise à jour, ce que le joueur possède déjà est marqué « vu » : pas d'avalanche.
- **Jamais de glissement de navigation pendant une partie** : le hub est masqué en jeu (le plateau garde tous les gestes). Ni au-dessus du panorama du jardin ou de la piste de saison (qui défilent eux-mêmes), ni sous un projecteur de Germain.
- **Bouton retour du téléphone** : écran par-dessus → son retour ; page du hub → JOUER ; JOUER → lancement ; lancement → on sort de l'app.
- **Aide de chaque page** (une fois, passable, dans n'importe quel ordre) ; l'aide « Glisse pour changer de page » vient à la première arrivée calme sur JOUER (ou en fin de visite des nouveautés). Le tutoriel de Germain montre désormais les onglets de la barre du bas.

**Fonctionnalités ajoutées (une phrase de justification chacune)** :

| Ajout | Page | Pourquoi (J1/J7/J30) |
|---|---|---|
| **Cadeau du jour** (calendrier de 7 cadeaux : coins, rosée, gel de série, coffre le 7e jour ; un jour manqué ne fait rien perdre ; doublé une fois par une pub) | Marché | Une récompense garantie à chaque ouverture, sans punition de l'absence (J1, J7). |
| **Missions de la semaine** (4 parmi 8, tirées pour la semaine UTC, +20 coins chacune, coffre +60 coins +10 💧) | Profil › Missions | Un objectif à moyen terme entre le rituel du jour et le jardin ; audit §9 « modificateurs hebdomadaires » (J7). |
| **Passe de saison gratuit** (20 paliers par mois UTC, XP de tout ce qu'on fait, palier 20 = 120 coins + 15 💧 ; les paliers non récupérés sont rendus au changement de mois) | Profil › Missions | Une progression mensuelle lisible, sans achat ni perte (J30). |
| **Offre du jour** (−30 %) et **lot de la semaine** (3 objets, −25 %), en coins seulement | Marché | Donne une raison de regarder le Marché et rend les coins utiles, sans argent réel ni pay-to-win (J7). |
| **Paliers de collection** (5/10/15/20/25 objets : 20 à 120 coins) | Collection | Met en scène le « presque complet » de l'audit §3 (effet Zeigarnik) (J30). |
| **5 succès secrets** (rosée 7 jours, série sauvée, coffre de la semaine, cycle complet de cadeaux, palier final de saison), montrés « ??? » | Profil › Succès | Audit §9 « objectifs secrets » : récompenser la régularité sans l'exiger (J30). |
| **Ton classement personnel** au défi du jour (« 2e meilleur sur tes 9 derniers ») | Résultat du défi | Audit §9 « comparé à un barème historique local » : se mesurer à soi, jamais à de faux joueurs (J7). |
| **Pièces contre une pub** (+20, 2 par jour) et **cadeau doublé** (1 par jour) | Marché | Nouveaux emplacements récompensés, toujours derrière un bouton « PUB », plafonnés (`AD_PLACEMENTS`). |

**Simplifications** : un seul endroit par chose (le rituel vit dans Missions, les succès dans le Profil, les cosmétiques dans Collection) ; les boutons « retour » des pages du hub ont disparu (la barre suffit) ; l'accueil ne porte plus de rangée d'icônes.

**Performance** (Chromium, processeur ralenti ×4) : 56 à 60 images/s au repos sur chaque page (les animations des pages hors écran sont en pause, le reflet des boutons passe en `transform`) ; glissement entre pages à 46–58 images/s en moyenne, la piste étant animée par le compositeur ; les tableaux du jardin ne sont reconstruits que si leur contenu a changé.

**Sauvegardes** : 5 nouvelles clés, toutes dans `SCHEMA_MIGRATIONS` (schéma 1) : `bcd_gift_v1`, `bcd_weekly_v1`, `bcd_season_v1`, `bcd_market_v1`, `bcd_nav_v1`. Une ancienne sauvegarde se charge sans perte ; la réinitialisation les efface aussi.

**Bugs corrigés en route** : la réinitialisation oubliait les données du hub ; une bulle de Germain en bas pouvait couvrir la barre d'onglets (elle se pose maintenant au-dessus) ; deux aides pouvaient se disputer l'arrivée au Jardin (une seule par visite, par priorité) ; les tests E2E tournent en http (en `file://`, Chromium perd parfois tout le localStorage au rechargement, ce qui rendait un test instable).

## 4g. Refonte du design « Verger au soleil » (octobre 2026)

**Le problème** : un vert foncé partout (fond, cartes, plateau, icône), des surfaces plates et semblables, peu de contraste entre les éléments importants et le décor, des mécaniques distinguées surtout par la couleur.

**La nouvelle direction artistique** : un verger en plein jour, chaud et lumineux. Des objets « en pâte à modeler » qu'on a envie de toucher.

- **Palette** (variables centralisées dans `:root`) : fond crème et pêche (`--paper`, `--sun-1…3`), texte prune profond (`--ink` #3b2440, jamais de noir pur), accents **corail** (`--coral`, action principale), **lagon** (`--teal`), **soleil** (`--sunny`, récompenses), **ciel** (`--sky`, information), **baie** (`--berry`, rareté épique), **feuille** (`--leaf`, réussite). Le vert n'est plus qu'un accent parmi d'autres.
- **Matière** : chaque objet a un bord épais plus sombre en dessous (relief), une ombre douce et tiède, un reflet en haut. Un bouton pressé s'enfonce (`translateY`). Rayons généreux (`--r-s` à `--r-xl`), ressort (`--spring`) pour les apparitions.
- **Typographie** : Baloo 2 (titres ronds et épais), Nunito (texte), avec repli sur system-ui.
- **Inspirations** (sans copie) : Royal Match et Homescapes pour le relief et la récompense, Monument Valley et Alto pour la lumière et les dégradés, Two Dots pour la lisibilité des formes, Gardenscapes pour le jardin.
- **Icône** : Germain sur un **ciel bleu** au lieu du vert foncé (chaud sur froid, voir `ICON.md`) ; `theme-color` et manifest en crème `#fff1df`.

**Ce qui a été simplifié** :
- **Mécaniques reconnaissables par la forme** (vérifié en niveaux de gris, deutéranopie et protanopie) : mur = bloc de briques en relief ; rocher = galet rond marqué ◆ ; ancre = glace creusée ❄ ; portails = puits en spirale ⟳/⟲ ; sens unique = dalle à flèche ; interrupteur = disque jaune ◉ ; porte fermée = barreaux ▥, ouverte = pointillés ◇ ; cible = fleur-soleil rose (forme et couleur différentes de la graine, qui est une bille brillante).
- **Aide** : une carte par mécanique déjà vue ; les mécaniques pas encore rencontrées tiennent en une seule carte « N surprises à découvrir ».
- **Victoire** : les succès gagnés sont regroupés en une puce « N succès débloqués » (5 puces au plus).
- **Profil** : statistiques dédoublonnées (une seule grille).
- **Page JOUER** : les cartes secondaires sont rangées en grille de 2 ; icônes des onglets en deux tons.

**Écran par écran** :
| Écran | Changement |
|---|---|
| Lancement | Fond crème au halo de soleil, logo redessiné (dalle claire, mur d'ardoise, fleur-soleil rose, graine aux couleurs du cosmétique), grand bouton corail qui respire (ombre, sans bouger : stable au toucher). |
| Barre d'onglets | Barre blanche arrondie, JOUER en bouton corail au centre, onglet actif surligné, pastilles rouges lisibles. |
| JOUER | Carte du monde en cours aux couleurs du monde, défi et Sentier en tuiles, vignette du jardin en plein jour. |
| Plateau | Bac en bois clair par monde, dalles en relief, graine brillante ; à la victoire, éclosion de pétales et d'étincelles, halo du plateau (rien si animations réduites). |
| Victoire | Emblème, étoiles et puces de récompense en relief, « Voir le chemin parfait ». |
| Carte des mondes | Chaque monde garde sa palette ; niveau courant en corail qui respire. |
| Marché, Collection, Profil, Paramètres, Aide | Cartes blanches en relief, raretés colorées, segments et interrupteurs en pâte. |
| Jardin | Cadre de carte autour du panorama ; chips de rosée et de météo plus contrastées et qui ne se chevauchent plus. |
| Germain | Bulle blanche, toujours au-dessus de la barre d'onglets. |
| Partage | Carte image claire, aux couleurs de la nouvelle palette. |

**Les 8 mondes** (en plein jour, une palette chacun : fond, bac, dalles, accent, décor) : 1 Le Jardin (matin de verger), 2 Les Cailloux (canyon de terre cuite), 3 Les Impasses (labyrinthe de haies), 4 Le Givre (matin de neige), 5 Les Passages (grotte de cristal), 6 Les Courants (lagon), 7 Les Ruines (heure dorée), 8 Les Failles (crépuscule étoilé). API : `worldVars(theme)`, `setWorldVars(el, world)`, `applyWorldTheme(world)`. Les couleurs des mécaniques, elles, ne changent jamais d'un monde à l'autre.

**Cosmétiques** (identifiants conservés : rien n'est perdu, l'objet équipé reste équipé) :
- **Chaque graine a sa matière** : jade, saphir taillé, cœur de rubis, géode d'améthyste, bille de chrome (reflet qui passe), braise, givre, aurore, nuit…
- **Nouvelles** : 5 graines (Pastèque, Coccinelle, Rayon de miel, Bulle irisée, Petit soleil), 3 traînées (Bulles, Notes, Arc-en-ciel légendaire), 2 victoires (Papillons, Feu d'artifice), 2 cadres (Lagon, Couronne de fleurs).
- **Raretés lisibles** : commun (gris chaud), rare (ciel), épique (baie), légendaire (soleil) ; la scène d'essai des objets épiques et légendaires a ses rayons.

**Rétention** (une recommandation non appliquée de l'audit, choisie pour son impact) : **le chemin parfait** (audit §7, « fantôme du par »). Après une victoire en moins de 3 ★ en campagne, « Voir le chemin parfait » rejoue la solution optimale sur le plateau (cases numérotées), puis rend la main : « À toi : N coups pour ★★★ ! ». Il transforme l'échec en envie de rejouer (J1) et apprend la maîtrise (J7). Les modificateurs de la semaine et un mode « par exact » n'ont **pas** été ajoutés : on a préféré simplifier plutôt qu'empiler.

**Son** : timbre « pâte » (`clay()`) pour les boutons, interrupteurs et l'équipement d'un objet ; étincelles de verre à la victoire. Même bus, même réverbération.

**Tutoriel** : voir `ONBOARDING.md`. Visites du Marché (cadeau du jour) et du Profil (missions, saison et succès réunis) ; l'ancienne visite des succès disparaît ; annonce unique du nouveau look aux anciennes sauvegardes (`look2`) ; aide du chemin parfait.

**Accessibilité** : contrastes vérifiés (texte blanc sur corail et sur ciel assombris, libellés des onglets, chips du jardin), cibles tactiles de 44 px au moins, `prefers-reduced-motion` respecté par toutes les nouvelles animations, annonces `aria-live` inchangées.

**Performance** (Chromium, processeur ralenti ×4) : 57 à 60 images/s au repos sur chaque page, 45 à 58 en glissant entre les pages. Les animations des boutons cliquables ne touchent pas `transform` (pulsation d'ombre) : le toucher reste stable.

**Bugs corrigés en route** : statistiques du Profil en double ; la porte fermée et le rocher avaient le même symbole ◆ ; la couronne du « Petit soleil » passait sur la graine ; la chip de météo du jardin chevauchait celle de la rosée ; l'en-tête de JOUER était coupé à 360 px ; plusieurs textes blancs sous le seuil de contraste.

**Ce qui ne change pas** : la logique de jeu. Aucun niveau, aucune mécanique, ni le moteur, ni le solveur n'ont été touchés ; les 60 solutions rejouées dans le vrai moteur gagnent toujours en exactement « par » coups.

## 4h. Passe d'amélioration globale (octobre 2026)

**Méthode** : playtest simulé avant/après (Chromium, vrais clics : nouveau joueur qui suit Germain, 5 premières minutes, retour le lendemain) et simulation jsdom de 30 jours d'un joueur régulier (cadeau, défi, 5 niveaux, rosée, chantiers, missions, achats). Scripts dans le dossier de travail de la session ; les constats sont devenus des tests.

**Problèmes trouvés et réglés** :
| Constat | Correction |
|---|---|
| ⛔ Joueur coincé à la visite du Jardin : le projecteur faisait défiler la piste des pages (scrollLeft 287 px) et la bulle couvrait la cible | Piste en `overflow:clip` + remise à 0 ; cible centrée (`Coach.center`) puis bulle du côté libre (`Coach.sideFor`) |
| 1er coup à 7,9 s (écran JOUER + 3 bulles) | « Jouer » lance le niveau 1 directement ; Germain se présente sur le plateau en une bulle → **2,3 s** ; 1re victoire 17 → **8,4 s** |
| Jardin, cadeau, missions jamais vus par qui enchaîne « Niveau suivant » | « 🌱 Réveiller le jardin » sur la victoire (niveau 2 pendant le tutoriel, puis dès que la rosée suffit) ; Germain ramène au niveau suivant |
| Pas de sortie de l'écran de victoire sans bouton retour (iPhone) | Bouton ⌂ en haut à gauche |
| Pastille Profil « 9+ » en 5 min, coincée à vie | Une action = 1 ; succès signalés sur la rubrique « Succès » seulement |
| Pièces infinies en rejouant le défi | Pièces à la 1re réussite du jour seulement |
| Passe de saison fini en 8 jours | Barème `SEASON_XP` recalibré : ~3 semaines |
| Catalogue entier achetable vers J14, 1 775 🪙 inutiles à J30 | Prix ×1,7, objectif d'achat toujours visible dans la Collection (`nextShopGoal`) |
| Campagne finie à J13 (« Campagne terminée ») | **Les Terres sauvages** : mondes générés sans fin après le 60 |
| Jardin fini à J23, rosée inutile ensuite | **Bouquets** : 15 💧 → 8 🪙 + XP de saison (jardin schéma 3) |
| Défi gagné après minuit UTC compté pour le lendemain | Compté pour son jour (`state.dailyDay`, `recordLateDaily`, `streakCreditDay`) |
| Fête de rang ouverte au milieu du Marché | Seulement sur la page JOUER |
| Mise en page cassée à 320 px ; plateau de 140 px en paysage | Règles ≤ 340 px ; plateau 220 px en paysage |

**5 premières minutes** : entrée immédiate, une bulle par moment, 1re grosse récompense (le jardin qui se réveille) au bout de 2 niveaux, et la carte **« À demain ! »** (cadeau suivant, défi de demain, série, heures avant le nouveau jour) une fois la journée faite.

**Game feel** : glissement dont la durée suit la distance (112 ms + 22 ms/case, max 250 ms) avec décélération ; choc du plateau et « toc » sourd (`sfxImpact`) au-delà de 3–4 cases ; vibration proportionnelle ; le coup part pendant le geste (28 px) et non au lever du doigt, un seul coup par contact.

**Les Terres sauvages** (`buildEndlessLevel`, `levelAt`, `worldInfoAt`) : monde 9, 10… de 8 niveaux, une palette et une mécanique vedette par monde (cycle des 8 mondes, puis « II », « III » un peu plus durs, plafonnés), dents de scie dans chaque monde, mêmes plateaux pour tous (graine = numéro), `ENDLESS_GEN_VERSION`. Progression dans `bcd_progress_v1` aux index ≥ 60 (aucune nouvelle clé). Vérifiés par le solveur ET par un **BFS indépendant** écrit de zéro dans `test-logic.js` (qui confirme aussi les 60 niveaux, le Sentier et le défi).

**Économie après réglage (simulation 30 jours)** : ~120 🪙/jour ; graine légendaire vers J12 ; catalogue complet vers J33 ; passe fini vers J23 ; jardin fini vers J19, puis bouquets.

**Robustesse** : stockage plein et stockage interdit testés (on joue et gagne sans erreur) ; 100 niveaux d'affilée : tas JS stable (~5 Mo) ; code mort retiré (`beep`, `sfxMove`, branches « campagne terminée »).

## 5. Tests exécutés (résultats observés)

| Commande | Ce qu'elle vérifie | Résultat |
|---|---|---|
| `node scripts/check-game.js index.html` | `node --check` + solveur sur les 60 niveaux | 60 niveaux, 0 cassé, 4 avertissements (INTRO en 1 coup, voulu) |
| `node scripts/test-logic.js` | 480 symétries ; générateur (7 mécaniques × 5 paliers) ; parties simulées ; 400 défis ; jardin (barème, plafonds, parcours complet, données corrompues), rituel (120 jours), pubs (plafonds), rétention (J1/J7/J30) ; **jardin vivant** (ciel, météo sur 1 000 jours, rosée du matin, croissance, rangs, rattrapage, bon retour, aides, interstitiel) | 6 730 vérifications, 0 échec (dont le BFS indépendant, les Terres sauvages, les bouquets, « À demain », la série créditée à un jour précis ; et le tutoriel : répliques de 12 mots max, jamais « undefined », états corrompus, choix des visites, rappel ; et le **hub** : cadeau, missions de la semaine, saison et report, marché, collection, pastilles, classement personnel) |
| `node scripts/test-dom.js` | **jsdom** avec de vrais `KeyboardEvent` / `PointerEvent` : écran de lancement, nouveau joueur, swipe, jardin vivant (rosée, chantier, clavier), **ancienne sauvegarde** (schéma 1, clé de série « future »), **dates UTC**, rattrapage de série, bon retour, rang, aides, points d'accroche pub, animations réduites ; **hub** : glisser entre les pages (pichenette, geste lent, geste vertical, bouts, panorama exclu, toucher annulé après un glissement), onglets, clavier, bouton retour ; **aucune navigation pendant une partie** ; **pastilles** (cadeau, offre vue, objet neuf, palier, défi fait, mission, saison, succès vus) ; **sauvegarde d'avant le hub** ; **chemin parfait** (démo, clavier bloqué, rejeu à 3 ★) ; **sauvegarde d'avant la refonte** ; **5 premières minutes** (niveau 1 direct, jardin depuis la victoire, ⌂) ; **Terres sauvages** ; **économie** (défi sans pièces à volonté, bouquets, objectif d'achat) ; **défi à cheval sur minuit** ; **stockage plein/interdit** ; glissement déclenché pendant le geste | 177 vérifications, 0 échec |
| `NODE_PATH=$(npm root -g) node scripts/e2e-smoke.js [captures]` | Parcours joueur complet dans Chromium (vrais événements clavier et souris) : fantôme, Atelier, **Jardin** (rosée en victoire, 5 chantiers, fête de zone, rituel, pub simulée plafonnée, **panorama, goutte touchée au doigt, ciels**), **sauvegardes corrompues**, PWA hors ligne, coffre de la semaine | 82 vérifications, 0 échec, 0 erreur ou avertissement console (lancement, 5 onglets, glissement à la souris, Marché) |
| `NODE_PATH=$(npm root -g) node scripts/e2e-tutorial.js` | Tutoriel de Germain : premier lancement complet, clavier, chaque visite d'onglet, « Plus tard », cible absente, retour système, fin et succès Apprenti, rappel du lendemain, fermeture en plein tutoriel, « Passer », « Revoir le tutoriel », réinitialisation, joueur existant, animations réduites, aria-live, 3 stockages corrompus, aucun undefined/NaN ; visites du Marché (cadeau) et du Profil | 62 vérifications, 0 échec, 0 erreur console (stable sur 4 exécutions, dont 3 en parallèle) |
| CI GitHub Actions | Les quatre suites (dont jsdom), sur toutes les branches | Vert |

Vérifications visuelles faites par captures : 360×640, 390×844 et 430×932, sur le lancement, les 5 pages du hub, le jeu (8 mondes), la victoire, le défi, le Sentier, la carte, l'aide, la collection, Germain. Mécaniques vérifiées sous filtres niveaux de gris, deutéranopie et protanopie. Aucun débordement horizontal.

Niveaux revalidés : solveur interne (60/60), et les 60 solutions rejouées dans le **vrai moteur** (touches du clavier) : victoire en exactement « par » coups pour chacun. Aucun niveau ni mécanique n'a changé (refonte visuelle comprise) : le BFS indépendant n'avait donc rien de nouveau à valider.

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
| Méta (Jardin) | `garden_task`, `garden_zone`, `rosee_gain` | Le jardin donne une raison de jouer au-delà des étoiles | Plus de 50 % des joueurs à J7 ont fini la zone 2 | Un rythme trop rapide épuise le jardin avant J30 |
| Rituel | `ritual_mission`, `ritual_chest`, `retention.sessionsPerActiveDay` | 3 missions allongent la session quotidienne | Coffre ouvert chaque jour par plus de 40 % des joueurs actifs | Des missions trop faciles deviennent une corvée sans enjeu |
| Pubs | `ad_offered` / `ad_completed` | Les pubs proposées au bon moment sont acceptées sans nuire au retour | Taux d'acceptation > 20 %, J7 stable avec ou sans pub | Le fournisseur simulé ne mesure pas le vrai coût (durée, qualité des pubs) |
| Jardin vivant | `rosee_gain` (source `dew`), `dew_all`, `garden_open`, `garden_grow` | La rosée du matin fait revenir chaque jour | Plus de 60 % des jours actifs avec au moins une goutte cueillie | Un joueur peut ouvrir le jeu « pour la rosée » sans jouer : à croiser avec `l` (victoires) |
| Série | `streak_repair_start`, `streak_repair`, `streak_repair_declined`, `welcome_back` | Sauver sa série évite l'abandon après un jour manqué | J7 et J30 plus hauts chez ceux qui ont rattrapé | Peu de cas sur un petit groupe de test |
| Rang | `rank_up`, `tip_shown` | Le rang donne un objectif long | Rang 3 (Jardinier) atteint par la moitié des joueurs à J7 | Les paliers peuvent être trop rapides ou trop lents : à calibrer |
| Navigation | `nav_swipe`, `nav_tab`, `splash_play` | Le glissement et la barre du bas sont compris | Plus de 30 % des changements de page au doigt dès J1 ; chaque page visitée par plus de 60 % des joueurs à J3 | Un joueur peut ignorer une page parce qu'elle ne l'intéresse pas, pas parce qu'il ne la trouve pas |
| Cadeau, semaine, saison | `gift_claim`, `weekly_mission_claim`, `weekly_chest_open`, `season_tier`, `season_claim` | Des rendez-vous à 1, 7 et 30 jours | Cadeau récupéré sur plus de 70 % des jours actifs ; coffre de la semaine ouvert par 25 % des joueurs actifs à J7 | Des missions trop faciles deviennent une corvée ; trop dures, on les ignore |

## 7. Limites restantes

- **Pas de backend** : pas de classement réel, pas de notifications de rappel (il faudrait un service de push).
- **Défi du jour lié au code** : il dépend de la version du générateur. Changer celui-ci change les défis futurs ; `DAILY_GEN_VERSION` permet de le rendre explicite.
- **Qualité ressentie des plateaux générés** : elle n'est mesurée que par des proxys (par, états explorés, mécanique qui compte). Elle n'a pas été validée par de vrais joueurs.
- **Non testé** sur appareils physiques (iOS Safari, Android ancien), ni avec un lecteur d'écran réel.
- **Rythme du jardin** (720 💧) calculé sur des sessions types : il reste à calibrer avec de vrais joueurs (données : `rosee_gain`, `garden_task`). La rosée du matin ajoute 3 à 6 💧 par jour de visite.
- **La refonte n'a été vue que sur captures et dans Chromium** : à regarder sur de vrais téléphones (couleurs d'écran OLED, luminosité au soleil).
- **Le jardin est dessiné par du code** (formes simples) : il est riche et vivant, mais un illustrateur ferait mieux, surtout pour les animaux et les plantes en gros plan.
- **Le jour de jeu est en UTC** : pour un joueur en Amérique, le nouveau défi arrive en fin d'après-midi. Choix demandé (une seule date pour tout le monde) ; à revoir si le jeu vise surtout ces fuseaux.
- **Pubs** : seul le fournisseur simulé existe. Aucune vraie régie n'est branchée (voir §4c).
- **Audio jamais écouté par un humain** : il a été réglé par analyse numérique de rendus hors ligne. Le goût (mélodie, timbre) reste à valider à l'oreille.
- **Équilibrage à calibrer en test** : chrono, bonus de temps et coins du Sentier.
- **Navigation** : le panorama du jardin capte le glissement horizontal (il défile lui-même) ; pour changer de page depuis le Jardin, on glisse ailleurs sur la page ou on touche la barre. À observer en test.
- **Passe de saison et missions** : barème d'XP et objectifs fixés à l'estime ; à calibrer avec `season_tier` et `weekly_mission_claim`.
- **Blueprint non couvert** : les mondes 9 et 10 (mécaniques non implémentées), l'éditeur communautaire et la monétisation (publicité récompensée) restent à faire.

## 8. Prochaines priorités (par impact attendu)

1. **Tests joueurs réels (5 à 10 personnes)** avec le rapport de rétention, pour calibrer le chrono du Sentier, la difficulté des défis, le rythme du jardin (rosée du matin comprise), les missions de la semaine et le passe de saison. Questions : les joueurs trouvent-ils les gouttes ? glissent-ils entre les pages ou passent-ils par la barre ? ouvrent-ils le Marché chaque jour ?
2. **Vérifier l'installation PWA sur de vrais téléphones** (Android Chrome, iOS Safari) une fois la branche fusionnée dans `main`.
3. **Rappel du défi du jour** (notifications) : nécessite un service de push, donc un backend minimal. À arbitrer.
4. **Ligue Fantôme** (paliers de maîtrise absolus), si les tests montrent un besoin de sensation de rang.
5. **Mondes 9-10** (barrières colorées, double graine, murs fragiles) : moteur + solveur + générateur, en appliquant la règle « mécanique qui compte ».
6. **Backend minimal** : seulement par décision consciente (audit §15, Update 6).
