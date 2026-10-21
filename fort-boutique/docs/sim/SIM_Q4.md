# Simulation d'équilibrage — Quartier 4 (La Quincaillerie)

300 parties par profil, jouées depuis le début (chaque quartier dès son ouverture), 75 cycles au plus, 2033 s. Commande : `npm run sim -- --runs 300 --district q4`.

## Seuils (D2.4)

| Seuil | Mesure | Résultat |
|---|---|---|
| D2.4.1 — Moyen : Ferrailleur battu entre les cycles 35 et 46 (médiane, depuis le début) | cycle 39 | tenu |
| D2.4.2a — Faible : boss battu en 4 tentatives au plus (médiane) | 10 tentative(s) | **NON TENU** |
| D2.4.2b — Faible : durée du quartier ≤ 1,6 × celle du Moyen | 1.36 × | tenu |
| D2.4.3a — Fort : pas plus de 1,35 × plus rapide que le Moyen (durée du quartier) | 1.22 × | tenu |
| D2.4.3b — Fort : ★★★ sur 70 % des nuits au plus (Q4) | 1 % | tenu |
| D2.4.3c — Fort : boss battu du premier coup 85 % des fois au plus | 18 % | tenu |
| D2.4.4 — Moyen : jamais 3 nuits de suite sous 50 % (95 % des parties) | 2 % | **NON TENU** |
| D2.4.5 — Moyen : achat utile en 2 cycles au plus, sans inflation (90 % des parties) | 69 % (accessible 69 %, inflation 0 %) | **NON TENU** |
| D2.4.6 — Moyen : niveau 24 au plus tard 2 cycles après le boss (80 %) | 100 % | tenu |

## Repères

- Arrivée au Q4 (médiane) : Faible cycle 33, Moyen 28, Fort 26.
- Durée du quartier (cycles, médiane) : Faible 15, Moyen 11, Fort 9.
- Tentatives contre le boss (médiane) : Faible 10, Moyen 5, Fort 3.
- Bocal gardé hors Pleine Lune (Moyen, médiane) : 43 %.
- Nuits à ★★★ au Q4 : Faible 1 %, Moyen 0 %, Fort 1 %.

## Changements faits (marges D2.5)

| Valeur | Avant | Après | Écart |
|---|---|---|---|
| PV des Grignotins au Q4 (M_Q, G10.2) | × 6,2 | × 4,65 | −25 % |
| Budget de menace du Q4 (F_Q, G8.3) | × 1,45 | × 1,0875 | −25 % |
| Poids au Q4 : gros gourmand / hérisson (G8.3) | 15 / 20 | 11,25 / 15 | −25 % |
| Vol du corbeau (G10.1) | 5 % | 3,75 % | −25 % |
| Golem : armure / vol (G10.1) | 8 / 20 % | 6 / 15 % | −25 % |
| Ferrailleur : PV / armure / vitesse / vol (G10.3) | 3 400 / 10 / 0,4 / 40 % | 2 550 / 7,5 / 0,3 / 30 % | −25 % |
| Ferrailleur : écrasement (dégâts par s / rayon) | 30 / 1 case | 22,5 / 0,75 case | −25 % |

Robots (D2.2) : le Moyen suit une liste de priorités propre au quartier (contre les volants, et une lanterne dans l'obscurité) ; le Fort compte double ce qui touche les volants là où il y en a ; le Faible achète aussi au hasard l'agrandissement ou une amélioration du marchand.

