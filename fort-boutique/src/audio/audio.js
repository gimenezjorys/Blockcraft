// Fort Boutique — contexte audio, bus et mixage (B11, G21.3, G21.4). Aucun son avant le premier geste.
import { SFX } from './sfx.js';
import { perfNow } from '../core/time.js';
import { listen } from '../core/events.js';

const MIX = { master: 0.8, music: 0.32, sfx: 0.7, ui: 0.5 };
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
    music.connect(master);
    buses = { master, comp, sfx, ui, music };
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
