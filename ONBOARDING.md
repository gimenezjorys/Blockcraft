# Onboarding de Seedrift — recherche et principes

*Analyse de mémoire des jeux cités, sans mesures chiffrées inventées. Elle sert à décider, puis à vérifier en test joueurs avec les événements `tutorial_*` (voir la fin).*

## Ce que font les meilleurs, et ce qui agace

| Jeu | Ce qui marche | Ce qui agace (à éviter) |
|---|---|---|
| **Monument Valley / Threes** | On apprend en jouant : le premier niveau *est* le tutoriel. Presque aucun texte, la mécanique se montre. | Rien à noter ; la limite, c'est que les mécaniques complexes restent parfois floues. |
| **Duolingo** | Une mascotte avec de la personnalité (humour, émotions). Des petites victoires immédiates, un ton complice. | La mascotte qui culpabilise (« tu m'as abandonné ») : c'est notre ligne rouge. |
| **Royal Match / Gardenscapes** | Un personnage guide, un projecteur sur LE bon bouton, une seule chose à la fois, un cadeau d'essai (boosters offerts) pour rendre la découverte gratifiante. | Les longs dialogues d'histoire qu'on ne peut pas passer. |
| **Clash Royale / Brawl Stars** | Tutoriel à projecteur : fond assombri, un trou sur la cible, une main qui montre le geste. Le joueur *fait* chaque action lui-même. | Le tunnel forcé de plusieurs minutes, sans bouton « passer ». |
| **Wordle** | Rien à expliquer : l'interface se suffit, l'aide reste à un clic. | — |
| **Alto's Odyssey** | Divulgation progressive : chaque nouveauté arrive au moment où elle sert, un message à la fois. | — |

## Les 8 principes retenus pour Seedrift

1. **Le premier niveau est le tutoriel** : on joue en moins de 15 secondes. Un doigt fantôme montre le geste, le personnage réagit.
2. **Une seule chose à la fois** : une bulle, une action, puis on avance. 12 mots maximum par phrase.
3. **Montrer, pas expliquer** : projecteur sur le vrai bouton, cases qui pulsent, démo du geste. Le texte ne fait que nommer ce qu'on voit.
4. **Chaque fonction arrive quand elle sert** : l'Atelier quand on a des pièces, le Jardin quand on a de la rosée, les succès après le premier succès.
5. **Toujours un cadeau d'essai** : découvrir un onglet rapporte immédiatement (une graine offerte, de la rosée), pour que la curiosité soit récompensée.
6. **Un compagnon chaleureux, jamais culpabilisant** : Germain, la graine du jeu, avec humour et émotions. Il n'utilise jamais la peur de perdre.
7. **Le joueur garde la main** : « Passer » visible à chaque étape, sans reproche. Tutoriel rejouable depuis les Paramètres. Reprise propre après une fermeture. Jamais de blocage (cible absente ou retour arrière : l'étape s'annule).
8. **Respecter les joueurs existants** : pas d'intro imposée, seulement une courte visite des nouveautés, facultative.

## Mesure

Événements locaux, lisibles dans `BCD_DEV.getRetentionReport().tutorial` :
- `tutorial_started` ;
- `step_completed` (avec l'étape) ;
- `tutorial_skipped` (avec l'étape où le joueur a lâché) ;
- `tutorial_completed`.

La question à poser en test : **à quelle étape les gens passent-ils ?**

## Ce qui a été construit (voir `PRODUCTION_PROGRESS.md` §4d)

| Moment | Ce que fait Germain | Cadeau |
|---|---|---|
| 1er lancement | 2 bulles (« Salut ! Moi, c'est Germain… », « On essaie ? »), puis le niveau 1 | — |
| Niveau 1 | Montre le geste (doigt fantôme), célèbre la victoire | 3★ |
| Niveaux 2-3 | Un mot, puis des réactions courtes | — |
| Nouvelle mécanique | Mini-scène (surpris, puis content), les cases pulsent | — |
| Jardin (dès qu'un chantier est payable) | Projecteur sur l'onglet **Jardin** de la barre du bas, puis sur « Réveiller » | +3 💧 |
| Atelier (dès 30 pièces) | Projecteur sur l'onglet **Collection**, puis sur « Équiper » | Une graine offerte |
| Défi, Succès, Profil | Projecteur sur le bouton « Défi du jour », puis sur l'onglet **Profil** (rubrique Succès, puis Stats), une phrase | — |
| Fin | Diplôme | Succès « Apprenti », +25 🪙 |
| Lendemain (première semaine) | Rappel du défi et de la série, sans pression | — |
| Joueur existant | « Il y a du nouveau. Petite visite ? » (onglets Jardin, Rituel, Collection, Marché), et le mot de la fin montre le geste de navigation | — |

**Choix documentés** :
- « Passer » arrête tout le tutoriel ; les mécaniques reviennent alors en aide texte.
- « Plus tard » ne repousse que la visite en cours.
- Une réinitialisation de la progression relance le tutoriel.
- Les cadeaux ne sont jamais donnés deux fois, même avec « Revoir le tutoriel ».
- Une visite qui échoue deux fois (cible absente, retour arrière, « Plus tard ») est abandonnée pour ne jamais boucler.

## Aides contextuelles (octobre 2026)

Chaque nouveauté s'explique **une seule fois**, par Germain, au moment où le joueur la rencontre, quel que soit l'ordre de découverte (`showTipOnce`, clé `bcd_tips_v1`) :

| Nouveauté | Quand | Réplique |
|---|---|---|
| Rosée du matin | 1re visite du jardin avec des gouttes | « De la rosée du matin ! Touche les gouttes pour la cueillir. » |
| Guirlande | 1re visite après une lanterne allumée | « Chaque défi du jour réussi allume une lanterne de la guirlande. » |
| Croissance | 1re plante qui grandit sous les yeux du joueur | « Tes étoiles font grandir les plantes. Touche-les pour les voir ! » |
| Rang | 1er nouveau rang | « Ton rang de jardinier monte avec tout ce que tu accomplis. » |
| Rattrapage | 1re série en pause | « Ta série s'est arrêtée hier ? Rejoue ce défi pour la sauver. » |
| Bon retour | Après 3 jours d'absence, à l'arrivée sur JOUER (jamais sur l'écran de lancement) | « Te revoilà ! Le jardin t'a gardé un peu de rosée. » (+6 💧) |
| Navigation | 1re arrivée calme sur JOUER (aucune visite due) | « Glisse pour changer de page, ou touche les onglets en bas. » |
| Marché | 1re visite | « Le Marché : un cadeau chaque jour et des offres en pièces. » |
| Collection | 1re visite | « Ta collection : essaie chaque objet ici avant de l'acheter. » |
| Jardin | 1re visite sans rosée à cueillir (la rosée passe d'abord : une aide par visite) | « Ton jardin ! La rosée gagnée en jouant le réveille. » |
| Profil | 1re visite | « Tes missions, ta saison et tes succès sont rangés ici. » |

Jamais pendant l'intro, jamais par-dessus une autre bulle (elle attend la prochaine occasion), toujours fermable (« Merci ! », toucher, Échap). Dans le hub, une bulle en bas se pose au-dessus de la barre d'onglets, jamais dessus.

**Écran de lancement** : Germain y apparaît en silence (il glisse dans le décor) ; il ne parle qu'une fois le joueur sur la page JOUER.

**Limites** : tests automatisés dans Chromium (Playwright, vrais clics et touches) et dans jsdom, pas sur téléphone réel. Germain n'a pas été montré à de vrais joueurs : le ton et le rythme restent à valider.
