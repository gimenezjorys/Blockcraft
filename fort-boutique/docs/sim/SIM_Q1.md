# Simulation d'équilibrage — Quartier 1 (L'Épicerie de Mamie)

50 parties par profil (Faible, Moyen, Fort), 30 cycles au plus, 3 workers, 42 s. Graine par partie : 1000 + i. Commande : `npm run sim -- --runs 50 --district q1`.

## Seuils (D2.4, G12.5)

| Seuil | Mesure | Résultat |
|---|---|---|
| D2.4.1 — Moyen : Roi Raton battu entre les cycles 7 et 10 (médiane) | cycle 8 | tenu |
| D2.4.2a — Faible : boss battu en 4 tentatives au plus (médiane) | 2 tentative(s) | tenu |
| D2.4.2b — Faible : durée du quartier ≤ 1,6 × celle du Moyen | 1.00 × | tenu |
| D2.4.3a — Fort : pas plus de 1,35 × plus rapide que le Moyen | 0.89 × | tenu |
| D2.4.3b — Fort : ★★★ sur 80 % des nuits au plus | 70 % | tenu |
| D2.4.3c — Fort : boss battu du premier coup 85 % des fois au plus | 0 % | tenu |
| D2.4.4 — Moyen : jamais 3 nuits de suite sous 50 % (95 % des parties) | 100 % | tenu |
| D2.4.5 — Moyen : achat utile en 2 cycles au plus, sans inflation (90 % des parties) | 100 % (accessible 100 %, inflation 0 %) | tenu |
| D2.4.6 — Moyen : niveau 7 au plus tard 2 cycles après le Roi Raton (80 %) | 100 % | tenu |
| G12.5a — Moyen : niveau 3 à la fin du cycle 2 (médiane) | niveau 3 | tenu |
| G12.5b — Moyen : niveau 4 à la fin du cycle 3 (médiane) | niveau 4 | tenu |
| G12.5c — Moyen : niveau 5 au cycle 4 ou 5 (médiane) | niveau 6 au cycle 5, 5 au cycle 4 | tenu |
| D2.4.7 — Moyen avec toutes les pubs : au plus 1,3 × plus rapide | 1.14 × (cycle 7) | tenu |
| D2.4.8 — Défi du jour : score moyen Faible ≥ 500, Moyen 800 à 1 000, Fort ≤ 1 250 | 912 / 933 / 1010 | tenu |

Les pubs (D2.4.7) : le Moyen regarde × 2, le coffre bonus et la revanche à chaque occasion (un cycle = un jour). Le Défi du jour (D2.4.8) est joué sans aménagement par les bots (disposition imposée). Les quêtes du jour (M12) sont simulées par un modèle provisoire (`scripts/lib/quests-model.mjs` : Faible 1, Moyen 2, Fort 3 quêtes par cycle dès le niveau 4).

## Repères

- Roi Raton battu (médiane) : Faible cycle 8, Moyen cycle 8, Fort cycle 9.
- Durée des nuits (Moyen, médiane) : nuit 1 27 s, nuit 2 55 s, nuit 6 70 s.
- Nuits à ★★★ (toutes les nuits du Q1, Pleine Lune comprise) : Faible 53 %, Moyen 64 %, Fort 70 %.
- Gains par cycle (Moyen, médiane, hors Pleine Lune) : 538 pièces.

## Niveau de marchand par cycle (médiane)

| Cycle | Faible | Moyen | Fort |
|---|---|---|---|
| 1 | 2 | 2 | 2 |
| 2 | 3 | 3 | 3 |
| 3 | 4 | 4 | 4 |
| 4 | 5 | 5 | 5 |
| 5 | 6 | 6 | 6 |
| 6 | 7 | 7 | 7 |
| 7 | 7 | 7 | 7 |
| 8 | 8 | 8 | 8 |
| 9 | 8 | 9 | 8 |
| 10 | 9 | 9 | 9 |
| 11 | NaN | NaN | 10 |
| 12 | NaN | NaN | NaN |

## Changements faits (M10, M13 et M15 dans les marges D2.5 ; M20 : règles communes, DECISIONS.md)

| Valeur | Avant | Après | Écart |
|---|---|---|---|
| M20 — Roi Raton : PV (G10.3 ; M10 : 900 -> 1 125) | 1 125 | 1 350 | +20 % (+50 % depuis G10.3, justifié) |
| Budget de menace : base (G8.3) | 5 | 6,25 | +25 % |
| Budget de menace : par nuit (G8.3) | 2,5 | 3,125 | +25 % |
| PV raton / souris / gloubi / mini-gloubi / termite / raton doré (G10) | 20 / 9 / 50 / 14 / 34 / 40 | 25 / 11 / 62 / 17 / 42 / 50 | +21 à +25 % (arrondis) |
| Vitesse du voleur (G8.4) | × 1,2 | × 1,5 | +25 % |
| Balai : dégâts / intervalle / portée (G8.7) | 6 / 0,8 s / 0,9 | 4,5 / 1,0 s / 0,68 | −25 % / +25 % / −24 % |
| Roi Raton : PV / invocation (G10.3) | 900 / 6 s | 1 125 / 4,8 s | +25 % / −20 % |
| Dégâts des meubles par niveau (G9.1) | × 1,20 | × 1,12 | −7 % |
| M13 — Moka : dégâts / bonds par seconde (G11.2) | 9 / 1,0 | 3,375 / 0,75 | −62,5 % (justifié) / −25 % |
| M13 — Vitesse des Grignotins hors boss, hors nuit 1 (G10.1) | × 1 | × 1,25 | +25 % |
| M13 — Écarts dans les vagues : membres / groupes (G8.3) | 0,35 / 0,9 s | 0,2625 / 0,675 s | −25 % |
| M15 — Revanche de la Pleine Lune (pub, G18.1) : dégâts | +25 % | +18,75 % | −25 % |
| M20 — Courage de Mamie : horde de la Pleine Lune suivante (G8.9, règle) | — | −25 % par échec (−75 % au plus) | règle |
| M20 — Courage de Mamie : dégâts à partir du 3e échec (G8.9, règle) | +18,75 % par échec (75 % au plus) | +25 % de plus par échec (125 % au plus) | règle |
| M20 — Coup de main de Mamie après une nuit sous 50 % (G8.10, règle) | — | horde −40 % la nuit suivante | règle |
| M20 — Semaines d'ouverture des quartiers 2 à 5 (G8.3, règle) | × 1 | horde × 0,55 (semaine 1), × 0,8 (semaine 2) | règle |
| M20 — Escorte du boss (G8.3) | 50 % du budget | 37,5 % | −25 % |
| M20 — Dégâts par niveau au-delà du niveau 5 (G9.1) | × 1,12 | × 1,20 (valeur d'avant M10) | +7 % par niveau |

Hors données : bots corrigés (itinéraire BFS, case d'accès de la caisse, dépenses du Matin), trois bugs de jeu corrigés (emplacement d'achat bloqué, pile bloquée par un produit sans étagère, produit d'étagère modifiable dans l'éditeur). Voir DECISIONS.md.

## Limites connues

- Les nuits 2 à 6 de la semaine 1 ne coûtent presque jamais d'étoile, quel que soit le profil : les voleurs arrivent à la caisse très abîmés et meurent sur le chemin du retour. La difficulté du Q1 repose donc sur la première nuit (voleur scénarisé) et la Pleine Lune, où le Courage de Mamie évite le mur.
- Le Moyen bat le Roi Raton au cycle 10 en médiane : dans la fenêtre 7–10, mais à son bord. Tenir à la fois ce seuil et « Fort ≤ 80 % de ★★★ » laisse peu de marge ; revu à l'équilibrage global (M20) : les aides de Mamie (Courage, coup de main) rapprochent le Moyen du milieu de la fenêtre.

Verdict : tous les seuils applicables sont tenus.

