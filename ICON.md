# Icône de Seedrift — recherche, variantes, choix

**Retenue : variante A, « La mascotte qui glisse ».** La planche de comparaison est dans `icons/compare/planche.png` (et `planche.html`).

## 1. Ce que font les icônes en tête des classements (casual / puzzle)

*Analyse de mémoire, à partir des conventions bien connues de ces jeux (Royal Match, Candy Crush, Block Blast, Monument Valley, Two Dots, Wordle, jeux de fusion). Je n'ai pas mesuré leurs taux de conversion.*

1. **Un seul élément focal**, énorme, qui remplit 60 à 80 % du carré : le roi de Royal Match, le bonbon de Candy Crush, la tuile de Wordle.
2. **Un visage ou un personnage** quand le jeu en a un : les yeux attirent le regard avant tout le reste, même en tout petit (Royal Match, la plupart des jeux de fusion).
3. **Des couleurs saturées et un contraste chaud/froid** : sujet chaud (or, orange, rouge) sur fond froid (bleu, vert, violet). Il ressort sur n'importe quel fond d'écran.
4. **De la profondeur** : dégradés, reflet brillant en haut à gauche, ombre portée douce, halo. L'objet a l'air « touchable ».
5. **Pas de texte**, ou une seule lettre très grosse (Wordle).
6. **Un cadrage serré** : le sujet déborde presque, rien de minuscule sur les bords.
7. **Une promesse fidèle** : l'icône montre la vraie pièce du jeu (le bloc de Block Blast, le pion de Two Dots). Les stores refusent les icônes trompeuses.
8. **Une silhouette lisible en 40 px** : on teste en tout petit, pas en 1024.
9. **Les jeux de blocs se ressemblent tous** (grilles colorées). Une grille noie l'icône dans la masse, ce que le changement de nom cherche justement à éviter.
10. **Une identité réutilisable** : l'icône devient la mascotte, le logo et la vignette des réseaux.

## 2. Les trois variantes (réellement différentes)

| Variante | Idée | Forces | Faiblesses |
|---|---|---|---|
| **A · La mascotte qui glisse** | Germain, la graine du jeu, avec un visage, en plein élan vers la lumière (traînée de glissement, case cible lumineuse) | Visage expressif, lisible en 40 px. Contraste or sur vert. Montre la vraie action. Devient le personnage du tutoriel. | Le style « mignon » vise un public large, pas les puristes du puzzle |
| **B · Le plateau** | Vue de dessus 3×3 : la graine file vers la case lumineuse, un bloc de pierre en coin | La mécanique se comprend tout de suite | Ressemble aux dizaines de jeux de blocs (grilles) : peu mémorable, et contraire au nouveau positionnement |
| **C · La pousse de lune** | Pousse lumineuse sous un croissant de lune, graine dans la terre | La plus belle ambiance, couleurs violettes qui ressortent | Pas de sujet « jeu » : on croirait une appli de méditation ou de jardinage. Moins fidèle à l'action principale. |

**Pourquoi A** :
- c'est la seule qui réunit visage, sujet unique, contraste chaud/froid et fidélité au jeu (la graine est bien la pièce que l'on fait glisser) ;
- elle reste reconnaissable en 40 px sur fond clair comme sombre ;
- sur le faux écran d'accueil, c'est la seule qui « regarde » le joueur ;
- son fond a été éclairci après comparaison, car il paraissait terne à côté d'icônes très saturées.

## 3. Fichiers

**Source :** `icons/src/icon-a-mascotte.svg`, commentée. Fond et sujet sont séparés par des marqueurs, pour l'export.

| Fichier | Usage |
|---|---|
| `icons/store/appstore-1024.png` | **App Store** : 1024×1024, PNG **RGB sans canal alpha**, sans coins arrondis |
| `icons/store/googleplay-512.png` | **Google Play** : 512×512 |
| `icons/android/adaptive-background-432.png` | Android adaptive : calque de fond (108 dp à xxxhdpi) |
| `icons/android/adaptive-foreground-432.png` | Android adaptive : avant-plan transparent, sujet dans la zone de sécurité (~66 %) |
| `icons/icon-maskable-512.png` | PWA « maskable » : sujet dans le cercle de 80 % |
| `icons/icon-512.png`, `icons/icon-192.png` | PWA (manifest) |
| `icons/apple-touch-icon.png` | iOS, écran d'accueil (180×180, opaque) |
| `icons/favicon.svg`, `favicon-32.png`, `favicon-16.png` | Onglet du navigateur |
| `icons/variants/*` | Les 3 variantes en 1024 / 120 / 60 / 40 px |

**Régénérer** (après modification d'un SVG) :

```bash
NODE_PATH=$(npm root -g) node scripts/export-icons.js a     # tous les formats, variante A
NODE_PATH=$(npm root -g) node scripts/icon-contact-sheet.js  # planche de comparaison
```

Le rendu passe par Chromium (Playwright, déjà utilisé par les tests) et les PNG sont encodés par le script : aucune autre dépendance. L'intégration dans `index.html` (favicon, apple-touch-icon, `theme-color` `#0b3a2e`) et dans `manifest.webmanifest` est faite.

## 4. Pour un niveau 100 % professionnel

Cette icône est propre et cohérente, mais **dessinée en formes géométriques simples par du code**. Les icônes du top 10 sont faites par des illustrateurs : matières, éclairage peint, micro-détails, expression travaillée. Pour lancer sur les stores, je recommande **un illustrateur** (environ 300 à 1 500 € selon le profil) ou une IA d'image, retouchée ensuite par un humain. Brief prêt à envoyer :

> **Brief — icône d'application « Seedrift » (jeu de puzzle mobile)**
> - **Le jeu** : on fait glisser une graine dorée sur un plateau ; elle file tout droit jusqu'à un obstacle et doit atteindre une case lumineuse. Univers : un jardin de nuit qui se rallume.
> - **Sujet unique** : Germain, la graine-mascotte. Forme d'amande dorée (#ffd166 → #f0a02e), deux petites feuilles au sommet, grands yeux brillants tournés vers la droite, petit sourire, joues rosées. Il glisse vers une lumière dorée à droite, avec une traînée de vitesse derrière lui.
> - **Fond** : vert d'eau lumineux au centre (#46c99a) vers vert profond aux bords (#0b3a2e). On devine discrètement des cases arrondies.
> - **Style** : 3D douce et brillante (type Royal Match ou les jeux de fusion), lumière chaude en haut à droite, reflet net sur la graine, ombre portée douce.
> - **Contraintes** : aucun texte ; lisible à 40 px ; carré 1024×1024 opaque sans coins arrondis ; sujet centré, à l'intérieur des 80 % centraux ; fournir aussi le fond et le sujet sur calques séparés (pour Android).
> - **Références fournies** : `icons/src/icon-a-mascotte.svg`, `icons/compare/planche.png`.
> - **Livrables** : PSD ou Figma en calques, PNG 1024, et 2 à 3 expressions de Germain (content, surpris, encourageant) pour le tutoriel.

Une fois l'illustration reçue, il suffit de remplacer `icons/src/icon-a-mascotte.svg` (ou de déposer directement les PNG aux mêmes chemins).
