// Fort Boutique — les Objectifs de Mamie (v1.1, V2.3) : le fil rouge des premières heures, un par un, dans l'ordre.
// Chaque objectif se mesure sur l'état absolu de la partie (déjà fait avant d'être demandé = validé dès qu'il
// apparaît). Texte affiché : clé `mamie.<id>` (6 mots au plus). Récompenses passées à grantReward (game/rewards.js).
//
// Mesures (game/mamie.js) :
//   shelfFill  plus grand nombre de `product` sur une étagère de la boutique
//   served     clients servis (stats.served)
//   owned      exemplaires de `furniture` dans la boutique (posés ou en réserve)
//   dayTakings recette du jour (ou de la dernière journée)
//   nights     nuits jouées (stats.nights)
//   level      niveau du meuble `furniture`
//   soldBy     articles `product` vendus depuis le début (stats.soldBy)
//   cashier    caissier embauché dans la boutique ; clerks : commis embauchés
//   flag       drapeau de progression `flag` (progress.flags)
//   nights3    nuits ★★★ (stats.nights3) ; shopNights : nuits jouées dans cette boutique
//   boss       victoires sur le boss `boss` (stats.bossKills)

export const MAMIE = {
  q1: [
    { id: 'q1_apples', kind: 'shelfFill', product: 'pomme', goal: 4, icon: 'prod:pomme', reward: { coins: 10 } },
    { id: 'q1_serve', kind: 'served', goal: 3, icon: 'svg:coin', reward: { coins: 15 } },
    { id: 'q1_shelf2', kind: 'owned', furniture: 'etagere', goal: 2, icon: 'furn:etagere', reward: { coins: 20 } },
    { id: 'q1_earn', kind: 'dayTakings', goal: 100, icon: 'svg:coin', reward: { plans: 2, planId: 'etagere' } },
    { id: 'q1_night', kind: 'nights', goal: 1, icon: 'svg:moon', reward: { coins: 30 } },
    { id: 'q1_upshelf', kind: 'level', furniture: 'etagere', goal: 2, icon: 'furn:etagere', reward: { coins: 20 } },
    { id: 'q1_frigo', kind: 'owned', furniture: 'frigo', goal: 1, icon: 'furn:frigo', reward: { plans: 2, planId: 'frigo' } },
    { id: 'q1_milk', kind: 'soldBy', product: 'lait', goal: 10, icon: 'prod:lait', reward: { coins: 40 } },
    { id: 'q1_cashier', kind: 'cashier', goal: 1, icon: 'svg:coin', reward: { coins: 50 } },
    { id: 'q1_plan', kind: 'flag', flag: 'planChosen', goal: 1, icon: 'svg:scroll', reward: { plans: 2, planId: 'comptoir' } },
    { id: 'q1_clerk', kind: 'clerks', goal: 1, icon: 'furn:cagette', reward: { coins: 60 } },
    { id: 'q1_autopilot', kind: 'flag', flag: 'autopilotDay', goal: 1, icon: 'svg:star', reward: { chest: 'wood' } },
    { id: 'q1_stars', kind: 'nights3', goal: 1, icon: 'svg:star', reward: { plans: 3 } },
    { id: 'q1_boss', kind: 'boss', boss: 'roi_raton', goal: 1, icon: 'svg:moon', reward: { chest: 'silver' } },
  ],
  q2: [
    { id: 'q2_bread', kind: 'soldBy', product: 'baguette', goal: 10, icon: 'prod:baguette', reward: { coins: 40, coinsMQ: true } },
    { id: 'q2_petrin', kind: 'owned', furniture: 'petrin', goal: 1, icon: 'furn:petrin', reward: { plans: 2, planId: 'petrin' } },
    { id: 'q2_vitrine', kind: 'owned', furniture: 'vitrine', goal: 1, icon: 'furn:vitrine', reward: { plans: 2, planId: 'vitrine' } },
    { id: 'q2_cake', kind: 'soldBy', product: 'gateau', goal: 5, icon: 'prod:gateau', reward: { coins: 60, coinsMQ: true } },
    { id: 'q2_boss', kind: 'boss', boss: 'grande_pate', goal: 1, icon: 'svg:moon', reward: { chest: 'silver' } },
  ],
  q3: [
    { id: 'q3_pills', kind: 'soldBy', product: 'pastilles', goal: 10, icon: 'prod:pastilles', reward: { coins: 40, coinsMQ: true } },
    { id: 'q3_herbier', kind: 'owned', furniture: 'herbier', goal: 1, icon: 'furn:herbier', reward: { plans: 2, planId: 'herbier' } },
    { id: 'q3_lantern', kind: 'owned', furniture: 'lanterne', goal: 1, icon: 'furn:lanterne', reward: { plans: 2, planId: 'lanterne' } },
    { id: 'q3_alambic', kind: 'owned', furniture: 'alambic', goal: 1, icon: 'furn:alambic', reward: { plans: 2, planId: 'alambic' } },
    { id: 'q3_boss', kind: 'boss', boss: 'dame_blanche', goal: 1, icon: 'svg:moon', reward: { chest: 'gold' } },
  ],
  q4: [
    { id: 'q4_nails', kind: 'soldBy', product: 'clous', goal: 10, icon: 'prod:clous', reward: { coins: 40, coinsMQ: true } },
    { id: 'q4_fan', kind: 'owned', furniture: 'ventilo', goal: 1, icon: 'furn:ventilo', reward: { plans: 2, planId: 'ventilo' } },
    { id: 'q4_anvil', kind: 'owned', furniture: 'enclume', goal: 1, icon: 'furn:enclume', reward: { plans: 2, planId: 'enclume' } },
    { id: 'q4_paint', kind: 'owned', furniture: 'peinture', goal: 1, icon: 'furn:peinture', reward: { plans: 2, planId: 'peinture' } },
    { id: 'q4_boss', kind: 'boss', boss: 'ferrailleur', goal: 1, icon: 'svg:moon', reward: { chest: 'gold' } },
  ],
  q5: [
    { id: 'q5_candy', kind: 'soldBy', product: 'bonbons', goal: 10, icon: 'prod:bonbons', reward: { coins: 40, coinsMQ: true } },
    { id: 'q5_nights', kind: 'shopNights', goal: 3, icon: 'svg:moon', reward: { coins: 60, coinsMQ: true } },
    { id: 'q5_upcandy', kind: 'level', furniture: 'bonbons', goal: 2, icon: 'furn:bonbons', reward: { plans: 2, planId: 'bonbons' } },
    { id: 'q5_stars', kind: 'shopStars', goal: 3, icon: 'svg:star', reward: { plans: 3 } },
    { id: 'q5_boss', kind: 'boss', boss: 'reine_phalene', goal: 1, icon: 'svg:moon', reward: { chest: 'gold' } },
  ],
};

/** Durées de la carte (ms) : coup de tampon, puis l'objectif suivant glisse en place. */
export const MAMIE_FX = { stampMs: 900, slideMs: 320 };
