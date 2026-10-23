# Fort Boutique — décisions

Format : A5 (date UTC — mission — sujet ; décision, alternatives, raison).

## 2026-10-20 — M0 — Dossier du projet
Décision : le jeu vit dans `fort-boutique/`, à la racine du dépôt existant `gimenezjorys/Blockcraft`.
Alternatives : travailler à la racine (impossible : le dossier contient déjà le jeu Seedrift).
Raison : A0/M0 demande un sous-dossier `fort-boutique/` si le dossier courant n'est pas vide.

## 2026-10-20 — M0 — Dépôt git et branche
Décision : pas de `git init` dans `fort-boutique/` ; on utilise le dépôt parent et la branche de travail imposée par l'environnement (`claude/new-session-kksq5h`) au lieu de `main`.
Alternatives : dépôt imbriqué avec sa propre branche `main`.
Raison : un dépôt imbriqué serait vu comme un sous-module cassé par le dépôt parent, et l'environnement de développement n'autorise les pushs que sur cette branche.

## 2026-10-20 — M0 — GitHub et publication (E1)
Décision : pas de création de dépôt `fort-boutique` par `gh` : l'outil n'est pas authentifié et l'accès GitHub de l'environnement est limité au dépôt Blockcraft. Chaque mission est poussée sur la branche de travail. Le workflow Pages (`.github/workflows/pages.yml`) est prêt dans `fort-boutique/` pour le jour où le projet aura son propre dépôt ; en attendant, un workflow CI à la racine (`.github/workflows/fort-boutique.yml`) lance `npm ci`, `npm test`, `npm run check` et `npm run build` sur tout changement de `fort-boutique/`.
Alternatives : `gh repo create` (bloqué), déploiement Pages depuis le dépôt Blockcraft (écraserait le site de Seedrift).
Raison : ne jamais casser la publication existante ; le fichier `dist/index.html` commité reste jouable en double-cliquant.

## 2026-10-20 — M0 — Version de jsdom
Décision : jsdom 29.1.1 (et esbuild 0.28.2), versions exactes.
Alternatives : jsdom 30.1.3 (dernière).
Raison : jsdom 30 exige Node ≥ 22.22.2 ; la CI tourne sous Node 20 (B2, E2). jsdom 29.1.1 accepte Node 20.19+ et 22.13+.

## 2026-10-20 — M0 — Lanceur de tests
Décision : `scripts/test.mjs` liste les fichiers `tests/**/*.test.js` et les passe à `node --test`.
Alternatives : `node --test tests/` ou des globs.
Raison : le comportement de `node --test <dossier>` et des globs diffère entre Node 20 et 22 ; la liste explicite marche partout.

## 2026-10-20 — M0 — Détection de la langue
Décision : français si `navigator.language` commence par « fr », anglais pour toute autre langue déclarée, français si rien n'est déclaré.
Alternatives : français pour toute langue autre que l'anglais.
Raison : B12 met le français par défaut ; un joueur allemand ou espagnol lit plus souvent l'anglais que le français.

## 2026-10-20 — M0 — Déduplication des entrées (B6)
Décision : les trois familles d'événements sont écoutées. Dès qu'un Pointer Event est reçu, les Touch et Mouse Events sont ignorés ; sinon les Touch Events sont traités et les Mouse Events qui suivent un toucher de moins de 800 ms sont ignorés.
Alternatives : n'écouter que les Pointer Events quand `window.PointerEvent` existe.
Raison : un vrai navigateur émet toujours le Pointer Event avant le Touch Event, donc un geste n'est traité qu'une fois ; et les tests jsdom peuvent piloter le jeu avec de vrais `touchstart/touchmove/touchend` (D1.3).

## 2026-10-20 — M0 — URL dans le code
Décision : le lien de partage et les liens des crédits vivent dans `src/data/links.js`, seul fichier où `npm run check` accepte une URL (les espaces de noms SVG `http://www.w3.org/` sont ignorés).
Alternatives : liste de fichiers autorisés.
Raison : une seule source, facile à mettre à jour quand le lien Pages sera connu.

## 2026-10-20 — M0 — Version injectée
Décision : version de package.json + hash git court du commit de départ du build + date UTC (jour) du build.
Alternatives : heure complète.
Raison : un `npm test` relancé le même jour ne modifie pas `dist/index.html` inutilement.

## 2026-10-20 — M1 — Hooks de test hors de dist/
Décision : `window.__FB_TEST__` est installé par `src/debug/test-hooks.js`, appelé derrière la constante de compilation `__FB_TEST_BUILD__` dans `main.js`. esbuild supprime le bloc et le module du build normal (vérifié par le test de fumée).
Alternatives : drapeau d'exécution.
Raison : B15 exige que ces hooks n'existent pas dans `dist/index.html`.

## 2026-10-20 — M1 — Joystick analogique qui suit le doigt
Décision : norme = (distance − 6) ÷ (52 − 6), plafonnée à 1 ; au-delà de 52 px le centre du joystick suit le doigt ; relâcher fait décroître le vecteur linéairement en 60 ms.
Alternatives : vitesse pleine dès la zone morte franchie.
Raison : « sortie vectorielle normalisée » (B6) ; le suivi évite de « perdre » le joystick quand le pouce glisse loin.

## 2026-10-20 — M1 — Tap DOM dédupliqué par geste
Décision : `onTap` déclenche sur `pointerup` ou `touchend` et ignore seulement le `click` synthétique qui suit (700 ms) ; un `click` seul (clavier, lecteur d'écran) déclenche aussi.
Alternatives : délai minimal entre deux taps.
Raison : un coffre s'ouvre en 3 taps rapides (G12.7) : un délai minimal les aurait avalés.

## 2026-10-20 — M2 — Copie .corrupt et rotation
Décision : la copie `fortboutique.save.corrupt` n'est écrite que si elle n'existe pas encore (la première sauvegarde illisible est gardée telle quelle) ; la rotation des copies de secours part du texte réellement chargé, jamais d'une sauvegarde illisible.
Alternatives : écraser `.corrupt` à chaque incident.
Raison : « jamais effacée automatiquement » (B9) ; une copie illisible dans bak1 ferait perdre une bonne copie.

## 2026-10-20 — M2 — Remise en état au chargement
Décision : chaque champ est fusionné avec sa valeur par défaut et vérifié par type (nombre fini, booléen, chaîne, tableau, objet) ; les champs inconnus sont conservés ; monnaies, niveaux et plans sont bornés (≥ 0, niveaux 1 à 10 / 1 à 40) ; le tablier rayé de base est toujours possédé.
Alternatives : refuser la sauvegarde au premier champ invalide.
Raison : ne jamais perdre une partie pour un champ abîmé (A0.2, M26).

## 2026-10-20 — M2 — Champs ajoutés au schéma v1
Décision : en plus de G23, la v1 contient `shops.*.day` (jours joués dans la boutique), `shops.*.pads.paid`, `shops.*.lastNightStars`, `shops.*.phase.carried` et `firstSaleDone`, `progress.pendingUnlocks`, des compteurs de `stats`, `settings.weaknessIcons`, `daily.maxClaimDay` (anti-recul d'horloge), `ads.lastRewardedAt` et `ads.interstitialsToday`, `offline.pendingDelivery`, `collections.bestiaryTiers`. La boutique de départ contient la Caisse, la Cagette A et l'Étagère A (G6.7).
Alternatives : version 2 dès maintenant.
Raison : tous ces champs ont une valeur par défaut ; la fusion au chargement suffit, aucune migration n'est nécessaire.

## 2026-10-20 — M3 — Cases réservées selon le quartier
Décision : seules les entrées qui existent dans le quartier réservent une case : porte d'entrée, porte de derrière et fenêtres partout ; trappe (2, H−4) à partir du Q3 ; la cheminée ne réserve aucune case.
Alternatives : réserver la case de la trappe dans toutes les boutiques.
Raison : l'emplacement P5 de l'Épicerie (Plante en (2, 2)) tombe sur la case de la trappe en E0 : G6.7 suppose donc qu'elle n'est pas réservée au Q1.

## 2026-10-20 — M3 — Rotation des meubles
Décision : `rot` vaut 0 à 3 ; une valeur impaire tourne l'empreinte de 90° (un meuble 2 × 1 devient 1 × 2) ; pour les meubles orientables, `rot` donne aussi la direction de tir (0 bas, 1 gauche, 2 haut, 3 droite).
Alternatives : deux champs séparés (empreinte et direction).
Raison : un seul champ dans la sauvegarde (G23 `rot`), et le bouton Tourner fait simplement +1.

## 2026-10-20 — M3 — Scène de démonstration conservée
Décision : la scène du rond de M1 reste accessible avec `?demo=1` ; les tests d'entrées de M1 l'utilisent toujours.
Alternatives : réécrire ces tests sur la boutique.
Raison : ne jamais affaiblir un test (A0.5) ; la Cloche, que ces tests touchent avec un second doigt, n'existe dans la boutique que la nuit.

## 2026-10-20 — M4 — Valeurs que G7 ne fixe pas
Décision : clients à 1,8 case/s ; 0,35 s pour prendre un article ; la patience repart à plein à chaque nouvelle attente (étagère vide, puis file de caisse) et ne décompte que pendant l'attente ; un client dont l'étagère se vide va vers une autre étagère garnie du même produit ; un produit qui n'est plus exposé est rayé de son panier.
Alternatives : patience globale depuis l'entrée ; vitesse égale à celle du marchand.
Raison : plus lisible et moins punitif (G7.3) ; le marchand (3 cases/s) doit rester nettement plus rapide que les clients.

## 2026-10-20 — M4 — Pourboire minimal et arrondis
Décision : le montant payé est arrondi à la pièce ; un pourboire mérité vaut au moins 1 pièce.
Alternatives : pourboire de 0 pièce sur un panier d'une pomme (10 % de 4).
Raison : un pourboire invisible ne récompense rien ; la règle « servi vite » doit toujours se sentir.

## 2026-10-20 — M4 — Débit des emplacements d'achat
Décision : un emplacement se remplit en prix ÷ 40 secondes, entre 1,0 et 2,5 s (P1 : 1 s, P3 : 2,5 s) ; 6 pièces/s volent visiblement dans le carré ; un paiement partiel est gardé (sauvegardé) si le marchand sort du carré ou manque de pièces.
Alternatives : 6 pièces/s réelles (P3 durerait 25 s).
Raison : G20.6 décrit l'animation ; G19 place le premier achat 15 s après l'apparition de P1, donc le paiement doit être bref.

## 2026-10-20 — M4 — Premier client et journées courtes
Décision : lors de la toute première journée du jeu, le premier client entre dès qu'un article est posé sur une étagère (au plus tard 10 s après l'ouverture, s'il y a un produit exposé) ; les journées de 90 s et 120 s ne concernent que l'Épicerie (jours 1 et 2) ; les autres boutiques commencent à 150 s.
Alternatives : un client toutes les 4,2 s dès l'ouverture.
Raison : G19 0:16 montre le premier client juste après la première dépose ; les journées courtes servent l'apprentissage, déjà acquis au Q2.

## 2026-10-20 — M4 — Le « jour » des formules
Décision : dans l'intervalle d'arrivée (G7.1), « jour » est le numéro de nuit de la semaine (1 à 7) ; les types de clients (G7.2) et les journées courtes utilisent le nombre de jours joués dans la boutique (`shops.*.day`).
Alternatives : nombre total de jours joués.
Raison : le facteur 0,97^(semaine − 1) n'a de sens que si 0,95^(jour − 1) repart chaque semaine.

## 2026-10-20 — M4 — Déblocage de l'audio
Décision : l'AudioContext est créé au premier `pointerup`, `touchend`, `click`, `keydown` ou `mousedown`.
Alternatives : `pointerdown` / `touchstart`.
Raison : Chrome et Safari ne comptent pas `touchstart` comme une activation : le contexte resterait muet (avertissement constaté en test).

## 2026-10-20 — M5 — Rythme des vagues
Décision : la vague suivante ne commence que lorsque plus aucun Grignotin n'est présent ; la pause de 3,5 s contient le télégraphe (ses 2,5 dernières secondes) ; la première vague a seulement le télégraphe (2,5 s).
Alternatives : vagues qui se chevauchent à minuterie fixe.
Raison : G19 enchaîne « dernier raton » puis « vague 2 » ; une vague à la fois reste lisible.

## 2026-10-20 — M5 — Ciblage « le plus avancé »
Décision : l'avancée d'un Grignotin est mesurée sur tout son trajet aller-retour : un voleur en fuite est toujours « plus avancé » que les Grignotins qui n'ont pas encore volé ; la portée se mesure depuis le bord du meuble + 0,5 case (le centre pour un meuble 1 × 1).
Alternatives : distance à la caisse seulement (les voleurs deviendraient les cibles les moins prioritaires).
Raison : un voleur emporte des pièces ; les meubles doivent l'aider, pas l'ignorer.

## 2026-10-20 — M5 — Voleur scénarisé de la première nuit
Décision : le 4e raton de la vague 2 de la toute première nuit va 1,6 × plus vite jusqu'à la caisse et n'est jamais visé par les meubles : seul le balai du marchand peut le rattraper ; sans réaction pendant 3 s, il ralentit de moitié (cette nuit-là seulement).
Alternatives : voleur ordinaire (les meubles l'abattaient en moins d'une seconde dans les essais).
Raison : G19 2:08 fait de ce voleur la leçon « rattraper un voleur rend les pièces ».

## 2026-10-20 — M5 — Petits choix de combat
Décision : la Confiture brûlante est physique (seul le four est « feu ») ; les Spores empoisonnent tous les Grignotins de la zone à l'impact (nuage visuel, pas de zone persistante) ; un Champiboum explose quand il arrive à côté d'un meuble après avoir fait au moins une case ; les volants passent par la cheminée quand il y en a une, sinon par les ouvertures ; un fantôme n'est visible qu'à la lumière dans tous les quartiers (lanterne du marchand comprise).
Alternatives : poison en nuage persistant ; Champiboum qui cherche un meuble.
Raison : règles simples, lisibles et testables ; G10.1 décrit le fantôme sans limite de quartier.

## 2026-10-20 — M5 — Bocal gardé et plafond de sécurité
Décision : le Bocal gardé affiché et les étoiles sont plafonnés à 100 % (le bonus de +10 % des sacs rattrapés reste en pièces) ; au plafond de 240 s, les Grignotins restants s'éclipsent et les sacs encore portés reviennent au Bocal sans bonus ; le butin est crédité à l'aube (les pièces volent vers le Bocal pendant la nuit, rien n'est à ramasser).
Alternatives : Bocal gardé de 110 % ; vols perdus au plafond.
Raison : jamais frustrant (une nuit trop longue n'est pas la faute du joueur) ; le score du Défi reste borné.

## 2026-10-20 — M5/M6 — Correction d'un test (fin de journée)
Décision : le test M4 « fin de journée » attendait la phase provisoire `dayEnd` ; il attend désormais `dusk`, la phase qui suit réellement la fermeture (G5.1), et vérifie toujours l'événement `day_end`, les clients partis, le tas ramassé et la recette.
Alternatives : garder une phase `dayEnd` artificielle.
Raison : A0.5 : le test était devenu faux quand M5 a branché le crépuscule ; aucune vérification n'a été retirée.

## 2026-10-20 — M6 — Reprise après rechargement
Décision : une partie rechargée pendant la fermeture, le crépuscule ou la nuit reprend au début de la nuit (même graine, mêmes vagues, même Bocal calculé sur la recette sauvegardée) ; à l'aube, le ticket et le coffre reviennent depuis `shops.*.phase.dawn` sans rien redonner (les gains de la nuit sont attribués à l'entrée dans l'aube, `dawnClaimed`) ; le coffre non ouvert attend toujours.
Alternatives : reprendre le crépuscule ; attribuer les gains au bouton Continuer.
Raison : G5.2 ; attribuer à l'entrée de l'aube rend impossible la perte des gains si l'onglet se ferme sur le ticket.

## 2026-10-20 — M6 — Ticket de l'aube
Décision : le ticket récapitule le cycle : Ventes et Pourboires du jour (déjà encaissés), Bocal gardé (%), Bocal (pièces), Butin, et Total = somme des quatre montants ; « Continuer » apparaît une fois le coffre ouvert ; un tap sur le ticket accélère l'impression.
Alternatives : Total limité aux gains de la nuit.
Raison : G20.8 liste ces lignes ; le total de la journée est la récompense lisible du cycle.

## 2026-10-20 — M6 — Clic fantôme
Décision : après un geste traité (pointerup ou touchend), tout `click` synthétique est ignoré pendant 700 ms, sur tous les éléments.
Alternatives : suppression par élément.
Raison : constaté en capture : le clic qui suit le tap sur « Continuer » tombait sur « OUVRIR » de l'écran suivant et sautait le Matin.

## 2026-10-20 — M6 — Pas de proposition de pub pendant les 10 premières minutes
Décision : l'étiquette « ×2 » de l'aube n'apparaît qu'après 10 minutes de jeu cumulé (`stats.playtimeMs`).
Alternatives : l'afficher grisée dès la première aube.
Raison : G18.3 interdit toute pub pendant les 10 premières minutes (relevé pendant la préparation de P1).

## 2026-10-20 — M6 — Lune du Matin et premier jour
Décision : la lune du Matin compte les nuits jusqu'à la Pleine Lune comprise (« 6 » au premier Matin, G19 3:02) ; au tout premier lancement, l'écran titre mène directement au jour 1 (l'intro de l'enveloppe arrive en M11) ; le Matin n'existe qu'à partir du deuxième jour.
Alternatives : un Matin avant le jour 1.
Raison : G19 enchaîne écran titre, intérieur, jour 1.

## 2026-10-20 — M6 — Quota plein au démarrage
Décision : si même la petite écriture de sonde échoue, le stockage passe tout de suite en mémoire (et `storage.kind` vaut `memory`).
Alternatives : rester en `local` et échouer à chaque écriture.
Raison : B9 : repli mémoire + alerte dans Paramètres ; la partie continue sans erreur (testé).

## 2026-10-20 — M6 (P1) — L'attribut hidden l'emporte toujours
Décision : règle globale `[hidden] { display: none !important; }` dans `ui.css` ; en plus, quitter l'aube avec un coffre fermé l'ouvre et le crédite (`leaveDawn`). Un test vérifie la règle CSS (jsdom ne reproduit pas ce conflit de cascade) et `scripts/screens.mjs` vérifie l'affichage réel dans Chromium.
Alternatives : retirer les `display` des classes ; ne compter que sur le filet de `leaveDawn`.
Raison : P1 (bloquant, trois joueurs) : « Continuer » et « ×2 » étaient visibles avant le coffre ; G3.8 « rien ne se perd », G18.3.

## 2026-10-20 — M6 (P1) — Boutons des écrans à venir
Décision : un bouton dont l'écran n'existe pas encore (hub, carte, Paramètres de la pause) est verrouillé avec un cadenas, se secoue et affiche « Bientôt ! ». La liste des écrans branchés est `session.hubScreens` ; chaque mission qui ajoute un écran l'y inscrit. Le niveau requis s'écrit « cadenas + chiffre » (et non « Niv. N », réservé au niveau des meubles).
Alternatives : cacher ces boutons ; brancher tout de suite des écrans incomplets.
Raison : P1 : un bouton qui a l'air actif et ne fait rien fait croire à un plantage. Les écrans réels arrivent en M7, M8, M9, M12 et M25.

## 2026-10-20 — M6 (P1) — Zoom de base de la boutique
Décision : la scène de jeu applique un zoom ancré en haut au centre : `min(1,2 ; 344 / largeur ; 560 / bas de la boutique)`, jamais sous 1 (1,2 en E0, 1,09 en E1, 1 ensuite). Au Matin, le zoom revient en douceur à 1 pour laisser la place au hub. Les pièces visent le compteur converti en coordonnées du monde.
Alternatives : cases plus grandes dans la logique (toucherait G6 et les tests) ; décor de rue en bas de l'écran.
Raison : P1 (Léa, majeur) : la boutique n'occupait que la moitié haute de l'écran. L'ancrage en haut garde la fenêtre visible à l'intérieur du monde 360 × 640, donc le voile de nuit couvre toujours tout.

## 2026-10-20 — M6 (P1) — Rien ne se perd au rechargement
Décision : la journée sauvegarde aussi `daySales`, `dayTips`, `dayPile` (tas sur la caisse) et `vipsSpawned` dans `shops.*.phase` (champs ajoutés avec valeurs par défaut, pas de changement de version : `mergeDefaults` remplit les anciennes sauvegardes). Reprise de la nuit après une fermeture interrompue : le tas est crédité une fois (`resumeNight`). Bestiaire, victimes, voleurs rattrapés et Cloches sont crédités une seule fois à l'aube (`claimNight`), plus pendant la nuit.
Alternatives : créditer les pièces dès l'encaissement (le tas ne serait plus qu'un effet visuel) ; recommencer la nuit en remettant les compteurs.
Raison : revue de P1 avec scripts de reproduction : 27 pièces perdues après un rechargement ; une nuit rejouée doublait le bestiaire (donc le bonus de dégâts G14.4) ; un VIP revenait à chaque rechargement. Les articles déjà pris par les clients au moment d'un rechargement en plein jour restent perdus : ce n'est que du stock, la recette et les pièces sont intactes.

## 2026-10-20 — M6 (P1) — Sauvegardes de transition et limite de 500 ms
Décision : `session.save(true)` passe par `SaveManager.request()` (écriture immédiate si 500 ms se sont écoulées, sinon au tick suivant) ; seuls `visibilitychange` (caché) et `pagehide` écrivent sans attendre. Une petite coche verte clignote 1 s après une sauvegarde de transition (au plus toutes les 8 s) et la pause dit « Partie sauvegardée : tu peux fermer quand tu veux ».
Alternatives : écrire sans délai à chaque transition (deux copies de secours identiques en cas de rafale).
Raison : B9 (une écriture par 500 ms, deux générations de secours utiles) ; Sam (P1) veut savoir qu'il peut fermer.

## 2026-10-20 — M6 (P1) — Pause automatique en arrière-plan
Décision : quand la page passe en arrière-plan pendant le jour, la fermeture, le crépuscule ou la nuit, la pause s'ouvre ; au retour, c'est le joueur qui relance. Au Matin et à l'Aube, rien ne change (rien n'avance).
Alternatives : reprendre seul au retour (comportement de M1).
Raison : Sam (P1, majeur) : les Grignotins avançaient pendant qu'il rallumait son téléphone.

## 2026-10-20 — M6 (P1) — Petites corrections de lisibilité
Décision : ruban de niveau à l'aube (après le coffre) ; flèche du voleur dessinée au-dessus du voile ; silhouette du meuble dans l'emplacement d'achat ; Cloche cachée pendant la nuit du tutoriel (elle ne peut pas s'y charger) ; lune du Matin en croissant ; ligne « Pièces sauvées » au lieu d'un second « Bocal » sur le ticket.
Alternatives : attendre M11, M21 et M22.
Raison : critiques de P1, corrections courtes et sans risque.

## 2026-10-20 — M7 — Acheter puis placer
Décision : un meuble acheté au Catalogue se pose aussitôt à la meilleure place valide (`findPlacement` : trajet des Grignotins le plus long, trajet des clients allongé de 30 % au plus, comme le Conseil de Mamie) ; s'il n'y a aucune place, il attend dans la Réserve et un message le dit. L'éditeur (M8) permet ensuite de tout déplacer.
Alternatives : envoyer tout achat dans la Réserve ; ouvrir l'éditeur après chaque achat.
Raison : G20.8 ne précise pas ; Léa ne doit jamais acheter un meuble qui « disparaît », et un placement automatique utile est le meilleur point de départ avant l'aménagement.

## 2026-10-20 — M7 — Cartes de déblocage et ruban de niveau
Décision : le ruban de l'aube fête le niveau ; les cartes du Matin suivant présentent les déblocages (3 au plus, quartiers puis fonctions, `UNLOCK_CARD_ORDER`). La liste `progress.pendingUnlocks` n'est vidée qu'une fois les cartes fermées (si l'onglet se ferme avant, elles reviennent). Un niveau sans déblocage n'ouvre aucune carte.
Alternatives : tout montrer à l'aube.
Raison : G12.4 (« au Matin suivant ») ; P1 (Léa) demandait un moment visible dès l'aube.

## 2026-10-20 — M7 — Ce que rapporte une amélioration
Décision : les cartes de plans de l'aube et les lignes de l'onglet Meubles montrent le gain en chiffres (« ⚔ 6→7,2 », « ♥ 60→69 », capacité ou cadence de production) et le prix en pièces ; quand le plafond de niveau bloque, la ligne le dit (« Plafond 3 atteint : monte de niveau ! »).
Alternatives : attendre M22.
Raison : P1 (Hugo, majeur) ; les valeurs viennent de `game/stats.js`, aucun chiffre écrit en dur.

## 2026-10-20 — M8 — Éditeur : gestes et affichage
Décision : l'éditeur remplace le hub (plein écran) et prend la place de la scène de jeu le temps de l'édition. Les gestes du canvas passent par `scene.onPointer` (un seul doigt à la fois ; les boutons du HUD gardent la priorité) ; un meuble de la Réserve se fait glisser depuis la barre du bas. Tourner, Ranger et le Conseil de Mamie sont des boutons-icônes (⟳, ⬇, ampoule) avec leur nom pour les lecteurs d'écran. Les déplacements validés s'ajoutent à `stats.moved` (quête « Déplacer 3 meubles », M12).
Alternatives : une fenêtre par-dessus le hub ; des boutons texte.
Raison : G6.5 « plein écran » ; capture : le hub restait visible sous l'éditeur.

## 2026-10-20 — M8 — Quand Mamie conseille
Décision : l'ampoule apparaît si la dernière nuit a donné une étoile ou moins ; la première ouverture de l'éditeur montre la main fantôme d'un déplacement qui allonge le trajet des Grignotins d'au moins 2 cases (G19 6:50), sinon rien. Le conseil n'est qu'une proposition : le joueur peut encore Annuler.
Alternatives : l'ampoule toujours visible.
Raison : G6.5 (« si la dernière nuit était ★ ») et G19.

## 2026-10-20 — M9 — Pleine Lune : affichage et quartier suivant
Décision : la nuit 7 branche les capacités des boss (`bossStep`) ; barre de PV en haut avec couronne, carte de présentation 2,2 s (silhouette, nom, « Courage de Mamie +N % » s'il y en a) ; victoire : bannière « Victoire ! », fanfare et confettis. Le quartier suivant ne se fête (carte au Matin, `progress.pendingDistricts`) que s'il est vraiment ouvert : boss vaincu ET niveau ; si le niveau manque, sa carte arrivera avec le niveau. La carte des quartiers montre pour chaque façade : « Tu es ici », « Y aller », « Bientôt » (contenu prévu en M16 à M19, liste `PLAYABLE_DISTRICTS`), « Niveau N requis » avec la barre d'XP, ou le boss à vaincre et le niveau. Toucher la lune du Matin montre le boss, les nuits restantes et le Courage de Mamie (P1, Hugo). L'option pub « Rejouer tout de suite (+25 %) » arrive avec les pubs (M15).
Alternatives : carte de quartier dès le niveau 7 même sans boss vaincu ; pas d'aperçu de la lune.
Raison : G8.9, G10.3, G12.4, G13.1.

## 2026-10-20 — M9 — Correction d'un test (bouton de la carte)
Décision : le test d'interface « aucun bouton muet » attendait « Bientôt » sur le bouton carte (M6) ; il accepte désormais l'ouverture de la carte des quartiers ou « Bientôt ». L'intention (le bouton répond toujours) est inchangée.
Alternatives : garder la carte fermée.
Raison : A0.5 : l'écran existe depuis M9, l'ancienne attente était devenue fausse.

## 2026-10-20 — M10 — Bugs de jeu trouvés par le simulateur
Décision : (1) un emplacement d'achat dont la case est prise (meuble déplacé dans l'éditeur) ou décalée par un agrandissement se pose sur la case libre valide la plus proche (`padSpot`) ; avant, le tutoriel restait bloqué et le Catalogue ne s'ouvrait jamais. (2) Le marchand ne ramasse plus un produit qu'aucune étagère ne peut exposer (sinon sa pile se remplit de lait sans étagère à lait et il ne peut plus rien ramasser). (3) L'éditeur permet de changer le produit d'une étagère (G7.6, « modifiable dans l'éditeur ») ; elle repart vide.
Alternatives : interdire de poser un meuble sur un futur emplacement ; vider la pile à la main.
Raison : blocages reproduits par les bots (parties où le joueur ne vend plus rien à partir du jour 3) ; un joueur pouvait y tomber aussi.

## 2026-10-20 — M10 — Bots et mesures des simulations
Décision : les bots se déplacent avec un itinéraire BFS (comme un joueur qui contourne les meubles), visent la case d'accès de la caisse, gardent de quoi payer l'emplacement d'achat suivant, et le Moyen et le Fort achètent plusieurs améliorations le même matin quand ils en ont les moyens (dépenser comme une « liste de priorités raisonnable »). Les quêtes du jour (M12) sont simulées par un modèle provisoire (Faible 1, Moyen 2, Fort 3 quêtes par cycle dès le niveau 4, récompenses de G14.1) ; M12 relancera la simulation avec les vraies quêtes. Mesures : « nuits au Q1 » = toutes les nuits jouées dans le quartier, Pleine Lune comprise ; l'inflation compare le solde gardé après les achats du Matin à 4 fois l'achat utile le moins cher (un meuble sans place libre n'est pas un achat utile) ; D2.4.5 est tenu si 90 % des parties du Moyen le sont. D2.4.7 (pubs) et D2.4.8 (Défi du jour) arrivent avec M15 et M14.
Alternatives : bots en ligne droite (ils restaient coincés derrière les meubles dès le jour 3 : 0 client servi) ; solde mesuré avant les achats (toute petite dépense de 20 pièces le faisait échouer).
Raison : D2.2 décrit des joueurs plausibles ; mesurer un bot coincé ne dit rien de l'équilibrage.

## 2026-10-20 — M10 — Essai non retenu : fuite par la sortie la plus proche
Décision : on garde G8.4 (le voleur repart par l'entrée par laquelle il est venu). L'essai « sortie ouverte la plus proche » (`NIGHT.thiefNearestExit`, laissé à false) ne change rien tant que les Grignotins arrivent à la caisse presque morts.
Alternatives : changer la règle.
Raison : une règle ne se change que si le gain est démontré (D2.5) ; il ne l'est pas.

## 2026-10-20 — M10 — Réglages du Quartier 1 (D2.5)
Décision : budget de menace +25 % (base 6,25, +3,125 par nuit) ; PV des Grignotins du Q1 +21 à +25 % (raton 25, souris 11, gloubi 62, mini-gloubi 17, termite 42, raton doré 50) ; voleur ×1,5 au lieu de ×1,2 ; balai 4,5 dégâts / 1 s à 0,68 case (au lieu de 6 / 0,8 s / 0,9) ; Roi Raton 1 125 PV et invocation toutes les 4,8 s ; dégâts des meubles ×1,12 par niveau (au lieu de ×1,20). Le voleur scénarisé de la première nuit garde 20 PV et une fuite ×1,2 (`NIGHT.scriptedThiefHp`, `scriptedThiefFlee`) pour rester attrapable au balai comme le veut G19. Tout est dans la marge de ±25 %. Rapport : docs/sim/SIM_Q1.md (300 parties par profil, tous les seuils applicables tenus) ; test : tests/sim/q1.test.js (40 parties par profil, graines fixes).
Alternatives : PV ×2 ou ×3 (hors marge ; essayés : les nuits deviennent perdables mais le Moyen s'effondre) ; changer une règle de vol (non retenu).
Raison : avant réglage, le Fort faisait ★★★ sur 96 % des nuits et gagnait le boss du premier coup 97 % des fois (D2.4.3). Limite assumée : les nuits 2 à 6 restent presque toujours à ★★★ ; la difficulté du Q1 vient de la Pleine Lune (Moyen : cycle 10, au bord de la fenêtre). À revoir en M12 (vraies quêtes) et M20.

## 2026-10-21 — M11 — Le guide du premier jour et les indices (G19)
Décision : deux sortes d'aide, sans aucun mot. (1) Le **guide** du tout premier jour suit le tableau de G19 : dès 0:06, la main fantôme montre le geste du joystick et la flèche dorée au sol mène à la Cagette A (même avant que les pommes aient poussé), puis à l'Étagère A dès la première prise, puis à la caisse qui brille (halo) quand un client attend, puis à l'emplacement quand il est payable. (2) Les **indices** (main fantôme, halo, flèche, traînée rouge) n'apparaissent qu'après 4 s sans l'action attendue (3 s pour un voleur) et disparaissent dès que le joueur agit. Ils servent pendant les 3 premiers cycles (`HINTS.untilCycle`). Un geste appris est sauvegardé (`progress.learned`) et son indice ne revient pas. « Réagir » à un voleur, c'est s'en approcher au joystick (un voleur qui passe près d'un marchand immobile ne compte pas) ; l'aura n'est apprise que si le marchand va de lui-même près du meuble le plus proche des Grignotins ; un voleur abattu par un meuble n'apprend rien au joueur. La main ne se dessine jamais quand un doigt tient le joystick. Les indices ne touchent pas au moteur (`g.hints`, calculé par la scène de jeu).
Alternatives : tout indice après 4 s, y compris au tout début (la main n'apparaîtrait qu'à 0:10 et la flèche vers l'étagère à 0:17, alors que G19 les place à 0:06 et 0:13) ; indices pour toujours (bruit pour un joueur confirmé).
Raison : G19 (principes et tableau) ; P1 (majeur, Léa et Sam : « aucun guidage au premier lancement » ; Léa : voleur de la nuit 1 sans comprendre).

## 2026-10-21 — M11 — Étiquette « Prochain objectif » (G3.5)
Décision : une étiquette kraft sans mot pendant les 10 premières minutes (G19 n'autorise que des nombres, « RUSH! » et « NOUVEAU ») : icône, nombre (pièces restantes, niveau requis, nuits avant la Pleine Lune) et barre ; « Prochain objectif » est son nom pour les lecteurs d'écran. Pendant le Jour, en haut à gauche sous la barre de soleil ; au Matin, dans la rangée du haut entre la carte et la lune (le coin gauche porte déjà le niveau). Avant la première vente, elle montre déjà P1 (40) : c'est ce que rapportent les premières pièces. Le déblocage suivant montre de préférence le meuble qui apporte un produit (le Frigo plutôt que le Comptoir au niveau 2). Tap : pendant le Jour, la flèche dorée montre l'emplacement 3 s ; ce qui ne se fait qu'au Matin répond par une petite secousse ; au Matin, OUVRIR pulse (emplacement), Améliorer et la lune s'ouvrent, le bouton du déblocage pulse.
Alternatives : texte « Prochain objectif » visible ; étiquette cachée avant la première vente (19 s sans objectif).
Raison : G3.5, G19, mesure P2 « jamais plus de 20 s sans objectif » (12,5 s au pire, pendant l'impression du ticket).

## 2026-10-21 — M11 — Rush et Commande spéciale (G7.7)
Décision : Rush : une fois par jour dès le jour 2 entre 35 % et 70 % de la journée ; 5 clients entrent en 4 s au-delà du plafond habituel (c'est le coup de feu) ; pourboires × 1,5 pendant 20 s (remis à 1 à la fermeture) ; bannière « RUSH! » et son (la couche musicale viendra avec le séquenceur, M23). Commande spéciale : une par jour dès le jour 3, entre 20 % et 45 % de la journée ; le produit est exposé ET fabriqué dans la boutique (sinon elle serait impossible) ; le client attend sur une case voisine de la caisse hors de la file ; le minuteur de 50 s part quand il est à sa place ; le marchand donne les articles en passant à côté (8 par seconde) ; réussite : +30 % de la valeur sur la caisse, comptés comme une vente (XP comprise) et un coffre en bois gardé dans la journée sauvegardée puis ouvert à l'aube après celui de la nuit (ouvert tout seul si on quitte l'aube) ; échec ou fermeture : il repart en souriant. Rush et Commande ne reviennent pas après un rechargement le même jour (`phase.rushDone`, `phase.ordersSpawned`).
Alternatives : Rush dans le plafond de clients (invisible dans une petite boutique) ; coffre ouvert tout de suite pendant le jour (interrompt le geste) ; minuteur dès l'entrée (le client marche une partie du temps).
Raison : G7.7, G3.8 (« rien ne se perd »), A0.2.

## 2026-10-21 — M11 — Rythme des premières nuits (changement de règle, D2.5)
Décision : la nuit 1 scénarisée suit le tableau de G19 : bulle 3 s, 2 s entre deux ratons, 5 s de pause, ratons à 20 PV comme avant le réglage M10 (`WAVES.tutorialHpMult` 0,8) : ≈ 34 s, seul le voleur scénarisé atteint la caisse. Les nuits 2 et 3 de la semaine 1 au Q1 sont des « nuits d'apprentissage » (`WAVES.learning`) : 1,05 s entre deux membres, 2,7 s entre deux groupes, 6 s de pause, budget de menace inchangé : la nuit 2 dure ≈ 58 s au lieu de 28 s. Dès la nuit 4, le rythme de G8.3 s'applique sans changement.
Alternatives : ralentir tous les Grignotins de 25 % (nuit 2 ≈ 34 s seulement, et toutes les nuits changent) ; pause de 4,4 s (+25 %, +2 s) ; garder G8.3 partout (nuit 2 à 28 s contre ≈ 60 s dans G19).
Raison : G19 (nuit 1 ≈ 36 s, nuit 2 ≈ 60 s) contredit G8.3 dans la boutique 5 × 6, où les Grignotins arrivent à la caisse en 5 s ; P1 (majeur, Hugo : nuits trop courtes). Avec les ratons à 25 PV et des entrées espacées, 3 ratons sur 7 volaient à la nuit 1 (l'effet de zone ne touchait plus le groupe), contre la « première victoire » de G19. Simulation après le changement : tous les seuils D2.4 tenus (300 parties, docs/sim/SIM_Q1.md).

## 2026-10-21 — M11 — Le niveau monte à l'aube (changement de règle, D2.5)
Décision : pendant le Jour, la fermeture, le crépuscule et la Nuit, l'XP s'additionne mais le passage de niveau attend l'aube (`applyLevelUps` dans `enterDawn`) ; hors de ces phases (Matin : quêtes), il est immédiat. Le ruban de l'aube le fête (G19 2:57 et 6:30). Le niveau à la fin de chaque cycle ne change pas, donc les seuils D2.4 et G12.5 non plus (300 parties : tous tenus ; ★★★ du Fort 76 %).
Alternatives : XP des niveaux 2→3 et 3→4 portée à 185 et 250 (+23 % et +25 %) : le niveau 3 tombait bien à l'aube 2, mais le Fort faisait ★★★ sur 83 % des nuits (seuil D2.4.3b : 80 %, 300 parties) ; ne rien changer : avec le Rush et la Commande spéciale, un joueur efficace franchissait le niveau 3 en pleine journée 2 (4:27 au lieu de 6:30) et était niveau 4 avant 10 minutes.
Raison : G12.3 (« les niveaux 2, 3 et 4 sont atteints à l'aube des cycles 1, 2 et 3 »), G19 (bilan à 10 minutes : niveau 3). Un niveau gagné en journée n'ouvrait de toute façon rien avant le Matin (G12.4 : les déblocages se fêtent au Matin suivant).

## 2026-10-21 — M11 — L'aube et la scène de l'enveloppe au rythme de G19
Décision : (1) à la fin de la nuit, 2,5 s de pluie de pièces sur la caisse avant l'écran de l'aube (la sauvegarde est faite tout de suite) ; le ticket s'imprime en ≈ 10 s (1,1 s par ligne, 0,8 s par étoile ; un tap accélère × 4 ; après un rechargement, il s'imprime vite) ; les cartes du coffre sortent une par seconde ; le ruban de niveau vient après l'amélioration (ou 6 s après les cartes s'il n'y a rien à améliorer) ; la sortie, elle, apparaît dès que les coffres sont ouverts (rien ne bloque). (2) Après l'écran titre, la scène de l'enveloppe (G19 0:02) : intérieur poussiéreux, portrait de Mamie qui fait un clin d'œil, enveloppe qui tombe sur la caisse vers 1,9 s et brille ; un tap n'importe où l'ouvre (clé vers la porte, rideaux, lumière, 2,4 s) ; main fantôme après 4 s sans tap ; le Jour 1 commence vers 0:05.
Alternatives : écran de l'aube immédiat (la pluie de pièces se perd) ; ruban juste après le coffre (G19 le place après l'amélioration, à 2:57).
Raison : G19 0:02 à 3:02 ; mesures P2 (docs/playtests/P2.md).

## 2026-10-21 — M11 — Nouvelle entrée annoncée à la fermeture
Décision : pendant la fermeture et le crépuscule de la semaine 1, une entrée qui s'ouvrira cette nuit pulse en rouge avec l'étiquette « NOUVEAU » (fenêtre gauche avant la nuit 3, fenêtre droite avant la nuit 5).
Alternatives : rien avant la bulle du télégraphe de la nuit.
Raison : G19 10:10 (« la nuit 3 s'annonce avec une nouvelle entrée »).

## 2026-10-21 — M11 — Méthode du playtest P2
Décision : `npm run playtest -- P2` joue avec un robot « au rythme humain » (`scripts/lib/human-bot.mjs`) : vrais touchers, chemins qui contournent les meubles, temps de lecture fixes (ticket lu jusqu'au coffre, 3 taps espacés de 0,5 s, cartes regardées 1,2 s, flèche verte trouvée en 1,8 s, ruban regardé 3 s, cartes de déblocage 3,5 s, premier Matin 8 s puis 5 s), main fantôme suivie dans l'éditeur, Commande spéciale livrée. Une deuxième partie « joueur hésitant » (8 s sans bouger au début, 6 s d'arrêt après la première prise, voleur de la nuit 1 ignoré, 6 s d'arrêt au jour 2) vérifie que les indices apparaissent. Les **jalons** sont les moments que G19 met en gras (jour 1, deux premiers achats, crépuscule, nuit 1, aube, premier coffre, première amélioration, premier Matin, jour 2, nuit 2, niveau 3, jour 3, Commande spéciale, nouvelle entrée) ; les autres lignes du tableau sont des **repères**, mesurés aussi. Le calendrier de G19 3:02 arrive avec M12 et sera mesuré au playtest P3.
Alternatives : robot qui tape tout de suite (P1 : en avance de 30 % sur tout, la mesure ne disait rien du rythme du jeu).
Raison : D3.1 et D3.2 ; les temps humains sont des hypothèses écrites ici, la mesure reste reproductible.

## 2026-10-21 — M11 — Corrections de tests (A0.5)
Décision : (1) tests d'interface qui partent d'une sauvegarde vide : ils passent par la scène de l'enveloppe (`openEnvelope`, et le robot `TouchBot` tape l'enveloppe) ; (2) « voleur scénarisé ralenti » : 45 s au lieu de 30 s, la vague 2 arrivant maintenant vers 18 s (rythme de G19) ; (3) « ruban de niveau après le coffre » : le ruban est attendu après l'amélioration, comme dans G19 (2:46 → 2:57). Les intentions (premier jour jouable, voleur ralenti, ruban montré) sont inchangées.
Alternatives : garder les anciens temps (ils décrivaient l'ancien rythme, plus court que G19).
Raison : A0.5 : les attentes étaient devenues fausses après la mise au rythme de G19.

## 2026-10-21 — M11 (P2) — Corrections après les critiques de Léa et Hugo
Décision : (1) **Voleur vedette** aux nuits d'apprentissage (2 et 3) : un Grignotin par nuit, de préférence un raton, que les meubles ne visent pas (seul le balai du marchand le rattrape), sans le ralenti de la nuit 1 et jamais avec plus de PV que d'habitude ; nuits plus denses (budget × 1,5, entrées 0,8 s / 2,0 s, pauses de 3,5 s). Mesure P2 : un marchand immobile y perd une étoile, le robot qui poursuit garde ★★★ ; nuit 2 ≈ 58 s avec au plus 4 Grignotins à la fois et 11 s sans aucun (avant : 3 à la fois, 19 s vides). (2) **Nuit 1** : le voleur scénarisé qui atteint la porte lâche son sac sur le seuil ; les pièces reviennent (sans bonus), la perte d'une autre nuit se voit (« −N » rouge et pièces qui s'envolent). (3) **Niveau** : les conditions prises pendant la journée lisent le niveau que donnera l'XP gagnée (`projectedLevel`) ; la première aube complète l'XP jusqu'au niveau 2. (4) **Objectif** selon la phase (au Matin, l'amélioration prête d'abord ; pendant le Jour, jamais) ; un tap sur l'étiquette ne répond jamais « non » : il montre l'emplacement ou l'action utile. (5) **Aube** : tap n'importe où (et pendant la pluie de pièces) ; aubes suivantes plus rapides (1,2 s de pluie, ticket ≈ 3,5 s) ; « Continuer » 0,8 s après la dernière carte. (6) **Commande spéciale** : bulle et halo sur le client, coffre dessiné sur la carte, indice vers lui (ou vers le producteur), et il prend les articles avant toute étagère voisine. (7) Cartes d'amélioration en entiers dès 5 (« ⚔ 6→7 », G19 2:50) ; icône propre à chaque fonction sur les cartes de déblocage ; virgule française dans l'éditeur.
Alternatives : budget des nuits 2 et 3 augmenté sans voleur vedette (les meubles abattent les voleurs : un marchand immobile restait à ★★★) ; ralentir les nuits sans ajouter de Grignotins (Hugo : « on attend ») ; ne garantir le niveau 2 que par l'XP de la nuit (un joueur hésitant arrivait à 105/120).
Raison : critiques P2 vérifiées (docs/playtests/P2.md) ; P1 (majeur Hugo : « le joueur passif fait 3★ à la nuit 2 » ; majeur Léa : voleur de la nuit 1 et sac rendu). Simulation 300 parties : tous les seuils D2.4 tenus.

## 2026-10-21 — M11 (P2) — Corrections de tests (A0.5)
Décision : « voleur scénarisé ralenti » vérifie aussi que le sac tombe sur le seuil (3 étoiles) au lieu d'une perte ; l'éditeur affiche les longueurs avec la virgule française, le test d'interface l'attend désormais. Intentions inchangées.
Alternatives : garder l'ancien comportement.
Raison : les règles et l'affichage ont changé après les critiques P2 (DECISIONS ci-dessus).

## 2026-10-21 — v0.2 — Version jouable : ce qui est gardé, l'écran Paramètres
Décision : (1) le périmètre v0.2 demande Aménager verrouillé et pas de Roi Raton ; les deux étaient déjà faits et testés (M8, M9) : on les garde (« ne pas refaire ni défaire ce qui marche »), rien n'est désactivé. (2) Paramètres, ouvert par le rouage du Matin et par la pause, posé par-dessus l'écran courant : volumes musique et effets (0 à 100), vibrations, secousses, flashs réduits, gaucher (Cloche à gauche), grand texte (`--ui-scale` 1,15), mode économie (canvas à demi-résolution), langue FR/EN (les écrans se redessinent tout de suite), export du code FB1 avec bouton Copier, import vérifié puis comparé (niveau, quartiers, pièces) avant « Remplacer ma partie », réinitialisation en deux taps (le 2e dans les 5 s), version et hash. Import et réinitialisation écrivent tout de suite (l'ancienne partie devient la copie de secours ; avant une réinitialisation, elle est aussi gardée sous `fortboutique.save.beforeReset`), puis retour à l'écran titre : la partie se recharge au tap suivant, par le même chemin qu'un lancement. (3) « Quitter » dans la pause ramène à l'écran titre, pas au Matin : quitter vers le Matin en pleine journée ferait perdre ou rejouer la journée ; la reprise exacte (G5.2) ramène le joueur là où il était.
Alternatives : écran Paramètres séparé de la pause ; import qui remplace sans comparaison (B9 demande la comparaison) ; réinitialisation en un tap.
Raison : prompt v0.2 (Étape B.3 et B.4), B9, A0.2.

## 2026-10-21 — v0.2 — Correction d'un test (A0.5)
Décision : le test « téléphone verrouillé en pleine journée » attendait « Bientôt » sur Paramètres dans la pause ; il vérifie désormais que l'écran s'ouvre, puis que le jeu reste en pause en revenant.
Alternatives : aucune.
Raison : l'écran existe depuis v0.2.

## 2026-10-21 — v0.2 — Publication en ligne
Décision : à la demande du propriétaire (« accessible à tous »), Fort Boutique est publié par le GitHub Pages déjà actif du dépôt Blockcraft (branche `main`, qui publie aussi Seedrift à la racine) : `fort-boutique/` est fusionné dans `main` ; adresse à partager : https://gimenezjorys.github.io/Blockcraft/fort-boutique/ (une petite page redirige vers `dist/`). Rien ne change pour Seedrift (la branche n'ajoute que `fort-boutique/` et sa CI ; aucun Markdown ne contient de balises Liquid qui casseraient la construction Jekyll de Pages). Le dépôt séparé `fort-boutique` et son workflow Pages (E1, E2) restent possibles plus tard.
Alternatives : lien d'aperçu par un service tiers (raw.githack) sur la branche de travail ; attendre un dépôt dédié.
Raison : E2 (lien GitHub Pages) ; demande explicite de publication ; un seul lien stable, sans service tiers.

## 2026-10-21 — M12 — Quêtes, calendrier, série, succès : règles retenues
Décision : (1) le suivi des quêtes passe par une seule fonction (`trackQuest`, src/game/quest-track.js), appelée là où les statistiques sont déjà comptées (encaissement, Commande, fin de journée, `claimNight` pour la nuit, une seule fois) ; « encaisser N pièces en une journée » garde la meilleure journée ; « Rush sans client fâché » regarde les clients fâchés pendant le Rush (sauvegardé, repris après rechargement). (2) Tant que le Défi du jour n'existe pas (M14), la quête « Terminer le Défi » n'est jamais tirée et la quête de semaine correspondante n'est pas affichée (4 quêtes de semaine ; les « 5 » deviennent « toutes »). « Servir 3 VIP » attend le jour 2 de la boutique (premier VIP), « Commande spéciale » le jour 3. (3) L'XP des quêtes (40 × X_Q) s'ajoute tout de suite mais le niveau se fête à l'aube, comme le reste (M11). (4) Les succès et les paliers du bestiaire versent leurs rubis dès qu'ils sont vérifiés (au Matin), avec un petit message ; rétroactifs à l'ouverture (niveau 6). (5) Calendrier : `calendarIndex` compte les réclamations (jour = index mod 7, tour = index div 7 pour la rotation des 8 cosmétiques) ; une horloge reculée sous la dernière réclamation ne permet rien (`maxClaimDay`). Il s'ouvre seul une fois par jour UTC au Matin, après les cartes de déblocage (G19 3:02). (6) Série : un jour manqué consomme un gel au Matin ou à la nuit suivante ; sinon la flamme s'éteint et garde sa valeur 48 h pour « Rallumer » (20 rubis ; la pub une fois par semaine arrive avec les pubs, M15, comme la relance de quête par pub). Les rubis des paliers ne se gagnent qu'en dépassant le meilleur record. Le bonus +2 %/jour s'applique aux ventes de la journée (`salesMult`). (7) Plans d'une récompense : un meuble possédé à qui il en manque d'abord ; aucun meuble améliorable : 10 pièces par plan (rien ne se perd). (8) Les identifiants des cosmétiques du calendrier et de la semaine sont réservés (`cal_*`, `week_*`) ; leur dessin vient avec la Garde-robe (M15). (9) Le CSS des écrans de rétention est dans src/ui/retention.css (règle des 600 lignes).
Alternatives : succès à réclamer à la main ; calendrier ouvert seulement au tap ; bonus de série sur toutes les pièces (Bocal, butin).
Raison : G14, G15, G19 3:02 ; A0 (jamais de perte, logique sans DOM, temps UTC par src/core/time.js) ; mission rapide demandée par le propriétaire.

## 2026-10-21 — M12 — Corrections de tests (A0.5)
Décision : le Calendrier s'ouvre seul au Matin (G19 3:02). Les tests d'interface partis d'une sauvegarde au Matin (Aménager, hub, Paramètres, semaine) marquent le calendrier déjà réclamé ce jour-là (`calendarDoneToday`, tests/helpers/dom.js), et le robot de test réclame le calendrier comme un joueur (tap sur l'étiquette du jour, puis fermer). Aucune vérification n'est retirée ni affaiblie.
Raison : le comportement attendu a changé par conception (G19), pas par régression.

## 2026-10-21 — M13 — Hors ligne, Moka, personnel : règles retenues
Décision : (1) Le retour se calcule au chargement depuis `lastSeenAt` (mis à jour à chaque écriture) : à partir de 15 min, réserves des producteurs pleines dans toutes les boutiques ouvertes (jamais à la baisse) ; gains du personnel selon G16 (au plus 8 h) ; à partir de 3 jours, Coffre de Bienvenue (une fois par absence, repérée par son jour de départ) avec la lettre de Mamie. Les gains sont versés tout de suite ; le ticket « Pendant ton absence » s'affiche au Matin suivant (deux retours avant un Matin s'additionnent). Le bouton « ×2 » (pub) arrive avec les pubs (M15). Une horloge reculée ne donne rien. (2) Moka suit la position du marchand d'il y a 0,4 s en restant à 0,6 case ; le jour, toutes les 8 s, il rapporte le tas de la caisse s'il en est à 3 cases ou moins ; la nuit, il bondit sur le Grignotin le plus proche de lui (volants compris) ; il ne prend aucun coup (rien ne le vise). Sa première apparition (« miaou ») suit le niveau 5. (3) Commis : vont du producteur dont le produit a l'étagère la plus vide (en proportion) à cette étagère ; ils ne bloquent aucune case. Ce qu'ils portent est noté dans la journée sauvegardée et revient au producteur après un rechargement ou à la fin du jour (rien ne se perd). Caissier : derrière la caisse, il encaisse au temps de G11.3 quand le marchand est loin (le marchand garde son temps à lui quand il est là). La nuit, tout le personnel dort dans le coin haut-droit (« Zzz »). (4) Écrans : Moka et le personnel dans Améliorer (onglets Marchand et Boutique).
Alternatives : ticket au chargement par-dessus le jeu ; personnel qui bloque des cases ; commis qui visent l'étagère la plus proche.
Raison : G11.2, G11.3, G16 ; A0 (rien ne se perd, temps UTC, logique sans DOM) ; mission rapide demandée.

## 2026-10-21 — M13 — Équilibrage avec Moka (D2.5)
Décision : avec Moka tel que G11.2 (9 dégâts, 1 bond/s dès le niveau 5), le Fort gagnait ★★★ sur 87 % des nuits du Q1 (seuil 80 %) et allait 1,43 × plus vite que le Moyen (seuil 1,35 ×). Essais (40 puis 100 parties par profil) : Moka sans dégâts 79 % ; Cloche, vitesse seule, déblocage au niveau 6, vagues plus nombreuses, budget des nuits d'apprentissage : insuffisants (le Fort était déjà au bord, 79 %, depuis M10, et des nuits plus dures ne baissent pas sa part de ★★★). Retenu : Grignotins × 1,25 de vitesse (hors boss, hors nuit 1 scénarisée qui garde son rythme G19) et écarts entre membres et groupes des vagues × 0,75 (marges) ; Moka 0,75 bond/s (−25 %) et **3,375 dégâts (× 0,375, au-delà de la marge)**. Justification : toute aide de nuit gratuite fait passer le Fort au-dessus du seuil ; à 3,375 Moka reste utile (achève les Grignotins blessés, suit le marchand, touche les volants) et sa vraie force vient de ses niveaux (× 1,18 par niveau avec les croquettes, environ 15 dégâts au niveau 10), ce que les bots ne font pas. Résultat sur 300 parties : tous les seuils D2.4 tenus (Fort ★★★ 79 %, 1,25 × ; Moyen bat le Roi Raton au cycle 10) ; P2 : 15/15 jalons. Le Moyen reste au bord de la fenêtre 7–10 : à revoir en M20.
Alternatives : Moka à 4,5 dégâts (80 % sur 100 parties, trop près du seuil) ; ne pas faire combattre Moka au Q1 (changement de règle).
Raison : D2.4.3, D2.5 ; garder Moka utile la nuit sans casser l'équilibre du Quartier 1.

## 2026-10-21 — M13 — Correction d'un test (A0.5)
Décision : « Roi Raton : invoque 3 ratons toutes les 6 s » compte maintenant les apparitions de ratons (événements) au lieu des ratons encore là + vaincus : plus rapides (M13), certains volent et repartent avant la fin du test. Même exigence (au moins 6).
Raison : le réglage de vitesse change le devenir des ratons invoqués, pas l'invocation.

## 2026-10-21 — M14 — Défi du jour, événements, saisons : règles retenues
Décision : (1) Défi du jour : la graine ne dépend que du jour UTC ; quartier tiré au sort, meubles imposés pris dans tout le catalogue (8 à 10, posés par l'optimiseur de l'aménagement à partir de la caisse en E1), 5 vagues tirées dans tout le bestiaire (entrées du quartier toutes ouvertes). Pour que ce soit le même défi pour tout le monde, il se joue sur une sauvegarde de travail : marchand de base, sans Moka ni bonus du bestiaire, sans événement de la semaine, PV ramenés au Quartier 1 (× 1,5) ; la vraie sauvegarde ne reçoit que le résultat (score, série du défi, récompense, quêtes). Difficulté fixée par la simulation D2.4.8 (budget 24 par vague × (0,7 + 0,15 (i − 1)), PV × 1,5) : Faible ≈ 860, Moyen ≈ 920, Fort ≈ 910 (bots sans aménagement). (2) La tentative du jour n'est comptée qu'une fois terminée : une nuit de défi interrompue (Quitter, fermeture) ne coûte rien (G3.8 « rien ne se perd », profil de Sam) ; une horloge reculée ne redonne pas de récompense. (3) Le texte à partager prend l'adresse de la page ouverte (le fichier ne contient aucune URL, B1) ; repli presse-papiers puis « Copié ! ». (4) Rivaux : les 20 scores simulés de G13.3, affichés « Rival n » avec la place du joueur. (5) Événements de la semaine : effets appliqués aux nuits (poids, vitesse, butin, Raton doré) et aux journées (prix du produit le moins cher, XP), jamais à la nuit 1 scénarisée ; le défi de la semaine se vérifie au Matin (cosmétique, ou 20 rubis s'il est déjà à toi) ; coffre d'argent en plus à la première aube du dimanche pendant la Fête de Mamie. La lanterne prêtée du Festival des lanternes arrive avec la Pharmacie (M17), quand la lumière compte. (6) Saisons : XP +10 % et décor (citrouilles, neige et guirlande, fleurs) ; les identifiants des cosmétiques de saison et d'événement sont réservés pour la Garde-robe (M15). (7) La simulation d'équilibrage coupe événements et saisons (`EVENTS_SWITCH`) pour mesurer le jeu de base.
Alternatives : tentative consommée dès le début de la nuit ; adresse en dur ; Défi joué avec le marchand et Moka du joueur.
Raison : G13.3, G13.5, G13.6, D2.4.8, B1 ; A0 (temps UTC, aucune donnée perdue).

## 2026-10-21 — M14 — Correction de tests (A0.5)
Décision : les tests de M12 qui vérifiaient l'absence du Défi du jour dans les quêtes (« arrive en M14 ») attendent maintenant les 5 quêtes de la semaine et laissent tirer la quête du défi.
Raison : le Défi du jour existe désormais (comportement voulu).

## 2026-10-21 — M15 — Pubs et Garde-robe : règles retenues
Décision : (1) Pubs : adaptateur `none` par défaut (rien de prêt), `sim` par `?ads=sim` (écran « PUB DE TEST » de 3 s ; fermer avant la fin ne donne rien), squelettes Poki et CrazyGames documentés et inactifs. Les pubs ne se montrent qu'au Matin et à l'Aube (G18.3), où rien ne tourne : le « jeu en pause » est garanti par la phase, le son est coupé (`audio.mute('ad')`) ; délai maximum 45 s / 20 s compté par la boucle du jeu. (2) Règles dans `ads/ad-policy.js` (sans DOM) : 10 premières minutes, phases interdites, plafond de chaque placement par nuit / jour UTC / semaine / retour, plafond global de 12 par jour ; interstitielle it_dawn seulement si toutes les conditions de G18.2 sont vraies. Un bouton n'apparaît que si la règle le permet ; sans régie il reste visible mais grisé avec « Pub indisponible » (sauf « +3 rubis », masqué). (3) Placements : × 2 de la nuit (Aube), +1 coffre en bois après ★★★ hors Pleine Lune, × 2 des gains du personnel sur le ticket d'absence, +3 rubis (Garde-robe), relance de quête après la gratuite, rallumer la flamme (une fois par semaine), revanche d'une Pleine Lune perdue : la même nuit recommence tout de suite, Bocal vide (ses pièces sont déjà gagnées), Courage de Mamie inchangé. (4) Revanche à +18,75 % de dégâts au lieu de +25 % (marge D2.5) : avec toutes les pubs, le Moyen battait le Roi Raton 1,43 × plus vite (seuil 1,3 ×) ; à +18,75 % : 1,25 × sur 300 parties. La simulation compte un cycle par jour (le cas le plus généreux en pubs). (5) Garde-robe (niveau 6, bouton à côté des rubis au Matin) : catalogue G17 dans `data/cosmetics.js` ; achat en rubis uniquement, noté dans `purchases.cosmetics` et `cosmetics.owned` (jamais perdu) ; objets de saison achetables pendant leur saison ; objets gagnés (événements, calendrier, semaine, Coffre de Lune) jamais achetables, visibles une fois obtenus. Rendu : couleurs des tenues, accessoires de Moka, thèmes, yeux des meubles, pièces étoiles / cœurs / feuilles, traînée de pas, confettis ; les enseignes sont gardées et portées, leur dessin vient avec la direction artistique (M21). (6) Le budget de 600 Ko (B5) s'applique au fichier publié (minifié, 364 Ko) ; le build de test, non minifié, peut le dépasser. (7) Le ticket d'absence montre la vraie durée de l'absence ; seuls les gains sont plafonnés (P3, Sam).
Alternatives : minuteur `setTimeout` pour la pub (impossible à tester en temps simulé) ; boutons masqués sans régie (B10 demande grisés).
Raison : B10, G17, G18, D2.4.7 ; A0 (pubs jamais obligatoires, aucun pay-to-win, rien ne se perd).

## 2026-10-21 — M16 — Quartier 2, la Boulangerie
Décision : (1) Le contenu du Q2 (données, comportements, boss) existait depuis M5 et M9 ; M16 le rend jouable : la carte des quartiers mène à la Boulangerie au Matin (chaque boutique garde sa journée, sa semaine, sa disposition ; argent, niveau et niveaux des meubles sont communs) ; un quartier ouvert plus tard (niveau atteint après le boss) reçoit sa boutique et sa carte au Matin suivant. (2) Un test par comportement (four, pétrin, vitrine, machine à café, chauve-souris, hérisson, champiboum, Grande Pâte). Il a trouvé un défaut : le lance-flammes du four divisait par une cadence nulle et ne tirait qu'une fois ; corrigé (seules l'aura et la machine à café l'accélèrent). (3) Simulation du Q2 jouée depuis le début (docs/sim/SIM_Q2.md). Robots (D2.2) : le Moyen avait une liste de priorités du Q1 seulement (cagettes, frigo, chaudron) et n'achetait rien contre les chauves-souris ; il a maintenant une liste par quartier ; le Fort compte double ce qui touche les volants là où il y en a ; le Faible, qui gardait 19 000 pièces dans une boutique pleine, achète aussi au hasard l'agrandissement ou une amélioration du marchand. (4) Réglages dans les marges (D2.5) : PV du Q2 × 1,5 (au lieu de 2), budget × 0,8625 (au lieu de 1,15), Grande Pâte 1 275 PV, vitesse 0,375, vol 26,25 %, 3 gloubis par scission, Courage de Mamie 18,75 % par échec (75 % au plus). (5) Seuil non tenu : D2.4.4 au Q2 (le Moyen ne doit jamais avoir 3 nuits de suite sous 50 % de Bocal) : une Pleine Lune perdue vide le Bocal, et un Moyen qui perd trois fois la Grande Pâte enchaîne trois nuits basses ; les leviers du boss sont au bout de leur marge. Reporté à l'équilibrage global (M20), où les règles de la Pleine Lune pourront être revues avec les cinq quartiers.
Alternatives : changer la règle du Bocal en Pleine Lune dès maintenant ; dépasser les marges.
Raison : D2.4, D2.5 ; PROMPT C « pour chaque quartier : … simulation aux seuils D2.4 » ; mission rapide demandée.

## 2026-10-21 — M16 — Corrections de tests (A0.5)
Décision : trois tests écrivaient en dur les valeurs d'avant le réglage du Q2 (× 2 de PV, × 1,15 de budget, Courage +15 %) ; ils lisent maintenant les constantes de `src/data/`. Même vérification.
Raison : valeurs changées dans les marges D2.5.

## 2026-10-21 — M17 — Quartier 3, la Pharmacie
Décision : (1) La Pharmacie devient jouable par la carte (mêmes règles qu'au Q2). Un test par comportement (lanterne, herbier, pilulier, alambic, fantôme, lutin, gros gourmand, trappe, Dame Blanche). La lanterne prêtée du Festival des lanternes (G13.5) arrive avec la lumière : une au centre de la boutique, et une seconde près de la porte dans l'obscurité du Q3 ; elle éclaire seulement. (2) Défaut trouvé par les tests : les corbeaux en V (formation de 3) pouvaient arriver par 1 ou 2 quand le budget restant de la vague était court ; une formation se tire maintenant entière. (3) Simulation (docs/sim/SIM_Q3.md, 300 parties depuis le début). Avec les valeurs de G10 (repérage sur 20 parties), le Faible demandait 6 tentatives contre la Dame Blanche (seuil 4), le Fort ne la battait jamais du premier coup et le Moyen était au bord de la fenêtre (cycle 30,5 pour 24–32). Réglages dans les marges D2.5 : PV × 2,7 (au lieu de 3,6), budget × 0,975 (au lieu de 1,3), vol du fantôme, du lutin et du gros gourmand −25 %, Dame Blanche 1 125 PV et 26,25 % de vol. Robots (D2.2) : le Moyen pose d'abord une lanterne (les fantômes ne se voient qu'à la lumière) ; le Fort compte triple la lumière tant qu'il en a moins de 3 dans un quartier sombre. (4) Seuil non tenu : D2.4.4 (48 % pour 95 %), même cause qu'au Q2 (une Pleine Lune perdue vide le Bocal) ; reporté en M20 avec celui du Q2.
Alternatives : dépasser les marges D2.5 ; revoir dès maintenant la règle du Bocal en Pleine Lune.
Raison : D2.4, D2.5, G13.5 ; PROMPT C « pour chaque quartier : … simulation aux seuils D2.4 ».

## 2026-10-21 — M18 — Quartier 4, la Quincaillerie
Décision : (1) La Quincaillerie était déjà jouable (M16 a ouvert la carte) ; M18 vérifie ses comportements (un test chacun : établi, enclume, peinture, ventilateur, aimant, corbeau, golem, Ferrailleur) et l'équilibre. (2) Simulation (docs/sim/SIM_Q4.md, 300 parties depuis le début). Avec les valeurs de G10, le Moyen ne battait pas le Ferrailleur avant le cycle 75 (41 tentatives en médiane) et ne gardait que 4 % du Bocal hors Pleine Lune. Diagnostic : le Ferrailleur arrive à la caisse en 44 s avec encore 50 à 80 % de ses PV (armure 10 : la plupart des meubles ne lui font que 1 dégât) en écrasant jusqu'à 14 meubles ; les nuits ordinaires, ce sont surtout les Grignotins des quartiers d'avant (gros gourmands, hérissons, blindés) et les corbeaux qui volent. Robots (D2.2) : le Moyen pose maintenant des lanternes au Q4 et au Q5 (la lumière ignore l'armure) ; le Fort compte double ce qui ignore l'armure (lumière, feu, poison) là où il y a des golems. Réglages, tous à −25 % (D2.5) : PV × 4,65, budget × 1,0875, poids des gros gourmands 11,25 et des hérissons 15, vol du corbeau 3,75 %, golem armure 6 et vol 15 %, Ferrailleur 2 550 PV, armure 7,5, vitesse 0,3, vol 30 %, écrasement 22,5 /s sur 0,75 case. (3) Seuils non tenus : D2.4.2a (le Faible bat le Ferrailleur en 10 tentatives, pour 4), D2.4.4 (2 %, même cause qu'aux Q2 et Q3) et D2.4.5 (69 % pour 90 % : le Moyen ne garde que 43 % du Bocal, ses revenus ne suivent plus le prix des améliorations). Les leviers du quartier sont au bout de leur marge ; un repérage à M_Q = 3,1 (hors marge) ne gardait que 54 % du Bocal : la cause tient à la courbe des PV d'un quartier à l'autre et à la Pleine Lune, qui se revoient ensemble à l'équilibrage global (M20).
Alternatives : dépasser les marges dès maintenant pour le seul Q4 ; Ferrailleur sans écrasement.
Raison : D2.4, D2.5 ; PROMPT C « pour chaque quartier : … simulation aux seuils D2.4 » ; mission rapide demandée.

## 2026-10-21 — M18 — Corrections de tests (A0.5)
Décision : deux tests du Q4 écrivaient en dur les valeurs d'avant le réglage (armure 8 du golem, écrasement 30 /s) ; ils lisent maintenant les constantes de `src/data/`. Même vérification.
Raison : valeurs changées dans les marges D2.5.

## 2026-10-21 — M18 — Défi du jour : PV × 1,65
Décision : le Défi du jour tire ses Grignotins dans tout le bestiaire ; avec les golems et les corbeaux allégés, le Moyen y marquait 1 008 points (40 parties, fenêtre D2.4.8 : 800 à 1 000). PV du défi × 1,65 au lieu de × 1,5 (+10 %) : 40 parties de nouveau dans la fenêtre. Le rapport SIM_Q1 (300 parties) sera refait à l'équilibrage global (M20).
Raison : D2.4.8 ; un réglage d'un quartier ne doit pas déplacer le défi.

## 2026-10-21 — M19 — Nuit sans fin et Franchise : règles retenues
Décision : (1) Nuit sans fin (niveau 16) : bouton au bas de la carte des quartiers ; on choisit la boutique, dont la disposition et les meubles sont pris tels quels (G13.2 ; l'aménagement libre de G5.1 reste celui du Défi du jour). La partie se joue sur une copie de la sauvegarde : seuls le record, les coffres en bois (un toutes les 5 vagues, 3 par jour UTC) et les succès reviennent dans la vraie partie ; quitter en cours ne compte pas. Les vagues s'ajoutent une à une quand la précédente est tenue, sans le plafond de 240 s d'une nuit ; la suite de vagues dépend de la graine de la partie et du jour UTC. Au lieu des pastilles de vagues, le HUD montre le numéro de la vague. « Record personnel → succès » : trois succès « Tenir 10 / 25 / 50 vagues » (10 / 25 / 50 rubis). Rivaux simulés de la semaine : 15 noms générés, scores autour de 4 + 3 × (niveau ÷ 5, arrondi bas) vagues (écart-type 30 %), toujours titrés « Rivaux simulés ». (2) Franchise (niveau 16, boss vaincu une fois) : bouton « Franchiser » sur la façade de la boutique où l'on est, au Matin, avec un second tap de confirmation (3 s) puisque la semaine repart à 1 ; le Courage de Mamie repart à 0 ; la Lune rouge (PV × (1,5 + 0,5 × étoiles)) dure jusqu'au boss battu, qui donne l'étoile ; +10 % de ventes et de butin par étoile, pour toujours ; étoiles et « Lune rouge » affichées sur la façade. Les enseignes de prestige (bois à lune) viennent avec la direction artistique (M21).
Alternatives : Nuit sans fin dans la boutique courante seulement ; Franchise sans confirmation.
Raison : G13.2, G13.4, G14.3 ; A0 (rien ne se perd, aucune fausse donnée présentée comme réelle).

## 2026-10-21 — M19 — Quartier 5, l'Emporium
Décision : (1) L'Emporium devient jouable par la carte ; un test par comportement (distributeur de bonbons, boule de cristal, pupitre à grimoires, horloge de Mamie, phalène, Reine Phalène) ; robots : liste de priorités du Q5 (bonbons, lanternes). (2) Réglages dans les marges (D2.5), comme aux Q2 à Q4 : PV × 7,5 (au lieu de 10), budget × 1,2 (au lieu de 1,6), vol de la phalène 3 %, Reine Phalène 3 600 PV, vitesse 0,45, vol 30 %. (3) Repérage (12 parties par profil) : même ainsi, aucun profil ne bat la Reine avant le cycle 90 ; le Moyen garde 33 % du Bocal hors Pleine Lune. Diagnostic : la Reine vole tout droit vers la caisse et ressort en 22 à 27 s avec encore 50 à 85 % de ses PV ; seuls les meubles anti-volants la touchent. Aucun levier de marge ne suffit (il faudrait environ 3 fois plus de dégâts ou de temps sous le feu). La correction touche une règle (comportement de la Reine, attirée par les lanternes comme ses phalènes) et la courbe des PV d'un quartier à l'autre : elle est faite à l'équilibrage global (M20), qui suit. Le rapport docs/sim/SIM_Q5.md (300 parties) est produit avec les valeurs de M20 (la simulation de 300 parties aux valeurs de M19 a été arrêtée : elle ne servait qu'à constater un échec déjà mesuré).
Alternatives : PV de la Reine à −60 % dès maintenant (hors marge, sans changer le fond du problème) ; repousser l'Emporium.
Raison : D2.4, D2.5 ; PROMPT C ; M20 est la mission d'équilibrage des cinq quartiers ensemble.

## 2026-10-23 — M20 — Corrections de tests (A0.5)
Décision : (1) le test de mise à l'échelle des PV écrivait en dur un M_Q de 1 au Q1 ; il lit maintenant `DISTRICT_FACTORS.hp.q1` (même vérification, plus robuste). (2) Les tests du Courage de Mamie lisent `courageAssist` (le Courage continue de monter après 4 échecs) et vérifient toujours au moins la règle de G8.9 et le plafond. (3) Deux tests du Q4 lisaient déjà les constantes (M18).
Raison : valeurs et règles changées en M20 (DECISIONS.md, ci-dessus).

## 2026-10-23 — M20 — Équilibrage global : des règles d'aide et une courbe
Contexte : après M16 à M19, réglés quartier par quartier dans les marges D2.5, il restait des murs : D2.4.4 (jamais 3 nuits de suite sous 50 % de Bocal) non tenu du Q2 au Q5 (60 %, 48 %, 2 %, 0 %), le Q4 à 43 % de Bocal gardé, et une Reine Phalène que personne ne battait. Les mesures (scripts de diagnostic, 12 à 20 parties par profil, puis 300) ont isolé quatre causes ; chacune touche une règle ou dépasse ±25 %, d'où le détail ci-dessous.
Décision :
(1) **Courage de Mamie, aussi contre la horde** (G8.9). Les Pleines Lunes perdues s'enchaînaient : sur une nuit de boss du Q2, l'escorte et les invocations prennent 135 à 140 % du Bocal (vols, reprises, revols) contre 21 % pour le boss lui-même. Après chaque échec, la horde de la Pleine Lune suivante (vagues, escorte, invocations et scissions du boss) est réduite de 25 %, jusqu'à −75 %. Affiché sur l'aperçu de la lune (« Pièges de Mamie : −n % de Grignotins »). Et le Courage monte plus vite pour qui bute : à partir du 3e échec, +25 % de dégâts de plus par échec (au plus +125 %). Le Moyen gagne d'ordinaire avant ; le Faible, qui demandait 5 à 10 tentatives aux Q4 et Q5, en demande 4. L'escorte du boss passe de 50 à 37,5 % du budget (−25 %, marge D2.5).
(2) **Coup de main de Mamie** (nouvelle règle, G8.10). Après une nuit finie sous 50 % de Bocal, la horde de la nuit suivante de cette boutique est réduite de 40 % (message à la tombée de la nuit ; 25 % ne suffisait pas aux Q4 et Q5). C'est la règle « pas de mur » de D2.4.4 rendue explicite : une mauvaise nuit n'en entraîne pas deux autres.
(3) **Semaine d'ouverture** (nouvelle règle, G8.3). Chaque quartier a sa propre boutique, neuve et presque vide (G13.1) ; la formule de G8.3 suppose une boutique meublée : au Q4, le Moyen gardait 0 à 40 % du Bocal aux nuits 4 à 6 de sa première semaine. Pendant la semaine 1 des quartiers 2 à 5, la horde est × 0,55, puis × 0,8 en semaine 2 (message à la première nuit) ; pas en Lune rouge. Le palier de semaine 2 vient du Playtest P4 : sans lui, passer en semaine 2 multipliait la menace par 2,7 (fin de l'ouverture, budget + 10 %, PV × 1,35) et le joueur enchaînait quatre nuits sous 50 %.
(4) **Reine Phalène attirée par les lanternes** (G10.3). Elle volait tout droit à la caisse et ressortait en 22 à 27 s avec 50 à 85 % de ses PV : seuls les meubles anti-volants la touchent, aucun réglage de marge ne suffisait. Comme ses phalènes, elle visite maintenant chaque lanterne allumée (et l'éteint 4 s) avant la caisse : les lanternes deviennent l'appât et le contre-jeu.
(5) **Dégâts par niveau au-delà du niveau 5** (G9.1). M10 a ramené le gain de +20 % à +12 % par niveau pour le Q1 ; la courbe des PV de G10.2 avait été écrite avec +20 %, et l'écart se cumule avec les niveaux des quartiers suivants ((1,12 / 1,20)^(L − 1) = 0,81 au niveau 4, 0,68 au niveau 7, 0,62 au niveau 8). On garde +12 % jusqu'au niveau 5 (le Q1 et le Q2 ne changent pas) et on revient à +20 % au-delà.
(6) **Courbe M_Q** (G10.2) : Q4 × 4,25 (au lieu de 6,2, −31 %) et Q5 × 6,5 (au lieu de 10, −35 %). Avec la courbe de G10.2 corrigée de l'écart de M10 aux niveaux typiques du Moyen (4 au Q2, 5 au Q3, 7 au Q4, 8 au Q5), on attend 1,63 / 2,73 / 4,24 / 6,17 : les réglages du Q2 (1,5) et du Q3 (2,7), trouvés à la simulation, tombent dessus ; le Q5 est réglé un peu au-dessus (6,5) pour que le Moyen batte la Reine dans sa fenêtre (48 à 62).
(6 bis) **PV des boss** : avec le Courage qui monte, les boss reprennent tout ou partie de leurs PV de G10.3, ce qui remet le Moyen au milieu des fenêtres sans gêner le Faible : Dame Blanche 1 500 (M17 : 1 125), Ferrailleur 3 000 (G10.3 : 3 400, M18 : 2 550 ; à 3 400 le Faible demandait 5 tentatives), Reine Phalène 4 800 (M19 : 3 600).
(6 ter) **Roi Raton** : 1 125 -> 1 350 PV (+20 % ; +50 % depuis les 900 de G10.3, M10 compris). Avec les aides (Courage qui éclaircit, escorte à 37,5 %), le Fort battait le Roi Raton plus tôt et ses nuits ★★★ au Q1 passaient de 79 à 81-83 % (D2.4.3b ≤ 80 %) : sur 40 parties, 97 % de ses nuits ordinaires sont ★★★, seule la Pleine Lune perdue lui coûte des étoiles. +20 % de PV au boss ramène le Fort à 76 % sans déplacer le Moyen (cycle 10) ; essayés sans effet net : PV du Q1 × 1,2 (touchait aussi la nuit 1 scénarisée), Cloche à 17 ou 20 victoires, plus de souris, nuits d'apprentissage plus chargées.
(7) **Robots** (D2.2) : le Moyen et le Fort agrandissent d'abord une boutique pleine (le Moyen gardait 3 000 pièces dans une boutique neuve pleine) ; le Fort met de la lumière d'abord là où le boss chasse les lanternes, le Moyen pose jusqu'à 4 lanternes au Q5.
Alternatives : retirer les nuits de boss du calcul de D2.4.4 (refusé : ce serait changer la mesure, pas le jeu) ; un plancher de Bocal (refusé : il viderait les étoiles de leur sens) ; dégâts +20 % à tous les niveaux (le Q1 et le Q2 devenaient trop rapides, Q4 atteint avant sa fenêtre) ; donner à chaque boutique neuve l'agrandissement des précédentes (contraire à G13.1).
Raison : D2.4 (surtout D2.4.4 « pas de mur »), D2.5 (au-delà de ±25 % et changements de règle justifiés ici), A0 (jamais de mur ni de pay-to-win : toutes ces aides sont gratuites et automatiques).
Résultats (repérages de 12 à 150 parties par profil, valeurs finales ou presque) : Q1 (150) : Roi Raton battu au cycle 10, Fort ★★★ 76 %, pubs 1,25 ×, tous les seuils tenus ; Q2 (20) : tous tenus, D2.4.4 95 % ; Q3 (16) : tous tenus ; Q4 (12) : tous tenus (Ferrailleur au cycle 36, Faible 4 tentatives) ; Q5 (16, Reine à 4 800) : Reine au cycle 49, Faible 4 tentatives, D2.4.4 100 %, D2.4.5 88 % (seul seuil juste sous la cible). Les derniers ajustements (Courage plafonné à +300 %, semaine 2 à × 0,8, Roi Raton) n'ont pas été repassés sur les Q2 à Q5.

## 2026-10-23 — M20 — Tests et simulations arrêtés (consigne de l'utilisateur)
Décision : à la demande de l'utilisateur (« diminue complètement les tests et stop-les, fais tout le reste »), les simulations de 300 parties de M20 ont été arrêtées avant la fin et ne sont plus lancées ; les rapports docs/sim/SIM_Q1 à Q4 restent ceux de M16 à M18 (valeurs d'avant M20) et SIM_Q5 n'est pas produit. La règle A0 « mission validée seulement avec `npm test` vert » est suspendue par cette consigne : les missions suivantes se valident par `npm run build`. Dernier `npm test` complet : vert (39 fichiers, 62,9 s), avant le passage du Roi Raton à 1 350 PV et du Courage plafonné à +300 % (tests unitaires repassés ensuite : verts).
Raison : consigne explicite de l'utilisateur, qui prime sur les règles du document de mission.

## 2026-10-23 — M21 — Direction artistique : ce qui manquait
Décision : l'essentiel de G20 était en place depuis M2 à M19 (palette, logo à yeux, chiffres-tampons, ardoise / kraft / ticket, éclairage à demi-résolution, crépuscule en 4 s, sprites de tous les meubles et Grignotins). M21 ajoute : les icônes des 9 produits des Q3 à Q5 (pastilles, tisane, potion, clous, peinture, marteau, bonbons, boule de cristal, grimoire ; 3 couleurs chacune), les enseignes de prestige de la Franchise sur la carte (bois, bronze, argent, or, lune, G13.4), la nuit pourpre de la Lune rouge, et des transitions d'écran (ardoises qui glissent, fenêtres en fondu ; coupées avec `prefers-reduced-motion`). Pas de test ni de capture, sur consigne de l'utilisateur.
Raison : G20, G13.4, consigne « fais tout le reste ».

## 2026-10-23 — M22 — Juice et options
Décision : le catalogue d'effets de G20.6 était déjà branché (pièces en arc, cœurs, recul, flash blanc, arrêt sur image, ralenti du dernier Grignotin, Cloche, yeux du crépuscule, étoiles et coffre de l'aube, confettis). M22 ajoute les options de G22 qui manquaient : icônes de faiblesse des Grignotins (flamme, soleil, flocon au-dessus de la tête : une forme, pas seulement une couleur), cocorico à l'aube (oui/non, le son arrive en M23) et les crédits. Pas de test, sur consigne de l'utilisateur.
Raison : G20.6, G22.

## 2026-10-23 — M23 — Audio complet
Décision : (1) Séquenceur musical procédural (`src/audio/music.js`, motifs et ambiances dans `src/data/audio.js`) : planification juste à temps (250 ms d'avance) sur l'horloge audio, appelée par la boucle du jeu (aucun minuteur) ; ambiances titre (boîte à musique, 72 BPM), Matin (96 BPM, clairsemé), Jour (fa majeur, 104 BPM, swing 54 %, grille Fa Rém Si♭ Do Fa Lam Si♭ Do), Nuit (ré dorien, 92 BPM, grille Rém Do Si♭ Do Rém Fa Sol La7), boss (100 BPM, timbales, chœur) ; 8 motifs écrits à la main, le motif A partout ; couches : Jour 1 basse + shaker + piano, 2 + marimba (au moins 2 clients), 3 + claps et pizzicato (Rush, commande) ; Nuit 1 nappe + boîte à musique, 2 + pizzicato et toms (au moins 6 Grignotins) ; changement d'ambiance calé sur la mesure ; jingles du crépuscule (cloche) et de l'aube (arpège de ré majeur, gazouillis, cocorico si l'option est active). (2) Mixage G21.3 : réverbération par convolution (réponse générée, 1,4 s, pré-délai 15 ms ; envois musique 0,18, effets 0,08), musique baissée de 5 dB pendant 350 ms sous le coffre, le niveau, le boss, la Cloche et les étoiles. (3) Effets ajoutés : cocorico, lance-flammes (en bouffées plutôt qu'en boucle), tourbillon et rayon (déjà appelés par le jeu). Écarts assumés : nappe en triangles et « chœur » en dents de scie sans filtres de formants (les briques de synthèse n'ont pas de filtre par voix ; le son reste doux au volume de la musique). Vérification : un passage rapide avec le faux contexte audio (ambiances, couches, cocorico), pas de test, sur consigne.
Raison : G21 ; consigne « fais tout le reste ».

## 2026-10-23 — M24 — Performances
Décision : (1) `npm run bench` mesure dans Node la scène la plus chargée (nuit de boss du Q5, semaine 3, boutique E3, 120 Grignotins + la Reine, 300 particules) : 0,14 ms par pas de mise à jour (budget 4 ms), 580 appels de dessin par image sur le canvas simulé (budget 1 200) ; rapport docs/sim/BENCH.md. (2) Mode économie automatique (B5) : si le temps moyen d'image dépasse 20 ms pendant 5 s (jeu en marche), la boucle prévient l'application, qui passe en économie (résolution ÷ 2, particules ÷ 2, éclairage simplifié) et le dit une fois ; il reste actif jusqu'au rechargement, et l'option manuelle des Paramètres fait la même chose. (3) Les tests de fuite de B5 (50 ouvertures d'écran, 200 cycles) ne sont pas écrits, sur consigne de l'utilisateur ; tous les écouteurs passent déjà par `listen()` et chaque écran par `mount()` / `unmount()`.
Raison : B5 ; consigne « diminue complètement les tests ».

## 2026-10-23 — M25 — Anglais, Paramètres, crédits, écran d'accueil
Décision : l'anglais était complet (443 clés, les mêmes en français et en anglais, vérifié par `npm run check`), le manifeste et les icônes (192, 512, apple-touch) existaient depuis M2. M25 ajoute aux Paramètres la carte « Écran d'accueil » : sur iPhone, la marche à suivre (Partager, puis « Sur l'écran d'accueil ») ; là où le navigateur propose l'installation (`beforeinstallprompt`, Android/Chrome), un bouton « Installer le jeu » ; si le jeu tourne déjà en plein écran, « Le jeu est installé ». Les crédits (M22) nomment l'auteur de la licence MIT.
Raison : G22 ; PROMPT M25.

## 2026-10-23 — M26 — Robustesse
Décision : (1) La boucle du navigateur ne peut plus être figée par une erreur : une exception pendant une image est attrapée, la partie est sauvegardée tout de suite et un message rassurant s'affiche une fois (« Oups, un petit souci ! Ta partie est sauvegardée. ») ; le jeu continue à l'image suivante. Le mode test (`advance`) laisse remonter les erreurs. (2) Les sauvegardes abîmées étaient déjà couvertes depuis M4 et M6 : somme de contrôle CRC32, copie de secours, remise en état champ par champ (`sanitizeSave`), message « sauvegarde réparée ». (3) Non faits, sur consigne de l'utilisateur : les 10 minutes d'entrées au hasard, les 500 sauvegardes altérées et le Playtest final P5.
Raison : PROMPT M26 ; consigne « stop les tests ».

## 2026-10-23 — M27 — Publication
Décision : version 1.0.0 (package.json), README final, notes de version (docs/RELEASE_NOTES.md), dernière mise à jour de GAME_DESIGN.md. La page GitHub Pages est servie depuis `main` : la mettre à jour demande une fusion (pull request) et le tag `v1.0.0` se pose sur `main` ; ces deux étapes attendent l'accord de l'utilisateur (aucune pull request sans demande explicite).
Raison : PROMPT M27 et F ; règles du dépôt (pas de PR sans demande).

## 2026-10-23 — Correctif v1.0 : écran Paramètres
Décision : l'écran Paramètres de la v1.0.0 plantait à l'ouverture (`installCard` appelé mais jamais écrit : l'ajout de M25 n'avait pas trouvé la fin du fichier, sans test pour le voir). La fonction est ajoutée ; les 5 tests d'interface des Paramètres et de la pause repassent.
Raison : bug trouvé par le `npm test` de début de session (A1 du prompt v1.1).
