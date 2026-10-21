// Fort Boutique — machine à états des phases (G5.1) : Jour -> Fermeture -> Crépuscule -> Nuit -> Aube.
// Le Matin et l'Aube (écrans, sauvegarde, coffres) sont complétés en M6.
import { stepPlayer, playerSpeed } from './player.js';
import { stepDay, endDay, CLOSING_S } from './day/day.js';
import { startNight, stepNight } from './night/night.js';
import { DAY } from '../data/balance.js';
import { stepCat } from './cat.js';

/** Durée du crépuscule (G5.1). */
export const DUSK_S = DAY.duskS;

/**
 * Un pas de simulation.
 * @param {any} g partie
 * @param {number} dt secondes
 */
export function stepGame(g, dt) {
  g.t += dt;
  g.phase.t += dt;
  const name = g.phase.name;
  const walking = name === 'free' || name === 'day' || name === 'closing' || name === 'night';
  if (walking) {
    const p = g.player;
    stepPlayer(p, g.input.x, g.input.y, playerSpeed(g.save.player.upgrades.shoes), dt, g.grid.w, g.grid.h, g.solid);
    if (g.cat) stepCat(g, dt);
  }
  if (name === 'day' || name === 'closing') {
    stepDay(g, dt);
    if (g.phase.name === 'closing' && g.phase.t >= CLOSING_S) {
      g.dayResult = endDay(g);
      g.events.push('day_end');
      beginDusk(g);
    }
  } else if (name === 'dusk') {
    stepDusk(g, dt);
  } else if (name === 'night') {
    stepNight(g, dt);
    if (g.night.ended) {
      g.nightResult = g.night.result;
      g.phase = { name: 'dawn', t: 0 };
      g.events.push('dawn');
    }
  }
}

/** Crépuscule (4 s) : les lampes s'allument, puis les meubles ouvrent les yeux un par un (G19 1:42). */
export function beginDusk(g) {
  g.phase = { name: 'dusk', t: 0 };
  g.shop.phase.name = 'dusk';
  const order = g.furn.slice().sort((a, b) => a.y - b.y || a.x - b.x);
  order.forEach((f, i) => {
    f.eyeAt = 1.6 + i * 0.06 * Math.max(1, 12 / Math.max(1, order.length));
    f.eyes = 0;
  });
  g.events.push('dusk');
}

function stepDusk(g, dt) {
  const t = g.phase.t;
  for (const f of g.furn) {
    if (t >= f.eyeAt && f.eyes < 1) {
      if (f.eyes === 0) g.events.push('eyes_open', f.cx, f.cy, f.idx);
      f.eyes = Math.min(1, f.eyes + dt / 0.18);
    }
  }
  if (t >= DUSK_S) {
    for (const f of g.furn) f.eyes = 1;
    startNight(g, { dayTakings: g.dayResult ? g.dayResult.takings : g.shop.phase.dayTakings });
  }
}
