# Fort Boutique

**Le jour, tu vends. La nuit, tes meubles se battent.**
*Shop by day, defend by night.*

Fort Boutique est un jeu web mobile (portrait, jouable d'un pouce, aussi à la souris et au clavier) qui mélange l'arcade idle (tenir une boutique, empiler des produits, servir, encaisser, débloquer) et le tower defense : chaque meuble acheté le jour devient une tourelle la nuit, et la disposition de la boutique devient le labyrinthe des Grignotins. Un trajet long pour les monstres, c'est aussi un trajet long pour les clients : chaque choix compte deux fois.

## Jouer en ligne

**https://gimenezjorys.github.io/Blockcraft/fort-boutique/** (GitHub Pages du dépôt Blockcraft, branche `main` : la page en ligne montre ce qui a été fusionné dans `main`).

## Jouer hors ligne

Télécharger [`dist/index.html`](dist/index.html) et l'ouvrir par un double-clic : le jeu tient dans ce seul fichier, sans connexion, sans police, image ni son externes.

## Ce qu'il y a dans le jeu (v1.0)

- 5 quartiers et leurs boss, des semaines sans fin, 24 meubles qui vendent le jour et se battent la nuit, 13 Grignotins.
- Les aides de Mamie (Courage, coup de main, semaines d'ouverture) : on n'est jamais bloqué.
- Quêtes, calendrier, flamme, succès, bestiaire, Défi du jour à partager, événements, saisons.
- Nuit sans fin, Franchise de quartier, Garde-robe ; pubs uniquement récompensées.
- Musique et sons générés en direct, français et anglais, options d'accessibilité.

Détail : [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md). Décisions et réglages : [DECISIONS.md](DECISIONS.md). Avancement : [PROGRESS.md](PROGRESS.md).

## Commandes

```bash
npm ci            # installe esbuild et jsdom (versions figées)
npm run dev       # serveur local http://localhost:5173, reconstruit à chaque sauvegarde
npm test          # build + tous les tests (unitaires, intégration, interface jsdom, sauvegarde, simulations courtes)
npm run build     # produit dist/index.html autonome (≤ 600 Ko), le manifest et les icônes
npm run check     # vérifications maison (taille des fichiers, Math.random, dates, URL, traductions)
npm run sim       # simulations d'équilibrage par bots (ex. npm run sim -- --runs 300 --district all)
npm run playtest  # playtests simulés dans jsdom avec de vrais événements (ex. npm run playtest -- P2)
npm run bench     # mesures de performance (docs/sim/BENCH.md)
```

## Structure du code

| Dossier | Rôle |
|---|---|
| `src/core/` | boucle à pas fixe, générateur à graine, horloge UTC, événements, réserves d'objets |
| `src/input/` | toucher, souris, clavier, joystick flottant |
| `src/data/` | toutes les valeurs d'équilibrage (aucune valeur en dur dans la logique) |
| `src/game/` | la simulation, sans DOM : elle tourne dans Node pour les tests et les bots |
| `src/render/` | rendu Canvas 2D, éclairage, particules, chiffres-tampons |
| `src/ui/` | écrans DOM (ardoise, étiquettes kraft, ticket de caisse), traductions |
| `src/save/` | sauvegarde versionnée, CRC32, copies de secours, migrations, export |
| `src/ads/` | interface publicitaire et adaptateurs |
| `src/audio/` | synthèse WebAudio : musique et effets, sans fichier |
| `tests/` | tests `node:test` |
| `scripts/` | build, serveur, simulations, playtests, mesures, vérifications |

## Brancher une régie publicitaire

`src/ads/` : la règle (`ad-policy.js`, plafonds et moments permis), l'interface (`ads.js`) et les adaptateurs. Par défaut `none` (aucune pub, boutons grisés) ; `?ads=sim` affiche une pub de test de 3 s ; des squelettes Poki et CrazyGames sont prêts à compléter. Une récompense n'est donnée que si la pub est vue jusqu'au bout.

## Licence

MIT, voir [LICENSE](LICENSE).
