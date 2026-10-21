# Fort Boutique — avancement

Statuts : ⬜ à faire · 🔄 en cours · ✅ validée (date UTC). Règles de reprise : docs/PROMPT.md, A1 à A4.

| Mission | Statut | Date | Résumé |
|---|---|---|---|
| M0 — Démarrage du dépôt | ✅ | 2026-10-20 | Arborescence, build autonome (12 Ko), icônes, titre, helpers jsdom, test de fumée. |
| M1 — Moteur | ✅ | 2026-10-20 | Boucle à pas fixe, sfc32 + fork, temps UTC, pools, entrées unifiées, joystick, debug, hooks de test. |
| M2 — Sauvegarde | ✅ | 2026-10-20 | CRC32, stockage avec repli mémoire, schéma G23, 2 copies + .corrupt, migrations testées, export FB1 ; 17 tests. |
| M3 — La boutique et le marchand | ✅ | 2026-10-20 | Grille E0–E3, cases réservées, validation G6.4, BFS, marchand qui glisse, rendu palette finale. |
| M4 — Le jour | ✅ | 2026-10-20 | Producteurs, pile, étagères, clients (types, file, patience), caisse, tas de pièces, 6 emplacements, soleil, fermeture, sons de base. |
| M5 — La nuit | ✅ | 2026-10-20 | Vagues à graine, 15 comportements de meubles, effets, vol/fuite/récupération, Cloche, balai, réparation, éclairage, HUD de nuit. |
| M6 — Cycle complet + Playtest P1 | ✅ | 2026-10-20 | Cycle Matin → Jour → Nuit → Aube → Matin sauvegardé et repris à l'identique ; ticket, coffre, plans, amélioration ; P1 : 1 bloquant et 8 majeurs corrigés (coffre perdu, pub trop tôt, boutons muets, niveau invisible, boutique trop petite, pause auto, pièces et compteurs au rechargement). |
| M7 — Données et progression | ✅ | 2026-10-20 | Catalogue (prix × 1,6 par exemplaire, plafonds, pose automatique), Améliorer (meubles avec gains chiffrés, marchand, recettes, agrandissement E1), cartes de déblocage au Matin ; 11 tests nouveaux. |
| M8 — Aménagement | ✅ | 2026-10-20 | Éditeur plein écran : glisser au doigt (fantôme vert/rouge), tourner, ranger, Réserve, trajets et longueurs, Conseil de Mamie, Valider/Annuler ; 8 tests (dont 3 aux vrais gestes). |
| M9 — La semaine et la Pleine Lune | ✅ | 2026-10-20 | Pleine Lune : Roi Raton (invocations, vol 35 %, fuite), barre de PV, carte d'intro, victoire/échec, Courage de Mamie, Coffre de Lune, semaine 2 ; carte des quartiers (boss ET niveau) ; aperçu de la lune ; 8 tests. |
| M10 — Simulateur d'équilibrage (Q1) | ✅ | 2026-10-20 | Simulateur (bots Faible/Moyen/Fort en parallèle, modèle provisoire des quêtes) : 300 parties par profil, tous les seuils D2.4 applicables tenus après réglages dans la marge ±25 % ; 3 bugs de jeu trouvés et corrigés ; test sim de 40 parties. |
| M11 — Les 10 premières minutes + P2 | ✅ | 2026-10-21 | Enveloppe, guide et indices sans texte (4 s), objectif toujours visible, Rush, Commande spéciale, rythme de G19 (15/15 jalons en gras dans ±20 %), niveau à l'aube ; P2 : 9 majeurs corrigés (Léa, Hugo, Sam). |
| M12 — Quêtes, calendrier, série, succès, bestiaire | ✅ | 2026-10-21 | 3 quêtes du jour à graine UTC (+ relance), 4-5 de la semaine, calendrier de 7 jours (s'ouvre seul au premier Matin), flamme de la boutique (+2 %/jour, gels, rallumage 48 h), 52 succès et paliers du bestiaire, écrans Quêtes et Calendrier. |
| M13 — Hors ligne, Moka, personnel | ✅ | 2026-10-21 | Retour après absence (réserves pleines, gains du personnel plafonnés à 8 h, Coffre de Bienvenue après 3 jours, ticket du Matin), Moka (suit, rapporte, bondit ; croquettes), commis et caissier (dorment la nuit) ; équilibrage Q1 refait avec Moka (D2.5). |
| M14 — Défi du jour, Rivaux, partage, événements | ✅ | 2026-10-21 | Défi du jour (même boutique et mêmes vagues pour tous, aménagement libre, score, première tentative récompensée, Entraînement, Rivaux, Partager), événements de la semaine (bannière, effets, défi), saisons (XP +10 %, décor) ; D2.4.8 simulé. |
| M15 — Pubs, rubis, Garde-robe + P3 | ⬜ | | |
| M16 — Quartier 2 : la Boulangerie | ⬜ | | |
| M17 — Quartier 3 : la Pharmacie | ⬜ | | |
| M18 — Quartier 4 : la Quincaillerie | ⬜ | | |
| M19 — Quartier 5 : l'Emporium | ⬜ | | |
| M20 — Équilibrage global + P4 | ⬜ | | |
| M21 — Direction artistique complète | ⬜ | | |
| M22 — Juice et options | ⬜ | | |
| M23 — Audio complet | ⬜ | | |
| M24 — Performances et mémoire | ⬜ | | |
| M25 — Anglais, Paramètres, crédits, iOS, icônes | 🔄 | | v0.2 : écran Paramètres fait (volumes, confort, langue FR/EN, export/import FB1, réinitialisation en deux temps, version). Reste : anglais complet, crédits, iOS, icônes. |
| M26 — Robustesse + P5 | ⬜ | | |
| M27 — Publication | ⬜ | | |


## v0.2 jouable — 2026-10-21 (UTC)

**Audit (début de session v0.2).** `npm test` vert (23 fichiers, ≈ 26 s), `npm run build` OK (272 Ko), `npm run check` OK. Partie jouée au doigt dans jsdom (robot au rythme humain) : titre → enveloppe → Jour → Crépuscule → Nuit → Aube → Matin → Jour 2, sans erreur ni blocage. Le constat « écrans non branchés » ne tenait plus : Catalogue, Améliorer (Meubles, Marchand, Recettes, Boutique), Aménager, carte et lune existent depuis M7 à M9 ; Quêtes, Calendrier et Défi du jour sont verrouillés (cadenas, « Bientôt »). Manquait seulement l'écran **Paramètres** (le rouage ouvrait la pause, la pause disait « Bientôt »).

**Ce qui marche.**
- Cycle complet sur 6 cycles joués au doigt (jsdom, robot humain) : niveau 7, 6 emplacements d'achat et 2 achats au Catalogue, 10 coffres, 6 améliorations, 0 erreur JavaScript, aucun écran bloqué.
- Reprise exacte après rechargement (jour, nuit, aube, Rush, Commande), pause automatique, joystick tactile, souris, clavier.
- Quartier 1 complet : 7 meubles (jour et nuit), 5 Grignotins, semaine de 7 nuits avec entrées progressives, « NOUVEAU » et télégraphe, Roi Raton à la nuit 7 (déjà fait en M9, gardé), XP et niveaux, coffres et plans, améliorations, recettes, agrandissement E1, éditeur d'aménagement (M8, gardé).
- Les 10 premières minutes de G19 (M11) : enveloppe, indices sans texte, objectif toujours visible.
- Paramètres (rouage du Matin et pause) : musique, effets, vibrations, secousses, flashs réduits, gaucher, grand texte, économie, langue FR/EN, export/import FB1 (vérifié : même partie), réinitialisation en deux temps (ancienne partie gardée en secours), version et hash.

**Limites connues.** Quêtes, calendrier, série, succès, bestiaire, Défi du jour, Moka, personnel, pubs, cosmétiques et quartiers 2 à 5 : pas encore (boutons verrouillés « Bientôt » ou absents). Anglais partiel. Audio de base, pas de musique. Le 4e emplacement d'achat arrive plus tôt que dans G19 (revenus du jour 2). Après les 6 emplacements du jour 3, rien à acheter avant le Matin suivant (le Catalogue s'ouvre au Matin, G6.7).

**Prochaine mission.** M8 (éditeur) est déjà faite : prochaine étape proposée, finir M11 (docs/playtests/P2.md et revue de code), puis M12 (quêtes, calendrier, série).

---

## C. PLAN DES MISSIONS (à recopier tel quel dans PROGRESS.md)

Chaque mission a un statut : ⬜ à faire, 🔄 en cours, ✅ validée (date UTC). Les critères de « fini » communs sont en A4 ; ci-dessous, les critères propres à chaque mission.

### Jalon A — Fondations

**M0 — Démarrage du dépôt**
- [x] Audit d'environnement (A1). Dossier du projet : le dossier courant s'il est vide ou ne contient que ce prompt (cas normal), sinon créer `fort-boutique/`. Déplacer ce prompt dans `docs/PROMPT.md`. `git init`, branche `main`, `.gitignore` (`node_modules/`, `dist-test/`, `.DS_Store`, `coverage/`, `*.log`).
- [x] `package.json` : nom `fort-boutique`, version 0.1.0, `"type": "module"`, scripts `build`, `test`, `sim`, `playtest`, `bench`, `check`, `dev`. Installer `jsdom` et `esbuild` en versions exactes.
- [x] Créer `README.md`, `GAME_DESIGN.md` (copie **intégrale et fidèle** de l'Annexe G), `PROGRESS.md` (cette section C + journal de session), `DECISIONS.md`, `docs/PROMPT.md` (copie intégrale de ce prompt), `LICENSE` (MIT).
- [x] Arborescence B3 (fichiers vides commentés autorisés).
- [x] Build minimal : écran titre (fond ardoise, « Fort Boutique », doigt qui tape) ; un tap passe à un écran vide.
- [x] Helpers de test : environnement jsdom, polyfill tactile (D1.3), canvas simulé, audio simulé, horloge simulée.
- [x] Test de fumée : charger `dist/index.html` dans jsdom → aucune erreur, un canvas existe, `touchstart` + `touchend` changent l'écran.
- [x] GitHub : E1.
- Fini quand : `dist/index.html` s'ouvre par double-clic et affiche l'écran titre ; commit `M0: fondations`.

**M1 — Moteur**
- [x] Boucle à pas fixe + rAF + pause onglet caché (B5), `timeScale`.
- [x] Générateur aléatoire à graine (sfc32 ou mulberry32) avec `fork(label)` pour des sous-générateurs indépendants.
- [x] `core/time.js` (B7), bus d'événements, réserves d'objets.
- [x] Entrées unifiées + joystick + clavier (B6), redimensionnement et bandes latérales.
- [x] Overlay debug (B14).
- Tests : même graine → même suite (1 000 tirages) ; frontières UTC (23:59:59.999 / 00:00:00.000) ; semaine UTC commençant le lundi ; joystick piloté par de vrais `touchstart/touchmove/touchend` ; même vecteur à la souris ; ZQSD et flèches ; second doigt ; pause sur `visibilitychange`.
- Fini quand : dans le build, un rond se déplace au joystick.

**M2 — Sauvegarde**
- [x] `storage.js` (repli mémoire), `schema.js` (G23 + valeurs par défaut), `save.js` (checksum, copies de secours, écritures regroupées), `migrations.js` (registre), `export.js` (code FB1), `crc32.js`.
- Tests (au moins 12) : aller-retour ; checksum faux → bak1 ; bak1 faux → bak2 ; tout faux → nouvelle partie + copie `.corrupt` ; migration d'une fixture v0 synthétique vers v1 ; champs inconnus conservés ; achats et cosmétiques conservés ; export/import identique ; code invalide refusé ; `localStorage` qui lève une exception → repli mémoire ; quota plein → aucun plantage.

### Jalon B — Version jouable minimale (Épicerie : jour + nuit)

**M3 — La boutique et le marchand**
- [x] Grille (G6.1), tailles E0 à E3, cases réservées (G6.2), disposition initiale de l'Épicerie (G6.7), validation des chemins (G6.4), rendu simple avec la **palette finale** (G20.2) et des formes basiques.
- [x] Marchand : déplacement au joystick (3,0 cases/s), collisions avec glissement le long des obstacles.
- Tests : collisions et glissement ; BFS ; validation (chemin bloqué refusé, case réservée refusée).

**M4 — Le jour**
- [x] Cagette (production, réserve), étagères (capacité, produit), pile du marchand (prise et dépose par proximité), clients (G7 : arrivée, chemin, choix, attente, patience, file, caisse), encaissement en présence du marchand, tas de pièces et ramassage, emplacements d'achat (pads) de l'Épicerie (G6.7), barre de soleil, fermeture avec 6 s de grâce.
- [x] Sons de base (version simple de G21) : tap, prise, pièce, « ding » de porte.
- Tests : cycle de vie d'un client ; patience écoulée → départ sans vente ; pas d'encaissement si le marchand est loin ; pad payé au bon débit ; fin de journée ; recette = ventes + pourboires.

**M5 — La nuit**
- [x] Transformation des meubles (étagère, caisse, cagette), Raton et Souris, entrées, champ de flux, générateur de vagues à graine (G8.3), projectiles et zones, dégâts et armure (G9.2), mort, butin, vol, fuite, récupération, Bocal, fin de nuit, étoiles (G8).
- [x] Marchand la nuit : aura d'encouragement, coup de balai automatique, réparation, Cloche (G8.7, G11.1).
- Tests : vagues identiques à graine égale ; calcul du vol et de son plafond ; récupération +10 % ; seuils d'étoiles ; champ de flux avec obstacles ; formule d'armure ; ralentissements non cumulables (le plus fort s'applique).

**M6 — Cycle complet + Playtest P1**
- [x] Machine à états Matin → Jour → Crépuscule → Nuit → Aube → Matin ; sauvegarde à chaque transition ; reprise exacte après rechargement (G5.2).
- [x] Matin minimal, Aube minimale (ticket), coffre en bois, plans, amélioration d'un meuble.
- [x] Workflow GitHub Pages (E2) : `.github/workflows/pages.yml` prêt ; il ne s'exécute que lorsque le projet est à la racine de son propre dépôt (voir DECISIONS.md).
- [x] Playtest P1 « premier lancement » (D3) : `docs/playtests/P1.md` ; bloquants et majeurs sans mission ultérieure corrigés.
- Fini quand : deux cycles complets jouables depuis `dist/index.html` ; problèmes bloquants et majeurs de P1 corrigés.

### Jalon C — Progression, économie, Quartier 1 complet

**M7 — Données et progression**
- [x] Toutes les données du Quartier 1 : meubles (étagère, caisse, comptoir, plante carnivore, cagette, frigo, chaudron), monstres (raton, souris, gloubi, termite, raton doré), Roi Raton ; niveau de marchand et déblocages (G12.3, G12.4) ; catalogue (acheter puis placer) ; recettes (prix des produits) ; agrandissement E1 ; plafond de niveau des meubles ; prix croissant par exemplaire.
- Tests : courbe d'XP ; déblocages ; prix par exemplaire ; plafonds ; coûts en plans et en pièces.

**M8 — Aménagement**
- [x] Éditeur G6.5 : sélectionner, glisser, tourner, ranger, fantôme vert/rouge, aperçu des trajets (clients en bleu, Grignotins en vert acide) avec leurs longueurs, validation, annulation, Conseil de Mamie.
- Tests d'interface (jsdom, vrais gestes) : glisser un meuble au doigt le déplace ; placement invalide refusé avec retour visuel ; longueurs mises à jour ; Annuler restaure l'état initial.

**M9 — La semaine et la Pleine Lune**
- [x] Semaine de 7 nuits, ouverture progressive des entrées, introduction des nouveaux monstres (étiquette « NOUVEAU »), Roi Raton (invocations, fuite avec le sac), victoire ou échec, Courage de Mamie, Coffre de Lune, semaine 2 et suivantes (G8.9, G13.1).
- Tests : comportements du boss ; cumul de l'aide ; progression des semaines ; quartier suivant débloqué seulement si boss vaincu ET niveau requis.

**M10 — Simulateur d'équilibrage (Quartier 1)**
- [x] `scripts/sim.mjs` (D2), bots faible/moyen/fort, 300 parties, rapport `docs/sim/SIM_Q1.md`, réglages dans les marges (D2.5), test `tests/sim/q1.test.js` (40 parties, mêmes seuils).
- Fini quand : tous les seuils D2.4 du Quartier 1 sont tenus.

**M11 — Les 10 premières minutes + Playtest P2**
- [x] Implémenter G19 à la seconde près : indices visuels sans texte, jours courts, ordre des pads, premier coffre, première amélioration, raisons de revenir.
- [x] Objectif toujours visible (G3.5).
- [x] Playtest P2 (D3) : chaque jalon de G19 atteint dans sa fenêtre (±20 %) ; jamais plus de 20 s sans objectif visible.

### Jalon D — Rétention

**M12 — Quêtes, calendrier, série, succès, bestiaire** (G14, G15)
- Tests : tirage quotidien à graine UTC ; une seule réclamation par jour UTC ; gel de série consommé automatiquement ; récompenses exactes ; succès déclenchés une seule fois.

**M13 — Hors ligne, Moka, personnel** (G11.2, G11.3, G16)
- Tests : livraison du matin plafonnée à 8 h ; aucune perte pendant l'absence ; coffre de retour après 3 jours ; Moka suit et attaque ; commis et caissier fonctionnent et dorment la nuit.

**M14 — Défi du jour, Rivaux, partage, événements** (G13.3, G13.5, G13.6)
- Tests : défi identique pour une même date UTC ; calcul du score ; texte de partage ; une seule tentative récompensée par jour ; événement choisi selon la semaine UTC ; saisons selon la date UTC.

**M15 — Pubs, rubis, Garde-robe + Playtest P3** (B10, G17, G18)
- [ ] Adaptateurs, placements, plafonds, repli ; Garde-robe et application des cosmétiques.
- [ ] Playtest P3 « retour le lendemain » (horloge +1 jour, +3 jours, +8 jours).
- Tests : chaque règle de `ad-policy` ; aucune récompense si la pub est fermée avant la fin ; jeu en pause pendant la pub.

### Jalon E — Contenu

**M16 — Quartier 2 : la Boulangerie** — four, pétrin, vitrine, machine à café ; chauve-souris, hérisson, champiboum ; cheminée ; la Grande Pâte.
**M17 — Quartier 3 : la Pharmacie** — obscurité et lumière (lanterne, herbier, pilulier, alambic) ; fantôme, lutin, gros gourmand ; trappe ; la Dame Blanche.
**M18 — Quartier 4 : la Quincaillerie** — établi, enclume, mélangeur de peinture, ventilateur, aimant ; corbeau, golem ; le Ferrailleur.
**M19 — Quartier 5 : l'Emporium** — distributeur de bonbons, boule de cristal, pupitre à grimoires, horloge de Mamie ; phalène ; la Reine Phalène ; + Nuit sans fin + Franchise de quartier.

Pour chaque quartier : données, comportements, boss, tests unitaires de chaque comportement, simulation `docs/sim/SIM_Qn.md` aux seuils D2.4.

**M20 — Équilibrage global + Playtest P4** — simulation complète des 5 quartiers (D2) ; Playtest P4 « joueur avancé ».

### Jalon F — Beauté et son

**M21 — Direction artistique complète** (G20) : tous les sprites, logo, chiffres-tampons, interface ardoise / kraft / ticket, éclairage, transitions.
**M22 — Juice et options** : catalogue G20.6, options G22.
**M23 — Audio complet** (G21) : musiques jour, nuit, boss, matin ; les 44 effets ; mixage.

### Jalon G — Finition et publication

**M24 — Performances et mémoire** : B5, `npm run bench`, tests de fuite, mode économie.
**M25 — Anglais, Paramètres, crédits, carte « écran d'accueil » iOS, icônes et manifest.**
**M26 — Robustesse + Playtest final P5** : 10 min d'entrées aléatoires sans erreur ; 500 sauvegardes altérées au hasard → jamais de plantage ni de perte silencieuse.
**M27 — Publication** : Pages en ligne et vérifié, README final, tag `v1.0.0`, notes de version, récap final (F).


---

## Problèmes mineurs relevés en playtest (à traiter en finition)

Source : `docs/playtests/P1.md` (2026-10-20). Chaque ligne indique la mission qui la traitera.

- [ ] P2 — 4e emplacement en avance sur G19 (revenus du jour 2) ; revu en M12 : toujours 6/7 repères avec les 150 pièces du calendrier → M20 (équilibrage global).
- [ ] P2 — Jour 3 sans achat après P5 et P6 ; les quêtes n'ouvrent qu'au niveau 4 (fin du cycle 3, G12.4) → M20.
- [ ] P2 — Commande spéciale facile (client près de la caisse, G7.7) ; appeler la vague suivante plus tôt (Hugo) → M22.
- [ ] P2 — Mots dans l'éditeur (« Clients », « Grignotins ») → M21.
- [ ] P1 — Jalons du début 22 à 38 % en avance sur G19 (robot rapide, mais nuits trop courtes) → M11 (M10 : nuits un peu plus longues, nuit 2 ≈ 28 s, nuit 6 ≈ 70 s).
- [ ] P1 — Nuits ≈ 15 % du temps de jeu ; transformation des meubles timide (petits yeux, armes peu visibles) → M10, M21.
- [ ] P1 — Ticket de l'aube très textuel ; les pièces gagnées ne volent pas vers le compteur → M21.
- [ ] P1 — L'amélioration ne fait bouger que la carte, pas le meuble ; aucun chiffre ne monte → M22 (et stats sur les cartes en M7).
- [ ] P1 — Écran titre plat (pas de façade de nuit, pas de musique) → M21, M23.
- [ ] P1 — Aucun vrai choix pendant les 4:41 du début (ordre des emplacements fixe) → M8 (Aménager), M11.
- [x] P1 — Pastille de la Pleine Lune non tappable, sans silhouette du boss → M9 (fait : aperçu du boss au toucher).
- [ ] P1 — La nuit, ni portée des meubles ni vie des Grignotins visibles → M21.
- [ ] P1 — Le premier Matin ne donne pas de raison de revenir le lendemain → M12 (calendrier), M7 (cartes de déblocage).
- [ ] P1 — Les libellés du hub sont des mots (pictogrammes par bouton) → M21.
- [x] P1 — Articles pris par les clients perdus au rechargement en plein jour : accepté (DECISIONS.md, M6).

---

## Journal de session
- 2026-10-20 — M0 fait : fondations, build, titre, tests de fumée. Reste : M1 moteur. Prochaine étape : core/loop.js + rng.js + entrées.
- 2026-10-20 — M1 fait : moteur, entrées, debug, hooks. Reste : M2 sauvegarde. Prochaine étape : save/crc32.js, storage.js, schema.js.
- 2026-10-20 — M2 fait : sauvegarde complète et testée. Reste : M3 boutique. Prochaine étape : data/balance.js, game/shop.js (grille, placement), pathfinding.js.
- 2026-10-20 — M3 fait : boutique, validation, marchand. Reste : M4 le jour. Prochaine étape : day/producers, shelves, carry, customers, register, pads, barre de soleil.
- 2026-10-20 — M4 fait : la journée complète, testée au doigt. Reste : M5 la nuit. Prochaine étape : night/waves.js (générateur à graine), monsters.js, towers.js.
- 2026-10-20 — M5 fait : la nuit complète et testée. Reste : M6 cycle complet + P1. Prochaine étape : phases Matin/Aube, sauvegarde aux transitions, ticket, coffre, amélioration.
- 2026-10-20 — M6 fait : cycle complet, playtest P1 (docs/playtests/P1.md) et corrections. Reste : M7 données et progression. Prochaine étape : brancher Catalogue/Améliorer/cartes de déblocage (fichiers déjà préparés).
- 2026-10-20 — M7 fait : progression du Quartier 1 jouable depuis le Matin. Reste : M8 aménagement. Prochaine étape : routage des gestes vers la scène de l'éditeur (onPointer), écran Aménager déjà préparé.
- 2026-10-20 — M8 fait : aménagement. Reste : M9 semaine et Pleine Lune. Prochaine étape : brancher boss.js dans la nuit (bossStep), carte d'intro et barre de PV, Courage de Mamie.
- 2026-10-20 — M9 fait : semaine complète jusqu'au boss. Reste : M10 simulateur d'équilibrage Q1. Prochaine étape : scripts/sim.mjs avec scripts/lib/bots.mjs et strategy.mjs, 300 parties, seuils D2.4.
- 2026-10-20 — M10 fait : équilibrage Q1 (docs/sim/SIM_Q1.md). Reste : M11 les 10 premières minutes + P2. Prochaine étape : G19 seconde par seconde (flèche dorée, main fantôme, objectif toujours visible).
- 2026-10-21 — M11 fait : les 10 premières minutes + P2 (docs/playtests/P2.md). v0.2 publiée sur GitHub Pages. Prochaine étape : M12 quêtes, calendrier, série, succès, bestiaire.
- 2026-10-21 — M12 fait (mode rapide demandé : tests essentiels de la mission seulement). P2 rejoué : 15/15 jalons, calendrier réclamé à 2:41. Prochaine étape : M13 hors ligne, Moka, personnel.
- 2026-10-21 — M13 fait (tests essentiels). Q1 rééquilibré avec Moka dans les marges D2.5 (docs/sim/SIM_Q1.md). Prochaine étape : M14 Défi du jour, Rivaux, partage, événements.
- 2026-10-21 — M14 fait (tests essentiels ; D2.4.8 tenu). Prochaine étape : M15 pubs, rubis, Garde-robe + Playtest P3.
