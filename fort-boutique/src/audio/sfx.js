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
  eyes_open: {
    bus: 'sfx', max: 20, dur: 0.04,
    fn(ctx, out, t, o) {
      tone(ctx, out, { freq: 500, freqEnd: 1000, t0: t, dur: 0.04, gain: 0.07 * o.k });
    },
  },
  eyes_boing: {
    bus: 'sfx', max: 2, dur: 0.25,
    fn(ctx, out, t, o) {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(300, t);
      lfo.frequency.setValueAtTime(18, t);
      lg.gain.setValueAtTime(25, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.12 * o.k, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      lfo.connect(lg);
      lg.connect(osc.frequency);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      lfo.start(t);
      osc.stop(t + 0.3);
      lfo.stop(t + 0.3);
    },
  },
  wave_warn: {
    bus: 'sfx', max: 2, dur: 0.4,
    fn(ctx, out, t, o) {
      tone(ctx, out, { freq: 140, freqEnd: 80, t0: t, dur: 0.12, gain: 0.12 * o.k });
      tone(ctx, out, { freq: 140, freqEnd: 80, t0: t + 0.18, dur: 0.12, gain: 0.1 * o.k });
      tone(ctx, out, { type: 'sawtooth', freq: 90, freqEnd: 70, t0: t, dur: 0.35, gain: 0.025 * o.k });
    },
  },
  wave_start: {
    bus: 'sfx', max: 2, dur: 0.45,
    fn(ctx, out, t, o) {
      for (let i = 0; i < 3; i++) {
        tone(ctx, out, { freq: 140, freqEnd: 80, t0: t + i * 0.13, dur: 0.12, gain: 0.14 * o.k });
        noise(ctx, out, { t0: t + i * 0.13, dur: 0.05, gain: 0.05 * o.k, filter: 'lowpass', freq: 900 });
      }
    },
  },
  wave_clear: {
    bus: 'sfx', max: 2, dur: 0.4,
    fn(ctx, out, t, o) {
      [0, 2, 4].forEach((n, i) => tone(ctx, out, { freq: scaleNote('night', 7 + n), t0: t + i * 0.11, dur: 0.3, gain: 0.08 * o.k }));
    },
  },
  shot_can: {
    bus: 'sfx', max: 12, dur: 0.05,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.03, gain: 0.06 * o.k, filter: 'lowpass', freq: 1000 });
      tone(ctx, out, { freq: 220, freqEnd: 150, t0: t, dur: 0.05, gain: 0.06 * o.k });
    },
  },
  shot_coin: {
    bus: 'sfx', max: 12, dur: 0.025,
    fn(ctx, out, t, o) {
      tone(ctx, out, { freq: 2600, t0: t, dur: 0.025, gain: 0.03 * o.k });
      noise(ctx, out, { t0: t, dur: 0.004, gain: 0.03 * o.k, freq: 4000 });
    },
  },
  lob: {
    bus: 'sfx', max: 10, dur: 0.06,
    fn(ctx, out, t, o) {
      tone(ctx, out, { freq: 400, freqEnd: 250, t0: t, dur: 0.06, gain: 0.06 * o.k });
    },
  },
  splat: {
    bus: 'sfx', max: 10, dur: 0.12,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.1, gain: 0.08 * o.k, filter: 'lowpass', freq: 600 });
      tone(ctx, out, { freq: 140, freqEnd: 70, t0: t, dur: 0.12, gain: 0.08 * o.k });
    },
  },
  frost: {
    bus: 'sfx', max: 8, dur: 0.18,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.18, gain: 0.05 * o.k, filter: 'highpass', freq: 4000, freqEnd: 2000 });
      tone(ctx, out, { freq: 1800, freqEnd: 1200, t0: t, dur: 0.18, gain: 0.03 * o.k });
    },
  },
  chomp: {
    bus: 'sfx', max: 8, dur: 0.12,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.02, gain: 0.1 * o.k, filter: 'lowpass', freq: 800 });
      noise(ctx, out, { t0: t + 0.06, dur: 0.02, gain: 0.1 * o.k, filter: 'lowpass', freq: 800 });
      tone(ctx, out, { freq: 180, t0: t, dur: 0.1, gain: 0.06 * o.k });
    },
  },
  hit: {
    bus: 'sfx', max: 10, dur: 0.02,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.02, gain: 0.05 * o.k, freq: 1500 + (o.v % 7) * 220, q: 2 });
    },
  },
  armor: {
    bus: 'sfx', max: 8, dur: 0.08,
    fn(ctx, out, t, o) {
      fmBell(ctx, out, { t0: t, freq: 1200, ratio: 2.7, index: 2, dur: 0.08, gain: 0.04 * o.k });
    },
  },
  pouf: {
    bus: 'sfx', max: 10, dur: 0.18,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.16, gain: 0.08 * o.k, filter: 'lowpass', freq: 3000, freqEnd: 300 });
      tone(ctx, out, { freq: scaleNote('night', 7 + (o.n % 5)), t0: t + 0.02, dur: 0.12, gain: 0.05 * o.k });
    },
  },
  thief_grab: {
    bus: 'sfx', max: 4, dur: 0.3,
    fn(ctx, out, t, o) {
      tone(ctx, out, { type: 'square', freq: mtof(69), t0: t, dur: 0.09, gain: 0.05 * o.k });
      tone(ctx, out, { type: 'square', freq: mtof(65), t0: t + 0.1, dur: 0.09, gain: 0.05 * o.k });
      for (let i = 0; i < 3; i++) tone(ctx, out, { freq: 2400 - i * 300, t0: t + 0.12 + i * 0.05, dur: 0.05, gain: 0.03 * o.k });
    },
  },
  thief_caught: {
    bus: 'sfx', max: 4, dur: 0.45,
    fn(ctx, out, t, o) {
      for (let i = 0; i < 5; i++) tone(ctx, out, { freq: scaleNote('night', 7 + i), t0: t + i * 0.04, dur: 0.1, gain: 0.06 * o.k });
      for (let i = 0; i < 6; i++) tone(ctx, out, { freq: 2200 + i * 120, t0: t + 0.2 + i * 0.03, dur: 0.04, gain: 0.03 * o.k });
    },
  },
  broken: {
    bus: 'sfx', max: 4, dur: 0.15,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.06, gain: 0.12 * o.k, freq: 900, q: 1.5 });
      tone(ctx, out, { freq: 120, freqEnd: 60, t0: t, dur: 0.15, gain: 0.1 * o.k });
    },
  },
  repair: {
    bus: 'sfx', max: 4, dur: 0.02,
    fn(ctx, out, t, o) {
      tone(ctx, out, { freq: 1800, t0: t, dur: 0.02, gain: 0.05 * o.k });
    },
  },
  bell: {
    bus: 'sfx', max: 2, dur: 1.6, steady: true,
    fn(ctx, out, t, o) {
      fmBell(ctx, out, { t0: t, freq: 587.33, ratio: 1.4, index: 5, indexEnd: 0.01, dur: 1.6, gain: 0.2 * o.k });
      noise(ctx, out, { t0: t, dur: 0.6, gain: 0.05 * o.k, filter: 'lowpass', freq: 4000, freqEnd: 400 });
    },
  },
  bell_empty: {
    bus: 'ui', max: 3, dur: 0.18,
    fn(ctx, out, t, o) {
      tone(ctx, out, { type: 'triangle', freq: 330, t0: t, dur: 0.08, gain: 0.08 * o.k });
      tone(ctx, out, { type: 'triangle', freq: 294, t0: t + 0.09, dur: 0.08, gain: 0.08 * o.k });
    },
  },
  boss: {
    bus: 'sfx', max: 1, dur: 2,
    fn(ctx, out, t, o) {
      const osc = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, t);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(400, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.12 * o.k, t + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc.connect(f);
      f.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 1.5);
      for (const fr of [140, 221, 317]) tone(ctx, out, { freq: fr, t0: t + 1.2, dur: 1.8, gain: 0.05 * o.k });
      noise(ctx, out, { t0: t + 1.2, dur: 0.4, gain: 0.08 * o.k, filter: 'lowpass', freq: 700 });
    },
  },
  star: {
    bus: 'sfx', max: 4, dur: 0.3,
    fn(ctx, out, t, o) {
      tone(ctx, out, { freq: 90, t0: t, dur: 0.08, gain: 0.2 * o.k });
      tone(ctx, out, { freq: mtof([72, 76, 79][o.n % 3]), t0: t + 0.02, dur: 0.28, gain: 0.1 * o.k });
      if (o.n >= 2) for (let i = 0; i < 4; i++) tone(ctx, out, { freq: 3000 + i * 500, t0: t + 0.08 + i * 0.03, dur: 0.03, gain: 0.03 * o.k });
    },
  },
  chest_tap: {
    bus: 'sfx', max: 8, dur: 0.06,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.025, gain: 0.14 * o.k, freq: 700 * (1 + o.n * 0.25), q: 3 });
    },
  },
  chest_open: {
    bus: 'sfx', max: 2, dur: 0.9,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.2, gain: 0.14 * o.k, filter: 'lowpass', freq: 5000, freqEnd: 600 });
      [0, 4, 7, 12, 16].forEach((st, i) => tone(ctx, out, { type: 'triangle', freq: mtof(65 + 12 + st), t0: t + 0.05 + i * 0.06, dur: 0.3, gain: 0.07 * o.k }));
      for (let i = 0; i < 8; i++) tone(ctx, out, { freq: 3000 + ((i * 271) % 2000), t0: t + 0.3 + i * 0.05, dur: 0.03, gain: 0.03 * o.k });
    },
  },
  card: {
    bus: 'sfx', max: 8, dur: 0.15,
    fn(ctx, out, t, o) {
      noise(ctx, out, { t0: t, dur: 0.06, gain: 0.06 * o.k, freq: 3000, q: 1.5 });
      tone(ctx, out, { freq: scaleNote('day', 7 + (o.n % 5)), t0: t + 0.02, dur: 0.12, gain: 0.07 * o.k });
    },
  },
  upgrade: {
    bus: 'sfx', max: 3, dur: 0.6,
    fn(ctx, out, t, o) {
      tone(ctx, out, { freq: 300, freqEnd: 1200, t0: t, dur: 0.25, gain: 0.08 * o.k });
      [0, 4, 7].forEach((st) => tone(ctx, out, { type: 'triangle', freq: mtof(77 + st), t0: t + 0.22, dur: 0.3, gain: 0.07 * o.k }));
      tone(ctx, out, { freq: 300, t0: t + 0.4, dur: 0.18, gain: 0.08 * o.k });
    },
  },
  level_up: {
    bus: 'sfx', max: 1, dur: 1.4,
    fn(ctx, out, t, o) {
      const notes = [65, 69, 72, 77, 72, 77];
      const times = [0, 0.12, 0.24, 0.36, 0.6, 0.72];
      notes.forEach((m, i) => {
        tone(ctx, out, { type: 'square', freq: mtof(m + 12), t0: t + times[i], dur: i === 5 ? 0.6 : 0.1, gain: 0.05 * o.k });
        tone(ctx, out, { type: 'triangle', freq: mtof(m), t0: t + times[i], dur: i === 5 ? 0.6 : 0.1, gain: 0.07 * o.k });
      });
    },
  },
  quest: {
    bus: 'sfx', max: 3, dur: 0.2,
    fn(ctx, out, t, o) {
      tone(ctx, out, { freq: 90, t0: t, dur: 0.08, gain: 0.16 * o.k });
      noise(ctx, out, { t0: t, dur: 0.05, gain: 0.08 * o.k, freq: 3000 });
    },
  },
};
