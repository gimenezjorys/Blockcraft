// Fort Boutique — briques de synthèse WebAudio : oscillateurs à enveloppe, bruit filtré, FM, notes de gamme.

/** Fréquence d'une note MIDI. */
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** Gammes (G21.1) en demi-tons depuis la tonique. */
export const SCALES = {
  // Jour : pentatonique de fa (fa, sol, la, do, ré).
  day: { root: 65, steps: [0, 2, 4, 7, 9] },
  // Nuit : ré dorien (ré, mi, fa, sol, la, si, do).
  night: { root: 62, steps: [0, 2, 3, 5, 7, 9, 10] },
};

/**
 * Note n de la gamme (n peut dépasser l'octave).
 * @param {'day' | 'night'} scale
 * @param {number} n degré (0 = tonique)
 * @param {number} [octave] décalage d'octave
 */
export function scaleNote(scale, n, octave = 0) {
  const s = SCALES[scale] || SCALES.day;
  const len = s.steps.length;
  const o = Math.floor(n / len);
  const d = ((n % len) + len) % len;
  return mtof(s.root + 12 * (o + octave) + s.steps[d]);
}

/** Enveloppe percussive sur un gain. */
export function env(param, t0, peak, attack, decay, sustain = 0, release = 0, hold = 0) {
  param.cancelScheduledValues(t0);
  param.setValueAtTime(0.0001, t0);
  param.linearRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
  if (sustain > 0) {
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak * sustain), t0 + attack + decay);
    param.setValueAtTime(Math.max(0.0002, peak * sustain), t0 + attack + decay + hold);
    param.exponentialRampToValueAtTime(0.0001, t0 + attack + decay + hold + Math.max(0.01, release));
  } else {
    param.exponentialRampToValueAtTime(0.0001, t0 + attack + Math.max(0.005, decay));
  }
}

/** Bruit blanc partagé (1 s, généré une fois par contexte). */
const noiseCache = new WeakMap();
export function noiseBuffer(ctx) {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = b.getChannelData(0);
    let s = 22222;
    for (let i = 0; i < data.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (s / 0x7fffffff) * 2 - 1;
    }
    noiseCache.set(ctx, b);
  }
  return b;
}

/**
 * Oscillateur avec enveloppe.
 * @returns {number} instant de fin (s)
 */
export function tone(ctx, out, { type = 'sine', freq = 440, freqEnd, t0, dur = 0.1, gain = 0.2, attack = 0.005, detune = 0, sustain = 0, release = 0 }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
  if (detune) o.detune.setValueAtTime(detune, t0);
  env(g.gain, t0, gain, attack, sustain > 0 ? dur * 0.3 : dur, sustain, release, sustain > 0 ? dur * 0.7 : 0);
  o.connect(g);
  g.connect(out);
  o.start(t0);
  const end = t0 + attack + dur + release + 0.05;
  o.stop(end);
  return end;
}

/**
 * Bruit filtré avec enveloppe.
 * @returns {number}
 */
export function noise(ctx, out, { t0, dur = 0.05, gain = 0.2, filter = 'bandpass', freq = 1000, freqEnd, q = 1, attack = 0.002 }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t0);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
  f.Q.setValueAtTime(q, t0);
  const g = ctx.createGain();
  env(g.gain, t0, gain, attack, dur);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t0, (t0 * 7.13) % 0.8);
  const end = t0 + dur + 0.05;
  src.stop(end);
  return end;
}

/**
 * Cloche FM : porteuse + modulatrice (ratio), indice qui retombe.
 * @returns {number}
 */
export function fmBell(ctx, out, { t0, freq = 880, ratio = 1.4, index = 3, indexEnd = 0, dur = 0.6, gain = 0.2 }) {
  const car = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  const g = ctx.createGain();
  car.frequency.setValueAtTime(freq, t0);
  mod.frequency.setValueAtTime(freq * ratio, t0);
  modGain.gain.setValueAtTime(freq * index, t0);
  modGain.gain.exponentialRampToValueAtTime(Math.max(0.01, freq * Math.max(0.001, indexEnd)), t0 + dur);
  env(g.gain, t0, gain, 0.003, dur);
  mod.connect(modGain);
  modGain.connect(car.frequency);
  car.connect(g);
  g.connect(out);
  car.start(t0);
  mod.start(t0);
  const end = t0 + dur + 0.05;
  car.stop(end);
  mod.stop(end);
  return end;
}
