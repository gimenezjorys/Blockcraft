// Fort Boutique — contexte audio, bus et mixage (B11, G21.3, G21.4). Aucun son avant le premier geste.
import { SFX } from './sfx.js';
import { perfNow } from '../core/time.js';
import { listen } from '../core/events.js';

// v1.1 (V9) : musique à 0,28 avec le réglage par défaut (0,8 × 0,35).
const MIX = { master: 0.8, music: 0.35, sfx: 0.7, ui: 0.5 };
/** Gros sons sous lesquels la musique baisse de 5 dB pendant 350 ms (G21.3). */
const DUCK = new Set(['chest_open', 'level_up', 'boss', 'bell', 'star']);
const DUCK_K = Math.pow(10, -5 / 20);
/** Réverbération (G21.3) : envois musique et effets. */
const SEND = { music: 0.18, sfx: 0.08 };

/** Réponse impulsionnelle générée : bruit stéréo, décroissance exponentielle de 1,4 s, pré-délai 15 ms. */
function impulse(ctx) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * 1.4);
  const b = ctx.createBuffer(2, len, rate);
  let s = 4242;
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < len; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const pre = i < rate * 0.015 ? 0 : 1;
      d[i] = pre * ((s / 0x7fffffff) * 2 - 1) * Math.exp((-6 * i) / len);
    }
  }
  return b;
}
const MAX_VOICES = 24;

/**
 * @param {Window & typeof globalThis} win
 */
export function createAudio(win) {
  /** @type {AudioContext | null} */
  let ctx = null;
  let buses = null;
  const mutes = new Set();
  const settings = { music: 0.8, sfx: 0.9 };
  const lastAt = new Map();
  const variant = new Map();
  let voices = [];
  let rnd = 12345;
  const stats = { played: 0, skipped: 0 };
  const unlisten = [];

  function rand() {
    rnd = (rnd * 1664525 + 1013904223) >>> 0;
    return rnd / 4294967296;
  }

  function build() {
    const master = ctx.createGain();
    master.gain.value = MIX.master;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.005;
    comp.release.value = 0.12;
    master.connect(comp);
    comp.connect(ctx.destination);
    const sfx = ctx.createGain();
    const ui = ctx.createGain();
    const music = ctx.createGain();
    sfx.connect(master);
    ui.connect(master);
    // v1.1 (V9) : bus musique → saturation douce (WaveShaper) → filtre « chaleur » au-dessus de 9 kHz → sortie.
    let musicOut = music;
    try {
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      const k = 1.6;
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(k * x) / Math.tanh(k);
      }
      shaper.curve = curve;
      const warm = ctx.createBiquadFilter();
      warm.type = 'lowpass';
      warm.frequency.value = 9000;
      warm.Q.value = 0.5;
      music.connect(shaper);
      shaper.connect(warm);
      musicOut = warm;
    } catch {
      /* sans saturation */
    }
    musicOut.connect(master);
    // Réverbération partagée (si le navigateur la refuse, on s'en passe).
    let verbIn = null;
    try {
      const verb = ctx.createConvolver();
      verb.buffer = impulse(ctx);
      verb.connect(master);
      verbIn = verb;
      for (const [k, v] of Object.entries(SEND)) {
        const send = ctx.createGain();
        send.gain.value = v;
        (k === 'music' ? music : sfx).connect(send);
        send.connect(verb);
      }
    } catch {
      /* sans réverbération */
    }
    // verb : entrée de la réverbération partagée (envoi de plus pour la boîte à musique de l'écran titre).
    buses = { master, comp, sfx, ui, music, verb: verbIn };
    applyVolumes();
  }

  function applyVolumes() {
    if (!buses) return;
    const muted = mutes.size > 0;
    const t = ctx.currentTime;
    buses.master.gain.setTargetAtTime(muted ? 0 : MIX.master, t, 0.03);
    buses.sfx.gain.setTargetAtTime(MIX.sfx * settings.sfx, t, 0.03);
    buses.ui.gain.setTargetAtTime(MIX.ui * settings.sfx, t, 0.03);
    buses.music.gain.setTargetAtTime(MIX.music * settings.music, t, 0.03);
  }

  const audio = {
    stats,
    /** Crée ou relance le contexte (au premier geste, B11). */
    unlock() {
      const AC = win.AudioContext || win.webkitAudioContext;
      if (!AC) return false;
      try {
        if (!ctx) {
          ctx = new AC();
          build();
        }
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        return true;
      } catch {
        ctx = null;
        return false;
      }
    },
    /** Écoute les premiers gestes pour débloquer l'audio. */
    attach() {
      const f = () => audio.unlock();
      for (const type of ['pointerup', 'touchend', 'click', 'keydown', 'mousedown']) unlisten.push(listen(win, type, f, { capture: true, passive: true }));
    },
    get ready() {
      return !!ctx;
    },
    context: () => ctx,
    buses: () => buses,
    /**
     * Joue un effet.
     * @param {string} id
     * @param {{ n?: number, gain?: number, at?: number }} [o] n : rang dans un combo
     */
    play(id, o = {}) {
      const r = SFX[id];
      if (!ctx || !buses || !r || mutes.size) return false;
      const now = perfNow();
      const minGap = 1000 / r.max;
      const last = lastAt.get(id) || -1e9;
      if (now - last < minGap) {
        stats.skipped++;
        return false;
      }
      const t = ctx.currentTime + (o.at || 0);
      voices = voices.filter((end) => end > ctx.currentTime);
      if (voices.length >= MAX_VOICES) {
        stats.skipped++;
        return false;
      }
      lastAt.set(id, now);
      const v = (variant.get(id) || 0) + 1;
      variant.set(id, v);
      const pitchVar = r.steady ? 0.005 : 0.03;
      const db = r.steady ? 0.3 : 1.5;
      const k = (o.gain ?? 1) * Math.pow(10, ((rand() * 2 - 1) * db) / 20);
      const bus = buses[r.bus] || buses.sfx;
      // Variation de hauteur : on passe par un nœud de gain unique et on décale le temps de la voix.
      const voiceOut = ctx.createGain();
      voiceOut.gain.value = 1;
      voiceOut.connect(bus);
      try {
        r.fn(ctx, voiceOut, t, { v, n: o.n || 0, k, pitch: 1 + (rand() * 2 - 1) * pitchVar });
      } catch {
        return false;
      }
      voices.push(t + r.dur + 0.1);
      stats.played++;
      if (DUCK.has(id)) {
        const level = MIX.music * settings.music;
        buses.music.gain.setTargetAtTime(level * DUCK_K, t, 0.02);
        buses.music.gain.setTargetAtTime(level, t + 0.35, 0.08);
      }
      return true;
    },
    /** @param {{ music?: number, sfx?: number }} s */
    setVolumes(s) {
      if (typeof s.music === 'number') settings.music = s.music;
      if (typeof s.sfx === 'number') settings.sfx = s.sfx;
      applyVolumes();
    },
    /** Coupe le son (onglet caché, pub…). */
    mute(reason) {
      mutes.add(reason);
      applyVolumes();
    },
    unmute(reason) {
      mutes.delete(reason);
      applyVolumes();
    },
    get muted() {
      return mutes.size > 0;
    },
    dispose() {
      for (const u of unlisten) u();
    },
  };
  return audio;
}
