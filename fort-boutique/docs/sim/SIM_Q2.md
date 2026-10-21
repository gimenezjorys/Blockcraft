# Simulation d'équilibrage — Quartier 2 (La Boulangerie)

300 parties par profil, jouées depuis le début (Q1 puis Q2 dès son ouverture), 45 cycles au plus, 626 s. Commande : `npm run sim -- --runs 300 --district q2`.

## Seuils (D2.4)

| Seuil | Mesure | Résultat |
|---|---|---|
| D2.4.1 — Moyen : Grande Pâte battue entre les cycles 15 et 20 (médiane, depuis le début) | cycle 19 | tenu |
| D2.4.2a — Faible : boss battu en 4 tentatives au plus (médiane) | 3 tentative(s) | tenu |
| D2.4.2b — Faible : durée du quartier ≤ 1,6 × celle du Moyen | 1.00 × | tenu |
| D2.4.3a — Fort : pas plus de 1,35 × plus rapide que le Moyen (durée du quartier) | 1.29 × | tenu |
| D2.4.3b — Fort : ★★★ sur 70 % des nuits au plus (Q2) | 27 % | tenu |
| D2.4.3c — Fort : boss battu du premier coup 85 % des fois au plus | 68 % | tenu |
| D2.4.4 — Moyen : jamais 3 nuits de suite sous 50 % (95 % des parties) | 60 % | **NON TENU** |
| D2.4.5 — Moyen : achat utile en 2 cycles au plus, sans inflation (90 % des parties) | 98 % (accessible 98 %, inflation 0 %) | tenu |
| D2.4.6 — Moyen : niveau 12 au plus tard 2 cycles après la Grande Pâte (80 %) | 100 % | tenu |

## Repères

- Arrivée au Q2 (médiane) : Faible cycle 10, Moyen 11, Fort 9.
- Durée du quartier (cycles, médiane) : Faible 9, Moyen 9, Fort 7.
- Tentatives contre la Grande Pâte (médiane) : Faible 3, Moyen 3, Fort 1.
- Bocal gardé hors Pleine Lune (Moyen, médiane) : 77 %.
- Nuits à ★★★ au Q2 : Faible 17 %, Moyen 12 %, Fort 27 %.

## Changements faits (M16, marges D2.5)

| Valeur | Avant | Après | Écart |
|---|---|---|---|
| PV des Grignotins au Q2 (M_Q, G10.2) | × 2,0 | × 1,5 | −25 % |
| Budget de menace du Q2 (F_Q, G8.3) | × 1,15 | × 0,8625 | −25 % |
| Grande Pâte : PV / vitesse / vol (G10.3) | 1 700 / 0,5 / 35 % | 1 275 / 0,375 / 26,25 % | −25 % |
| Grande Pâte : gloubis par scission | 4 | 3 | −25 % |
| Courage de Mamie : par échec / au plus (G8.9) | 15 % / 60 % | 18,75 % / 75 % | +25 % |

Robots (D2.2) : le Moyen suit une liste de priorités propre au quartier (étagères et vitrine contre les chauves-souris) ; le Fort compte double ce qui touche les volants là où il y en a ; le Faible achète aussi au hasard l'agrandissement ou une amélioration du marchand.

