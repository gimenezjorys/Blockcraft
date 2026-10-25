// Fort Boutique — mesures et seuils des simulations du Quartier 1 (D2.3, D2.4, G12.5).

export const median = (arr) => {
  const a = arr.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return NaN;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const share = (arr, pred) => (arr.length ? arr.filter(pred).length / arr.length : 0);
const pct = (x) => `${Math.round(x * 100)} %`;

/** Plus longue série de nuits (Pleine Lune comprise) sous 50 % de Bocal gardé. */
function worstLowRun(game) {
  let run = 0;
  let worst = 0;
  for (const c of game.cycles) {
    run = c.kept < 0.5 ? run + 1 : 0;
    worst = Math.max(worst, run);
  }
  return worst;
}

/** Économie d'une partie : un achat utile accessible en 2 cycles au plus, et pas d'inflation (D2.4.5). */
export function economyOk(game) {
  const cs = game.cycles;
  let accessible = true;
  for (let i = 0; i < cs.length; i++) {
    let ok = false;
    for (let j = i; j < Math.min(cs.length, i + 3); j++) if (cs[j].coinsBefore >= cs[j].usefulBefore) ok = true;
    if (!ok && i + 2 < cs.length) accessible = false;
  }
  // Solde gardé après les achats du Matin : s'il dépasse 4 fois l'achat utile le moins cher plus de 3 cycles de suite,
  // c'est qu'il n'y a plus rien d'utile à acheter (inflation).
  let rich = 0;
  let inflation = false;
  for (const c of cs) {
    rich = Number.isFinite(c.useful) && c.coins > 4 * c.useful ? rich + 1 : 0;
    if (rich > 3) inflation = true;
  }
  return { accessible, inflation, ok: accessible && !inflation };
}

/** Niveau atteint à la fin d'un cycle. */
const levelAt = (game, cycle) => {
  const c = game.cycles.find((x) => x.cycle === cycle);
  return c ? c.level : NaN;
};

/**
 * Évalue les seuils D2.4 du Quartier 1.
 * @param {{ weak: any[], medium: any[], strong: any[] }} r parties par profil
 * @param {number} maxCycles
 */
export function evaluateQ1(r, maxCycles) {
  const won = (g) => (g.bossWonAt === null ? maxCycles + 1 : g.bossWonAt);
  const M = median(r.medium.map(won));
  const W = median(r.weak.map(won));
  const S = median(r.strong.map(won));
  // « Nuits au Q1 » : toutes les nuits jouées dans le quartier (Pleine Lune comprise), jusqu'au départ vers le Q2.
  const strongNights = r.strong.flatMap((g) => g.cycles);
  const eco = r.medium.map(economyOk);
  const nextGap = r.medium.filter((g) => g.bossWonAt !== null).map((g) => (g.nextLevelAt === null ? Infinity : g.nextLevelAt - g.bossWonAt));
  const night = (games, k) => median(games.map((g) => (g.cycles[k - 1] ? g.cycles[k - 1].nightS : NaN)));
  const rows = [
    { id: 'D2.4.1', label: 'Moyen : Roi Raton battu entre les cycles 7 et 10 (médiane)', value: `cycle ${M}`, ok: M >= 7 && M <= 10 },
    { id: 'D2.4.2a', label: 'Faible : boss battu en 4 tentatives au plus (médiane)', value: `${median(r.weak.map((g) => g.bossAttempts))} tentative(s)`, ok: median(r.weak.map((g) => g.bossAttempts)) <= 4 && share(r.weak, (g) => g.bossWonAt !== null) >= 0.5 },
    { id: 'D2.4.2b', label: 'Faible : durée du quartier ≤ 1,6 × celle du Moyen', value: `${(W / M).toFixed(2)} ×`, ok: W / M <= 1.6 },
    { id: 'D2.4.3a', label: 'Fort : pas plus de 1,35 × plus rapide que le Moyen', value: `${(M / S).toFixed(2)} ×`, ok: M / S <= 1.35 },
    { id: 'D2.4.3b', label: 'Fort : ★★★ sur 80 % des nuits au plus', value: pct(share(strongNights, (c) => c.stars === 3)), ok: share(strongNights, (c) => c.stars === 3) <= 0.8 },
    { id: 'D2.4.3c', label: 'Fort : boss battu du premier coup 85 % des fois au plus', value: pct(share(r.strong, (g) => g.bossWonAt !== null && g.bossAttempts === 1)), ok: share(r.strong, (g) => g.bossWonAt !== null && g.bossAttempts === 1) <= 0.85 },
    { id: 'D2.4.4', label: 'Moyen : jamais 3 nuits de suite sous 50 % (95 % des parties)', value: pct(share(r.medium, (g) => worstLowRun(g) < 3)), ok: share(r.medium, (g) => worstLowRun(g) < 3) >= 0.95 },
    { id: 'D2.4.5', label: 'Moyen : achat utile en 2 cycles au plus, sans inflation (90 % des parties)', value: `${pct(share(eco, (e) => e.ok))} (accessible ${pct(share(eco, (e) => e.accessible))}, inflation ${pct(share(eco, (e) => e.inflation))})`, ok: share(eco, (e) => e.ok) >= 0.9 },
    { id: 'D2.4.6', label: 'Moyen : niveau 7 au plus tard 2 cycles après le Roi Raton (80 %)', value: pct(share(nextGap, (x) => x <= 2)), ok: share(nextGap, (x) => x <= 2) >= 0.8 },
    { id: 'G12.5a', label: 'Moyen : niveau 3 à la fin du cycle 2 (médiane)', value: `niveau ${median(r.medium.map((g) => levelAt(g, 2)))}`, ok: median(r.medium.map((g) => levelAt(g, 2))) >= 3 },
    { id: 'G12.5b', label: 'Moyen : niveau 4 à la fin du cycle 3 (médiane)', value: `niveau ${median(r.medium.map((g) => levelAt(g, 3)))}`, ok: median(r.medium.map((g) => levelAt(g, 3))) >= 4 },
    { id: 'G12.5c', label: 'Moyen : niveau 5 au cycle 4 ou 5 (médiane)', value: `niveau ${median(r.medium.map((g) => levelAt(g, 5)))} au cycle 5, ${median(r.medium.map((g) => levelAt(g, 4)))} au cycle 4`, ok: median(r.medium.map((g) => levelAt(g, 5))) >= 5 && median(r.medium.map((g) => levelAt(g, 3))) < 5 },
  ];
  const info = {
    bossCycles: { weak: W, medium: M, strong: S },
    nightS: { n1: night(r.medium, 1), n2: night(r.medium, 2), n6: night(r.medium, 6) },
    earnedPerCycle: median(r.medium.flatMap((g) => g.cycles.filter((c) => !c.bossNight).map((c) => c.earned))),
    starsShare: {
      weak: share(r.weak.flatMap((g) => g.cycles), (c) => c.stars === 3),
      medium: share(r.medium.flatMap((g) => g.cycles), (c) => c.stars === 3),
      strong: share(strongNights, (c) => c.stars === 3),
    },
  };
  return { rows, ok: rows.every((x) => x.ok), info };
}

/**
 * Seuils D2.4 du Quartier 2 (M16) : parties jouées depuis le début (through: 'q2'), cycles comptés depuis le début.
 * @param {{ weak: any[], medium: any[], strong: any[] }} r
 * @param {number} maxCycles
 */
export function evaluateQ2(r, maxCycles) {
  return evaluateDistrict(r, 'q2', maxCycles);
}

/** Fenêtre du boss du Moyen (D2.4.1, cycles depuis le début), boss et niveau du quartier suivant. */
const WINDOWS = { q2: [15, 20], q3: [24, 32], q4: [35, 46], q5: [48, 62] };
const BOSS_NAME = { q2: 'Grande Pâte battue', q3: 'Dame Blanche battue', q4: 'Ferrailleur battu', q5: 'Reine Phalène battue' };
const NEXT_LEVEL = { q2: 12, q3: 18, q4: 24 };

/**
 * Seuils D2.4 d'un quartier après le premier (parties jouées depuis le début, `through`).
 * @param {{ weak: any[], medium: any[], strong: any[] }} r
 * @param {string} id
 * @param {number} maxCycles
 */
export function evaluateDistrict(r, id, maxCycles) {
  const dd = (g) => (g.d ? g.d[id] : null);
  const won = (g) => (dd(g) && dd(g).bossWonAt !== null ? dd(g).bossWonAt : maxCycles + 1);
  const dur = (g) => won(g) - (dd(g) ? dd(g).start : maxCycles) + 1;
  const M = median(r.medium.map(won));
  const Md = median(r.medium.map(dur));
  const Wd = median(r.weak.map(dur));
  const Sd = median(r.strong.map(dur));
  const q2Nights = (games) => games.flatMap((g) => g.cycles.filter((c) => c.district === id));
  const strongNights = q2Nights(r.strong);
  const lowRun = (g) => {
    let run = 0;
    let worst = 0;
    for (const c of g.cycles.filter((x) => x.district === id)) {
      run = c.kept < 0.5 ? run + 1 : 0;
      worst = Math.max(worst, run);
    }
    return worst;
  };
  const eco = r.medium.map((g) => economyOk({ cycles: g.cycles.filter((c) => c.district === id) }));
  const nextGap = r.medium.filter((g) => dd(g) && dd(g).bossWonAt !== null).map((g) => (dd(g).nextLevelAt === null ? Infinity : dd(g).nextLevelAt - dd(g).bossWonAt));
  const attemptsW = median(r.weak.map((g) => (dd(g) ? dd(g).attempts : NaN)));
  const [lo, hi] = WINDOWS[id];
  const rows = [
    { id: 'D2.4.1', label: `Moyen : ${BOSS_NAME[id]} entre les cycles ${lo} et ${hi} (médiane, depuis le début)`, value: `cycle ${M}`, ok: M >= lo && M <= hi },
    { id: 'D2.4.2a', label: 'Faible : boss battu en 4 tentatives au plus (médiane)', value: `${attemptsW} tentative(s)`, ok: attemptsW <= 4 && share(r.weak, (g) => dd(g) && dd(g).bossWonAt !== null) >= 0.5 },
    { id: 'D2.4.2b', label: 'Faible : durée du quartier ≤ 1,6 × celle du Moyen', value: `${(Wd / Md).toFixed(2)} ×`, ok: Wd / Md <= 1.6 },
    { id: 'D2.4.3a', label: 'Fort : pas plus de 1,35 × plus rapide que le Moyen (durée du quartier)', value: `${(Md / Sd).toFixed(2)} ×`, ok: Md / Sd <= 1.35 },
    { id: 'D2.4.3b', label: `Fort : ★★★ sur 70 % des nuits au plus (${id.toUpperCase()})`, value: pct(share(strongNights, (c) => c.stars === 3)), ok: share(strongNights, (c) => c.stars === 3) <= 0.7 },
    { id: 'D2.4.3c', label: 'Fort : boss battu du premier coup 85 % des fois au plus', value: pct(share(r.strong, (g) => dd(g) && dd(g).bossWonAt !== null && dd(g).attempts === 1)), ok: share(r.strong, (g) => dd(g) && dd(g).bossWonAt !== null && dd(g).attempts === 1) <= 0.85 },
    { id: 'D2.4.4', label: 'Moyen : jamais 3 nuits de suite sous 50 % (95 % des parties)', value: pct(share(r.medium, (g) => lowRun(g) < 3)), ok: share(r.medium, (g) => lowRun(g) < 3) >= 0.95 },
    { id: 'D2.4.5', label: 'Moyen : achat utile en 2 cycles au plus, sans inflation (90 % des parties)', value: `${pct(share(eco, (e) => e.ok))} (accessible ${pct(share(eco, (e) => e.accessible))}, inflation ${pct(share(eco, (e) => e.inflation))})`, ok: share(eco, (e) => e.ok) >= 0.9 },
    ...(NEXT_LEVEL[id] ? [{ id: 'D2.4.6', label: `Moyen : niveau ${NEXT_LEVEL[id]} au plus tard 2 cycles après le boss (80 %)`, value: pct(share(nextGap, (x) => x <= 2)), ok: share(nextGap, (x) => x <= 2) >= 0.8 }] : []),
  ];
  const info = {
    durations: { weak: Wd, medium: Md, strong: Sd },
    start: { weak: median(r.weak.map((g) => (dd(g) ? dd(g).start : NaN))), medium: median(r.medium.map((g) => (dd(g) ? dd(g).start : NaN))), strong: median(r.strong.map((g) => (dd(g) ? dd(g).start : NaN))) },
    attempts: { weak: attemptsW, medium: median(r.medium.map((g) => (dd(g) ? dd(g).attempts : NaN))), strong: median(r.strong.map((g) => (dd(g) ? dd(g).attempts : NaN))) },
    keptMedium: median(q2Nights(r.medium).filter((c) => !c.bossNight).map((c) => c.kept)),
    starsShare: { weak: share(q2Nights(r.weak), (c) => c.stars === 3), medium: share(q2Nights(r.medium), (c) => c.stars === 3), strong: share(strongNights, (c) => c.stars === 3) },
  };
  return { rows, ok: rows.every((x) => x.ok), info };
}
