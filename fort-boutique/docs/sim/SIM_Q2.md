# Simulation d'équilibrage — Quartier 2 (La Boulangerie)

50 parties par profil, jouées depuis le début (chaque quartier dès son ouverture), 45 cycles au plus, 55 s. Commande : `npm run sim -- --runs 50 --district q2`.

## Seuils (D2.4)

| Seuil | Mesure | Résultat |
|---|---|---|
| D2.4.1 — Moyen : Grande Pâte battue entre les cycles 15 et 20 (médiane, depuis le début) | cycle 15 | tenu |
| D2.4.2a — Faible : boss battu en 4 tentatives au plus (médiane) | 1.5 tentative(s) | tenu |
| D2.4.2b — Faible : durée du quartier ≤ 1,6 × celle du Moyen | 1.07 × | tenu |
| D2.4.3a — Fort : pas plus de 1,35 × plus rapide que le Moyen (durée du quartier) | 1.00 × | tenu |
| D2.4.3b — Fort : ★★★ sur 70 % des nuits au plus (Q2) | 81 % | **NON TENU** |
| D2.4.3c — Fort : boss battu du premier coup 85 % des fois au plus | 82 % | tenu |
| D2.4.4 — Moyen : jamais 3 nuits de suite sous 50 % (95 % des parties) | 100 % | tenu |
| D2.4.5 — Moyen : achat utile en 2 cycles au plus, sans inflation (90 % des parties) | 100 % (accessible 100 %, inflation 0 %) | tenu |
| D2.4.6 — Moyen : niveau 12 au plus tard 2 cycles après le boss (80 %) | 100 % | tenu |

## Repères

- Arrivée au Q2 (médiane) : Faible cycle 9, Moyen 9, Fort 10.
- Durée du quartier (cycles, médiane) : Faible 7.5, Moyen 7, Fort 7.
- Tentatives contre le boss (médiane) : Faible 1.5, Moyen 1, Fort 1.
- Bocal gardé hors Pleine Lune (Moyen, médiane) : 100 %.
- Nuits à ★★★ au Q2 : Faible 57 %, Moyen 71 %, Fort 81 %.

## Changements faits (marges D2.5 ; au-delà et règles : M20, justifiés dans DECISIONS.md)

| Valeur | Avant | Après | Écart |
|---|---|---|---|
| PV des Grignotins au Q2 (M_Q, G10.2) | × 2,0 | × 1,5 | −25 % |
| Budget de menace du Q2 (F_Q, G8.3) | × 1,15 | × 0,8625 | −25 % |
| Grande Pâte : PV / vitesse / vol (G10.3) | 1 700 / 0,5 / 35 % | 1 275 / 0,375 / 26,25 % | −25 % |
| Grande Pâte : gloubis par scission | 4 | 3 | −25 % |
| Courage de Mamie : par échec / au plus (G8.9) | 15 % / 60 % | 18,75 % / 75 % | +25 % |
| M20 — Courage de Mamie : horde de la Pleine Lune suivante (G8.9, règle) | — | −25 % par échec (−75 % au plus) | règle |
| M20 — Courage de Mamie : dégâts à partir du 3e échec (G8.9, règle) | +18,75 % par échec (75 % au plus) | +25 % de plus par échec (125 % au plus) | règle |
| M20 — Coup de main de Mamie après une nuit sous 50 % (G8.10, règle) | — | horde −40 % la nuit suivante | règle |
| M20 — Semaines d'ouverture des quartiers 2 à 5 (G8.3, règle) | × 1 | horde × 0,55 (semaine 1), × 0,8 (semaine 2) | règle |
| M20 — Escorte du boss (G8.3) | 50 % du budget | 37,5 % | −25 % |
| M20 — Dégâts par niveau au-delà du niveau 5 (G9.1) | × 1,12 | × 1,20 (valeur d'avant M10) | +7 % par niveau |

Robots (D2.2) : le Moyen suit une liste de priorités propre au quartier (contre les volants, et une lanterne dans l'obscurité) ; le Fort compte double ce qui touche les volants là où il y en a ; le Faible achète aussi au hasard l'agrandissement ou une amélioration du marchand.

