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
