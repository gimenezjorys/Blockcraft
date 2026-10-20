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
