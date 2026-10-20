// Fort Boutique — générateur de vagues à graine (G8.3) : même graine = mêmes vagues.
import { Rng, seedFrom } from '../../core/rng.js';
import { WAVES } from '../../data/waves.js';
import { DISTRICT_FACTORS } from '../../data/balance.js';
import { districtDef } from '../../data/districts.js';
import { MONSTERS, isAirborne } from '../../data/monsters.js';

/**
 * Nombre de vagues de la nuit k (1 à 7) de la semaine s.
 * @param {number} k
 * @param {number} s
 */
export function waveCount(k, s) {
  if (s <= 1) return WAVES.countWeek1[Math.max(0, Math.min(6, k - 1))];
  return k >= 7 ? WAVES.countLaterBoss : WAVES.countLater;
}

/**
 * Budget de menace de la vague i (G8.3).
 * @param {{ k: number, i: number, s: number, districtId: string }} p
 */
export function waveBudget({ k, i, s, districtId }) {
  const F = DISTRICT_FACTORS.threat[districtId] || 1;
  return (WAVES.budgetBase + WAVES.budgetPerNight * (k - 1)) * (WAVES.budgetWaveBase + WAVES.budgetPerWave * (i - 1)) * F * (1 + WAVES.budgetPerWeek * (s - 1));
}

/** Types éligibles cette nuit (seuls les types déjà introduits, G10.4). */
export function eligibleTypes(districtId, k, s) {
  const d = districtDef(districtId);
  return Object.keys(d.weights).filter((t) => s > 1 || (d.intro[t] ?? 99) <= k);
}

/** Types introduits exactement cette nuit (étiquette « NOUVEAU », vague 1 seule). */
export function newTypesTonight(districtId, k, s) {
  if (s > 1) return [];
  const d = districtDef(districtId);
  return Object.keys(d.intro).filter((t) => d.intro[t] === k);
}

/**
 * Entrées actives cette nuit.
 * @param {Array<{ kind: string, ground: boolean, air: boolean, fromNight: number }>} entrances
 */
export function activeEntrances(entrances, k, s) {
  return entrances.filter((e) => s > 1 || e.fromNight <= k);
}

/**
 * Entrées utilisables par un type : volants par la cheminée s'il y en a une, sinon par les ouvertures ;
 * au sol par les portes, fenêtres et la trappe.
 */
function entrancesFor(type, active) {
  const air = isAirborne(MONSTERS[type] || {});
  if (air) {
    // Les volants passent par la cheminée quand il y en a une (G10.4), sinon par les ouvertures.
    const chimney = active.filter((e) => e.kind === 'chimney');
    if (chimney.length) return chimney;
    return active.filter((e) => e.air);
  }
  return active.filter((e) => e.ground);
}

/**
 * Remplit un budget avec des groupes de 2 à 5 Grignotins du même type.
 * @param {Rng} rng
 */
function fillBudget(rng, budget, types, weights, active, out) {
  let left = budget;
  let guard = 50;
  while (guard-- > 0) {
    const affordable = types.filter((t) => MONSTERS[t].threat > 0 && MONSTERS[t].threat <= left + 1e-9);
    if (!affordable.length) break;
    const type = rng.weighted(affordable, (t) => weights[t] || 1);
    const def = MONSTERS[type];
    let n = rng.intRange(def.group[0], def.group[1]);
    n = Math.min(n, Math.floor((left + 1e-9) / def.threat));
    if (n < 1) break;
    left -= n * def.threat;
    const ents = entrancesFor(type, active);
    if (!ents.length) continue;
    out.push({ type, count: n, entrance: ents[rng.int(ents.length)].kind });
  }
  return out;
}

/**
 * Génère toutes les vagues d'une nuit.
 * @param {{ seed: number, districtId: string, week: number, night: number, entrances: any[], boss?: string|null,
 *   tutorial?: boolean, weightMult?: Record<string, number>, goldenChance?: number }} p
 * @returns {{ waves: Array<{ groups: Array<{ type: string, count: number, entrance: string, scriptedThief?: boolean }>, boss: string | null }>, golden: number, newTypes: string[] }}
 */
export function generateNight(p) {
  const { districtId, week: s, night: k } = p;
  const rng = new Rng(seedFrom(p.seed, 'nuit', districtId, s, k));
  const active = activeEntrances(p.entrances, k, s);
  if (p.tutorial) {
    const back = active.find((e) => e.kind === 'backdoor') || active[0];
    return {
      waves: WAVES.tutorial.map((groups) => ({ groups: groups.map((g) => ({ ...g, entrance: back.kind })), boss: null })),
      golden: -1,
      newTypes: ['raton'],
    };
  }
  const d = districtDef(districtId);
  const weights = { ...d.weights };
  for (const [t, m] of Object.entries(p.weightMult || {})) if (weights[t]) weights[t] *= m;
  const types = eligibleTypes(districtId, k, s);
  const fresh = newTypesTonight(districtId, k, s).filter((t) => types.includes(t));
  const W = waveCount(k, s);
  const waves = [];
  for (let i = 1; i <= W; i++) {
    const isBossWave = !!p.boss && i === W;
    let budget = waveBudget({ k, i, s, districtId });
    if (isBossWave) budget *= WAVES.bossEscort;
    const groups = [];
    if (i === 1 && fresh.length) {
      // Un type nouveau apparaît d'abord seul, en petit groupe.
      for (const t of fresh) {
        const def = MONSTERS[t];
        const n = Math.max(1, Math.min(def.group[0] + 1, Math.floor(budget / def.threat)));
        const ents = entrancesFor(t, active);
        if (ents.length) groups.push({ type: t, count: n, entrance: ents[rng.int(ents.length)].kind });
      }
    } else {
      fillBudget(rng, budget, types, weights, active, groups);
    }
    waves.push({ groups, boss: isBossWave ? p.boss : null });
  }
  // Raton doré : une nuit sur 10, une fois, dans une vague au hasard (G8.8).
  let golden = -1;
  if (rng.chance(p.goldenChance ?? WAVES.goldenChance)) {
    golden = rng.int(W);
    const ground = active.filter((e) => e.ground);
    if (ground.length) waves[golden].groups.push({ type: 'raton_dore', count: 1, entrance: ground[rng.int(ground.length)].kind });
  }
  return { waves, golden, newTypes: fresh };
}
