// Fort Boutique — la nuit : marchand, Cloche, réparation, lumière (G8.6, G8.7, G11.1, G20.5).
export const NIGHT = {
  /** Aura d'encouragement : +35 % de cadence à ≤ 1,6 case ; Sifflet +5 %/niveau. */
  auraBonus: 0.35,
  auraPerWhistle: 0.05,
  auraRadius: 1.6,
  /** Coup de balai automatique : 6 dégâts / 0,8 s à ≤ 0,9 case ; Balai +20 % dégâts, +10 % réparation par niveau. */
  broomDmg: 4.5, // M10 : 6 -> 4,5 (D2.5)
  broomEvery: 1.0, // M10 : 0,8 -> 1,0
  broomRange: 0.68, // M10 : 0,9 -> 0,68
  broomDmgPerLevel: 0.2,
  /** Réparation : 12 PV/s d'un meuble voisin ; un meuble cassé revient à 30 % après 3 s. */
  repairRate: 12,
  repairPerLevel: 0.1,
  repairRange: 0.75,
  reviveAfterS: 3,
  reviveHp: 0.3,
  /** Cloche : 14 Grignotins vaincus pour charger (−1 par niveau), étourdit 1,5 s (+0,1 s/niveau) + 15 dégâts. */
  bellKills: 14,
  bellStun: 1.5,
  bellStunPerLevel: 0.1,
  bellDmg: 15,
  /** Lanterne du marchand (rayon de lumière). */
  merchantLight: 1.8,
  /** Gros coup : > 20 % des PV max (arrêt sur image, G20.6). */
  bigHitRatio: 0.2,
  /** Voleur scénarisé de la première nuit : ralenti de moitié après 3 s sans réaction (G19 2:08). */
  scriptedThiefGrace: 3,
  /** Il garde la difficulté prévue par G19 (« première victoire ») malgré le réglage M10 des nuits normales :
   *  PV 20 et fuite × 1,2 comme avant M10, attrapable au balai en le poursuivant. */
  scriptedThiefHp: 20,
  scriptedThiefFlee: 1.2,
  /** Essai M10 (non retenu, DECISIONS.md) : fuite par la sortie ouverte la plus proche. Reste désactivé (G8.4). */
  thiefNearestExit: false,
  /** Courage de Mamie : +15 % de dégâts par échec au boss, max +60 % (G8.9). */
  // M16 (D2.5) : Courage de Mamie 15 % -> 18,75 % par échec, 60 % -> 75 % au plus.
  assistPerFail: 0.1875,
  assistMax: 0.75,
  /** M20 (règle, DECISIONS.md) : à partir du 3e échec, chaque échec ajoute en plus `assistRamp` (Courage qui monte
   *  vite pour qui bute sur le boss), plafond `assistRampMax`. 0 = règle de G8.9 seule. */
  assistRampFrom: 2,
  assistRamp: 0.25,
  assistRampMax: 3,
  /** Échecs comptés au plus (Courage et horde éclaircie). */
  maxFails: 10,
  /** M20 (règle, DECISIONS.md) : le Courage éclaircit aussi la horde de la Pleine Lune suivante (vagues, escorte,
   *  invocations et scissions du boss) : −25 % par échec, jusqu'à −75 %. */
  thinPerFail: 0.25,
  thinMin: 0.25,
  /** M20 (règle, DECISIONS.md) : coup de main de Mamie : après une nuit sous 50 % de Bocal gardé, la horde de la
   *  nuit suivante de cette boutique est réduite de 40 % (pas de mur, D2.4.4). */
  helpBelow: 0.5,
  helpThin: 0.6,
};

/** Courage de Mamie après `fails` échecs : bonus de dégâts des meubles à la Pleine Lune (G8.9, M20). */
export function courageAssist(fails) {
  const f = fails || 0;
  const base = Math.min(NIGHT.assistMax, NIGHT.assistPerFail * f);
  return Math.min(Math.max(NIGHT.assistMax, NIGHT.assistRampMax), base + NIGHT.assistRamp * Math.max(0, f - NIGHT.assistRampFrom));
}

/** Part de la horde gardée à la Pleine Lune après `fails` échecs (G8.9, M20). */
export function courageThin(fails) {
  return Math.max(NIGHT.thinMin, 1 - NIGHT.thinPerFail * (fails || 0));
}
