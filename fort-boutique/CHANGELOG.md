# Fort Boutique — journal des versions

## v1.1.0 — « Plus simple, plus clair, plus joli » (2026-10-23)

Missions V1 à V11 de [docs/PROMPT_V1_1.md](docs/PROMPT_V1_1.md). Les choix faits en route sont dans [DECISIONS.md](DECISIONS.md).

### Un jour clair et guidé (V2)
- **Flèche d'objectif** dorée : une seule cible à la fois, jamais de chemin tracé. Toujours visible le temps d'apprendre (3 fois chaque geste de base), puis seulement quand le joueur hésite (4 s sans action utile), lors d'un imprévu ou quand un emplacement devient payable. Option « Flèche d'aide : Auto / Toujours / Jamais ».
- **Bulles d'état** au-dessus des objets : étagère vide ou presque, producteur plein, file à la caisse, client qui s'impatiente (blanc → orange → rouge), meuble améliorable.
- **Objectifs de Mamie** : 14 objectifs au Quartier 1, 5 dans chacun des autres, un par un, avec tampon « Fait ! » et petite récompense ; déjà faits = validés tout de suite.
- **Ouverture de la journée** (panneau « Ouvert », carillon, clients qui attendaient) et **Moka dès le jour 1** (il aide toujours à partir du niveau 5).
- La main fantôme ne montre plus que le geste du joystick.

### La boutique se range toute seule (V3, V4)
- **Emplacements prévus** dessinés comme dans un vrai magasin (producteurs au fond, allée de présentoirs, défenses sur le trajet des Grignotins) : chaque achat se pose au bon endroit. 3 plans × 4 tailles, tous vérifiés.
- **Écran Plans** au Matin : L'Allée, Le Comptoir rapide, La Forteresse en mini-cartes avec les meubles du joueur, notes Clients et Défense tirées des vrais trajets ; échanger deux meubles d'un tap ; « Annuler ».
- L'éditeur libre reste disponible avec l'option « Aménagement libre (expert) ».
- **Sauvegarde v2** : une partie v1.0 se charge avec ses meubles rangés dans les emplacements ; rien n'est perdu (le trop-plein va dans la Réserve).

### Personnel et automatisation (V5, V6)
- **Embauche dans la boutique** par des carrés dorés : caissier au jour 4, commis aux jours 5 et 7, 2e caissier avec la boutique agrandie… (dès le jour 2 dans les autres quartiers).
- Avec un caissier, les pièces vont droit au porte-monnaie ; les commis ne visent jamais la même étagère et varient les produits en rayon.
- **Boutique automatisée**, **pilote automatique** et **« Passer la journée »** en un tap (1,5 s).
- **Vitesse ×1 / ×2 / ×3** le jour, ×1 / ×2 la nuit, gratuite ; elle redescend toute seule si le téléphone peine.

### Plus joli (V7, V8, V9)
- **Écran titre animé** : la boutique au soir, enseigne qui tombe et ouvre les yeux, lucioles, saison, étiquette suspendue, porte qui s'ouvre.
- **Hub du Matin vivant** : la boutique vue de la rue, l'intérieur réel du joueur dans la vitrine, ardoise, calendrier, boîte aux lettres, poteau de rue, Moka sur l'auvent, établi (catalogue, boîte à outils, plan) ; cachets de cire ; écrans habillés comme leurs objets.
- **Musique écrite** : un thème en fa majeur repris partout (boîte à musique, sifflement, glockenspiel, piano électrique, ukulélé Karplus-Strong, contrebasse, batterie légère), nuit en ré mineur, 3 habillages du jour.

### Équilibrage et finitions (V10)
- Simulation courte Q1 et Q2 : Roi Raton battu au cycle 8, pas de mur, pas d'inflation.
- Boutique automatisée sans aide : environ 92 % d'un bon joueur actif.
- 60 images/s en ×3 sur une boutique pleine.

### Limites connues
- Au Quartier 2, le robot Fort gagne 81 % de ses nuits à ★★★ (seuil de confort : 70 %) ; non corrigé (hors de la vérification demandée, voir DECISIONS.md, V10).
- La musique n'a pas pu être écoutée pendant le développement (serveur sans sortie son) : réglages à confirmer à l'oreille.
- GitHub Pages publie la branche `main` : la page en ligne passe en v1.1.0 une fois cette branche fusionnée.

## v1.0.0 (2026-10-23)

Première version complète : voir [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md).
