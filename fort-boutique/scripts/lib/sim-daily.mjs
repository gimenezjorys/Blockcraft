// Fort Boutique — simulation du Défi du jour (D2.4.8) : chaque profil de bot joue le défi de N jours UTC, disposition
// imposée telle quelle (aménagement automatique) ; score moyen par profil.
import { defaultSave } from '../../src/save/schema.js';
import { stepGame } from '../../src/game/phases.js';
import { createChallenge, startChallengeNight } from '../../src/game/daily-game.js';
import { dailyScore } from '../../src/game/daily.js';
import { createPilot, PROFILES } from './bots.mjs';

const DT = 1 / 30;

/** Joue le défi d'un jour avec un profil ; renvoie le score. */
export function simulateDaily(day, profileId) {
  const g = createChallenge(defaultSave({ seed: 1, now: 0, lang: 'fr' }), day);
  const pilot = createPilot(PROFILES[profileId], day);
  startChallengeNight(g);
  let guard = 0;
  while (!(g.night && g.night.ended)) {
    pilot.tick(g, DT);
    stepGame(g, DT);
    g.events.clear();
    if (++guard > 30 * 60 * 6) break;
  }
  const r = g.night.result;
  return { score: dailyScore(r), stars: r.stars, kept: r.kept };
}

/** Moyennes sur `days` défis à partir du jour `from`. */
export function runDailySims({ days = 40, from = 20700 } = {}) {
  const out = {};
  for (const p of ['weak', 'medium', 'strong']) {
    const scores = [];
    for (let d = 0; d < days; d++) scores.push(simulateDaily(from + d, p).score);
    out[p] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
  return out;
}

/** Seuil D2.4.8. */
export function dailyThreshold(m) {
  return { ok: m.weak >= 500 && m.medium >= 800 && m.medium <= 1000 && m.strong <= 1250, ...m };
}
