# BlockCraft Daily — contexte projet

Jeu de puzzle mobile-first par glissement de blocs, avec une graine qui doit atteindre une case cible. Il tient en **un seul fichier HTML** (`index.html`, HTML + CSS + JS inline), n'a aucun backend et aucune dépendance, et il est publié via GitHub Pages.

## Structure du dépôt

| Chemin | Rôle |
|---|---|
| `index.html` | Le jeu complet. Il est servi tel quel par GitHub Pages. |
| `scripts/check-game.js` | Vérification : `node --check` sur le JS extrait, puis `Solver.validateLevels(LEVELS)`. |
| `.github/workflows/ci.yml` | CI : lance `scripts/check-game.js` à chaque push sur `main` et sur chaque PR. |
| `docs/` | Master Blueprint (.docx), audit de rétention, étude de marché. Ce sont des références, pas du code. |

## Vérifier avant chaque commit

```bash
node scripts/check-game.js index.html
```

- Le code de sortie vaut 1 si le JS ne compile pas ou si au moins un niveau est marqué ❌ (cassé ou non solvable).
- Un avertissement ⚠️ ne fait pas échouer la vérification. Aujourd'hui il y en a 4 : les niveaux INTRO résolus en 1 coup, ce qui est voulu.
- Résultat de référence : **60 niveaux, 0 cassé, 4 avertissements**.

Ne déclare jamais une modification « finie » sans avoir lancé cette vérification.

## Architecture de `index.html` (sections repérées par des bannières `/* ==== */`)

- **A. Données des niveaux** : `const LEVELS = [...]`, 60 niveaux répartis sur 8 mondes (Racines, Cailloux, Impasses, Givre, Passages, Courants, Ruines, Failles). Chaque niveau contient `size`, `seed`, `goal`, `walls`, `rocks`, `anchors`, `par`, etc. Le `par` doit être égal à la solution minimale calculée par le solveur.
- **A2. Solveur** (`const Solver`) : un BFS qui expose `analyze`, `validateLevels`, `slideState` et `solveNextMove`. C'est un outil de développement que le joueur ne voit jamais, sauf à travers l'indice (H2).
- **A15–A18** : utilitaires pour les mécaniques, à savoir portails, sens unique, interrupteurs/portes et portails directionnels.
- **B / B0** : état global, sauvegarde en `localStorage` versionnée avec `SCHEMA_MIGRATIONS` (toute modification du format de sauvegarde passe par une migration).
- **B2 / B3** : série quotidienne (streak + gel) et succès.
- **C–C6** : audio généré par WebAudio (aucun fichier externe), combo, musique de fond.
- **D–G** : navigation, accueil, paramètres, carte des mondes (`WORLD_THEMES`), chargement d'un niveau.
- **H** : l'algorithme de glissement (moteur). **H2** : l'indice. **I** : les entrées (swipe + clavier).
- `window.BCD_DEV` : outils console pour le développement (`validateLevels()`, `analyzeLevel()`, `setSimulatedDate()`, etc.).

## Règles de travail

- **Aucun backend.** Tout est local (`localStorage`). Une fonctionnalité qui exige un serveur (ligues, duels, guildes, vrais classements) est un projet d'infrastructure séparé, pas une simple feature (voir `docs/audit-blockcraft-retention.md`, §0).
- Le moteur (H) et le solveur (A2) doivent appliquer **exactement les mêmes règles** de glissement. Une nouvelle mécanique s'ajoute aux deux.
- Tout nouveau niveau doit passer le solveur : solvable, `par` exact, non trivial sauf s'il porte le tag INTRO.
- Pas de pay-to-win : les coins ne servent qu'aux cosmétiques, à l'indice et au gel de série.
- Le fichier reste autonome : pas de CDN et pas de fichier audio ou image externe.
- Langue du code, des commentaires et de l'interface : français.

## Pistes prioritaires (audit de rétention)

1. Mode Infini de Maîtrise : plateaux générés procéduralement puis validés par le solveur existant.
2. Fantômes locaux (par / soi-même) et carnet de maîtrise.
3. « Le Jardin » : méta-progression visuelle reliée aux 8 mondes.
