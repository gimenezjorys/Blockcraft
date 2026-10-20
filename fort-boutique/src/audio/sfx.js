// Fort Boutique — effets sonores (G21.5). Chaque recette : bus, intervalle minimal, fonction de synthèse.
// Les sons fréquents ont 2 ou 3 variantes ; hauteur ±3 % et volume ±1,5 dB ajoutés par audio.js.
import { tone, noise, fmBell, scaleNote, mtof } from './synth.js';

/**
 * @typedef {object} Recipe
 * @property {'sfx' | 'ui'} bus
 * @property {number} max nombre maximal par seconde (G21.4)
 * @property {number} dur durée nominale (s)
 * @property {boolean} [steady] ne varie presque pas (sons signatures)
 * @property {(ctx: AudioContext, out: AudioNode, t: number, o: { v: number, n: number, k: number }) => void} fn
 */

/** @type {Record<string, Recipe>} */
export const SFX = {
  ui_tap: {
    bus: 'ui', max: 12, dur: 0.06,
    fn(ctx, out, t, o) {
      const base = [880, 988, 1175][o.v % 3];
      tone(ctx, out, { freq: base, freqEnd: base * 1.5, t0: t, dur: 0.025, gain: 0.18 * o.k });
    },
  },
  ui_back: {
    bus: 'ui', max: 8, dur: 0.08,
    fn(ctx, out, t, o) {
      tone(ctx, out, { freq: 660, freqEnd: 440, t0: t, dur: 0.08, gain: 0.16 * o.k });
    },
  },
  pickup: {
    bus: 'sfx', max: 12, dur: 0.07,
    fn(ctx, out, t, o) {
      tone(ctx, out, { type: 'triangle', freq: scaleNote('day', 7 + o.n), t0: t, dur: 0.07, gain: 0.16 * o.k });
      noise(ctx, out, { t0: t, dur: 0.005, gain: 0.05 * o.k, freq: 3000 });
    },
  },
  drop: {
    bus: 'sfx', max: 12, dur: 0.06,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.018, gain: 0.14 * o.k, freq: 1400, q: 3 });
      tone(ctx, out, { freq: 320 + o.v * 15, freqEnd: 190, t0: t, dur: 0.06, gain: 0.14 * o.k });
    },
  },
  coin: {
    bus: 'sfx', max: 12, dur: 0.12,
    fn(ctx, out, t, o) {
      const f = scaleNote('day', 10 + (o.n % 10));
      tone(ctx, out, { freq: f, t0: t, dur: 0.12, gain: 0.12 * o.k });
      tone(ctx, out, { freq: f * 3, t0: t, dur: 0.08, gain: 0.05 * o.k });
    },
  },
  kaching: {
    bus: 'sfx', max: 6, dur: 0.25,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.012, gain: 0.12 * o.k, freq: 5000, q: 1 });
      [mtof(89), mtof(93), mtof(96)].forEach((f, i) => tone(ctx, out, { freq: f, t0: t + i * 0.035, dur: 0.12, gain: 0.1 * o.k }));
      fmBell(ctx, out, { t0: t + 0.07, freq: mtof(96), ratio: 3.5, index: 2, dur: 0.18, gain: 0.07 * o.k });
    },
  },
  door_bell: {
    bus: 'sfx', max: 1.25, dur: 0.6, steady: true,
    fn(ctx, out, t, o) {
      fmBell(ctx, out, { t0: t, freq: 880, ratio: 1.4, index: 3, indexEnd: 0.01, dur: 0.6, gain: 0.14 * o.k });
    },
  },
  happy: {
    bus: 'sfx', max: 6, dur: 0.1,
    fn(ctx, out, t, o) {
      tone(ctx, out, { type: 'square', freq: scaleNote('day', 9), t0: t, dur: 0.05, gain: 0.05 * o.k });
      tone(ctx, out, { type: 'square', freq: scaleNote('day', 11), t0: t + 0.05, dur: 0.05, gain: 0.05 * o.k });
    },
  },
  grumpy: {
    bus: 'sfx', max: 4, dur: 0.15,
    fn(ctx, out, t, o) {
      const osc = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(170, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.15);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(700, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.06 * o.k, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(f);
      f.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.2);
    },
  },
  pad_tick: {
    bus: 'sfx', max: 12, dur: 0.015,
    fn(ctx, out, t, o) {
      tone(ctx, out, { freq: 2500 * Math.pow(2, Math.floor(o.n / 5) / 12), t0: t, dur: 0.015, gain: 0.07 * o.k });
    },
  },
  build_pop: {
    bus: 'sfx', max: 4, dur: 0.22,
    fn(ctx, out, t, o) {
      tone(ctx, out, { freq: 180, freqEnd: 620, t0: t, dur: 0.12, gain: 0.18 * o.k });
      noise(ctx, out, { t0: t, dur: 0.15, gain: 0.08 * o.k, filter: 'lowpass', freq: 2000 });
      [0, 4, 7].forEach((s) => tone(ctx, out, { type: 'triangle', freq: mtof(65 + 12 + s), t0: t + 0.08, dur: 0.14, gain: 0.07 * o.k }));
    },
  },
  vip: {
    bus: 'sfx', max: 2, dur: 0.4,
    fn(ctx, out, t, o) {
      [96, 100, 103].forEach((m, i) => fmBell(ctx, out, { t0: t + i * 0.09, freq: mtof(m), ratio: 1.4, index: 2, dur: 0.25, gain: 0.07 * o.k }));
    },
  },
  close_shop: {
    bus: 'sfx', max: 2, dur: 0.45,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.4, gain: 0.12 * o.k, filter: 'bandpass', freq: 4000, freqEnd: 800, q: 0.8 });
      noise(ctx, out, { t0: t + 0.4, dur: 0.02, gain: 0.12 * o.k, freq: 2500, q: 4 });
    },
  },
  error: {
    bus: 'ui', max: 4, dur: 0.18,
    fn(ctx, out, t, o) {
      tone(ctx, out, { type: 'triangle', freq: 330, t0: t, dur: 0.08, gain: 0.12 * o.k });
      tone(ctx, out, { type: 'triangle', freq: 294, t0: t + 0.09, dur: 0.08, gain: 0.12 * o.k });
    },
  },
};
