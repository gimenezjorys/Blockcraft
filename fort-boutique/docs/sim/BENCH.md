# Banc de performances (B5)

Scène : nuit de boss du Q5 (semaine 3, boutique E3), 120 Grignotins + la Reine Phalène, 300 particules. Node v22.22.0. Commande : `npm run bench`.

| Mesure | Valeur | Budget | Résultat |
|---|---|---|---|
| Mise à jour (moyenne par pas) | 0.14 ms | ≤ 4 ms | tenu |
| Mise à jour (95e centile) | 0.38 ms | — | tenu |
| Appels de dessin par image | 580 | ≤ 1200 | tenu |

Les appels de dessin comptent les tracés du canvas simulé (rectangles, chemins, images, textes) ; les sprites pré-rendus en cache comptent pour un seul appel.
