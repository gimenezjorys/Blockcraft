# Fort Boutique — notes de version

## v1.0.0 (2026-10-23)

Première version complète : les 28 missions du document de mission (M0 à M27).

### Le jeu
- **Le jour, tu vends** : empiler les produits, servir les clients, encaisser, commandes spéciales, Rush ; emplacements d'achat guidés au début.
- **La nuit, tes meubles se battent** : chaque meuble devient une tourelle, un mur ou un soutien ; la disposition est le labyrinthe des Grignotins ; le marchand donne son aura, rattrape les voleurs et sonne la Cloche.
- **5 quartiers** et leurs boss : l'Épicerie (Roi Raton), la Boulangerie (Grande Pâte), la Pharmacie dans le noir (Dame Blanche), la Quincaillerie (Ferrailleur), l'Emporium (Reine Phalène, qui chasse tes lanternes).
- **Semaines sans fin**, Pleines Lunes, Coffres de Lune et plans ; meubles jusqu'au niveau 10, Moka le chat, personnel, recettes, agrandissements.
- **Aides de Mamie**, gratuites et automatiques : Courage qui monte après chaque Pleine Lune perdue (et éclaircit la horde), coup de main après une mauvaise nuit, semaines d'ouverture des boutiques neuves. Pas de mur.
- **Rejouer chaque jour** : quêtes, calendrier, flamme, succès, bestiaire, Défi du jour (le même pour tout le monde, à partager), événements de la semaine, saisons.
- **Fin de partie** : Nuit sans fin (record, coffres, rivaux simulés de la semaine) et Franchise de quartier (Lune rouge, étoiles et enseignes de prestige).
- **Garde-robe** : cosmétiques en rubis, jamais de pay-to-win. **Pubs** uniquement récompensées et toujours au choix.

### Technique
- Un seul fichier `dist/index.html` (389 Ko), sans police, image ni son externes : dessins et sons faits par le code (canvas, WebAudio).
- Musique procédurale (titre, Matin, Jour, Nuit, boss, crépuscule, aube) et 49 effets sonores.
- Sauvegarde locale versionnée (CRC32, copie de secours, réparation), export / import par code.
- Français et anglais ; options d'accessibilité (secousses, flashs, gaucher, grand texte, icônes de faiblesse, mode économie).
- Performances (scène la plus chargée) : 0,14 ms par pas de simulation, 580 appels de dessin par image ; mode économie automatique sur les téléphones lents.

### Limites connues
- Les rapports de simulation de 300 parties (docs/sim) datent des missions M16 à M18 ; l'équilibrage global de M20 a été réglé sur des repérages de 12 à 150 parties (DECISIONS.md), puis tests et simulations ont été arrêtés sur demande.
- Les tests de fuite, les entrées au hasard, les 500 sauvegardes altérées et le Playtest P5 n'ont pas été faits (même consigne).
- En semaine 2 et au-delà du Q4, un joueur moyen peut demander 5 tentatives pour la Pleine Lune (boucle facultative, le Courage monte à chaque échec).
