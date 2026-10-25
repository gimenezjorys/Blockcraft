# Simulation d'équilibrage — Quartier 3 (La Pharmacie de l'Alchimiste)

300 parties par profil, jouées depuis le début (chaque quartier dès son ouverture), 60 cycles au plus, 880 s. Commande : `npm run sim -- --runs 300 --district q3`.

## Seuils (D2.4)

| Seuil | Mesure | Résultat |
|---|---|---|
| D2.4.1 — Moyen : Dame Blanche battue entre les cycles 24 et 32 (médiane, depuis le début) | cycle 27 | tenu |
| D2.4.2a — Faible : boss battu en 4 tentatives au plus (médiane) | 3 tentative(s) | tenu |
| D2.4.2b — Faible : durée du quartier ≤ 1,6 × celle du Moyen | 1.13 × | tenu |
| D2.4.3a — Fort : pas plus de 1,35 × plus rapide que le Moyen (durée du quartier) | 0.89 × | tenu |
| D2.4.3b — Fort : ★★★ sur 70 % des nuits au plus (Q3) | 11 % | tenu |
| D2.4.3c — Fort : boss battu du premier coup 85 % des fois au plus | 8 % | tenu |
| D2.4.4 — Moyen : jamais 3 nuits de suite sous 50 % (95 % des parties) | 48 % | **NON TENU** |
| D2.4.5 — Moyen : achat utile en 2 cycles au plus, sans inflation (90 % des parties) | 99 % (accessible 99 %, inflation 0 %) | tenu |
| D2.4.6 — Moyen : niveau 18 au plus tard 2 cycles après le boss (80 %) | 100 % | tenu |

## Repères

- Arrivée au Q3 (médiane) : Faible cycle 20, Moyen 20, Fort 17.
- Durée du quartier (cycles, médiane) : Faible 9, Moyen 8, Fort 9.
- Tentatives contre le boss (médiane) : Faible 3, Moyen 2, Fort 3.
- Bocal gardé hors Pleine Lune (Moyen, médiane) : 67 %.
- Nuits à ★★★ au Q3 : Faible 14 %, Moyen 4 %, Fort 11 %.

## Changements faits (marges D2.5)

| Valeur | Avant | Après | Écart |
|---|---|---|---|
| PV des Grignotins au Q3 (M_Q, G10.2) | × 3,6 | × 2,7 | −25 % |
| Budget de menace du Q3 (F_Q, G8.3) | × 1,3 | × 0,975 | −25 % |
| Vol : fantôme / lutin / gros gourmand (G10.1) | 5 / 6 / 15 % | 3,75 / 4,5 / 11,25 % | −25 % |
| Dame Blanche : PV / vol (G10.3) | 1 500 / 35 % | 1 125 / 26,25 % | −25 % |

Robots (D2.2) : le Moyen suit une liste de priorités propre au quartier (contre les volants, et une lanterne dans l'obscurité) ; le Fort compte double ce qui touche les volants là où il y en a ; le Faible achète aussi au hasard l'agrandissement ou une amélioration du marchand.

