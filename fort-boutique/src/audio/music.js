// Fort Boutique — séquenceur musical procédural (G21.2) : planification « juste à temps » sur l'horloge audio, pilotée
// par la boucle du jeu (aucun minuteur). Ambiances écrites dans data/audio.js ; couches selon l'action ; aube et
// crépuscule en jingles. Rien ne joue avant le premier geste (le contexte audio n'existe pas encore).
import { tone, noise, fmBell, mtof, SCALES } from './synth.js';
import { MOODS, MOTIFS, DAWN_ARP, INSTR_GAIN as G } from '../data/audio.js';

/** Avance de planification (s). */
const AHEAD = 0.25;

/**
 * @param {ReturnType<import('./audio.js').createAudio>} audio
 */
export function createMusic(audio) {
  let mood = null;
  let pending = null;
  let layer = 1;
  let step = 0;
  let nextT = 0;
  let seed = 7;
  let lastDawn = -1;
  const state = { mood: null, layer: 1, notes: 0 };

  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  /** Note MIDI du degré `deg` de la gamme de l'ambiance, depuis `root`. */
  function degree(def, deg, root) {
    const steps = SCALES[def.scale].steps;
    const len = steps.length;
    const o = Math.floor(deg / len);
    const d = ((deg % len) + len) % len;
    // La tonique de la gamme (fa ou ré) + l'octave demandée par root.
    const tonic = SCALES[def.scale].root % 12;
    const base = root - (((root % 12) - tonic + 12) % 12);
    return base + 12 * o + steps[d];
  }

  // Instruments (G21.2), tous construits avec les briques de synth.js.
  const I = {
    bass(ctx, out, t, m, dur) {
      tone(ctx, out, { type: 'triangle', freq: mtof(m - 12), t0: t, dur, gain: G.bass, attack: 0.005 });
      tone(ctx, out, { type: 'sine', freq: mtof(m - 24), t0: t, dur, gain: G.sub, attack: 0.005 });
    },
    marimba(ctx, out, t, m) {
      fmBell(ctx, out, { t0: t, freq: mtof(m), ratio: 4, index: 1.2, indexEnd: 0.05, dur: 0.35, gain: G.marimba });
    },
    piano(ctx, out, t, chord) {
      for (const m of chord) {
        tone(ctx, out, { type: 'triangle', freq: mtof(m + 12), t0: t, dur: 0.18, gain: G.piano, attack: 0.01, detune: 6, release: 0.3 });
        tone(ctx, out, { type: 'triangle', freq: mtof(m + 12), t0: t, dur: 0.18, gain: G.piano * 0.7, attack: 0.01, detune: -6, release: 0.3 });
      }
    },
    shaker(ctx, out, t, accent) {
      noise(ctx, out, { t0: t, dur: 0.03, gain: G.shaker * (accent ? 1.6 : 1), filter: 'bandpass', freq: 7000, q: 1.2 });
    },
    clap(ctx, out, t) {
      for (const d of [0, 0.01, 0.022]) noise(ctx, out, { t0: t + d, dur: 0.012, gain: G.clap, filter: 'bandpass', freq: 1500, q: 1 });
    },
    musicbox(ctx, out, t, m) {
      tone(ctx, out, { type: 'sine', freq: mtof(m), t0: t, dur: 1.2, gain: G.musicbox, attack: 0.003 });
      tone(ctx, out, { type: 'sine', freq: mtof(m) * 3, t0: t, dur: 0.5, gain: G.musicbox * 0.22, attack: 0.003 });
    },
    pizz(ctx, out, t, m) {
      tone(ctx, out, { type: 'triangle', freq: mtof(m - 12), t0: t, dur: 0.15, gain: G.pizz, attack: 0.004 });
    },
    pad(ctx, out, t, chord, dur) {
      for (const m of chord) {
        for (const det of [-8, 8]) tone(ctx, out, { type: 'triangle', freq: mtof(m), t0: t, dur, gain: G.pad, attack: 0.6, detune: det, sustain: 0.8, release: 0.9 });
      }
    },
    tom(ctx, out, t, f) {
      tone(ctx, out, { type: 'sine', freq: f, freqEnd: f / 2, t0: t, dur: 0.12, gain: G.tom });
      noise(ctx, out, { t0: t, dur: 0.03, gain: G.tom * 0.3, filter: 'lowpass', freq: 900 });
    },
    timpani(ctx, out, t) {
      tone(ctx, out, { type: 'sine', freq: 90, freqEnd: 55, t0: t, dur: 0.4, gain: G.timpani });
      noise(ctx, out, { t0: t, dur: 0.06, gain: G.timpani * 0.25, filter: 'lowpass', freq: 500 });
    },
    choir(ctx, out, t, chord, dur) {
      // « Chœur » : voyelle tenue (deux formants approchés par deux triangles à la quinte et à l'octave).
      for (const m of chord.slice(0, 3)) {
        tone(ctx, out, { type: 'sawtooth', freq: mtof(m), t0: t, dur, gain: G.choir, attack: 0.4, sustain: 0.7, release: 0.6 });
      }
    },
  };

  /** Une croche de l'ambiance courante. */
  function scheduleStep(ctx, out, t, def, s) {
    const inBar = s % 8;
    const bar = Math.floor(s / 8) % def.chords.length;
    const chord = def.chords[bar];
    const motif = MOTIFS[def.parts[Math.floor(s / 16) % def.parts.length]];
    const deg = motif[s % 16];
    const beat = 60 / def.bpm;
    const m = mood;
    if (m === 'title') {
      if (deg !== null && s % 2 === 0) I.musicbox(ctx, out, t, degree(def, deg, def.melodyRoot));
      return;
    }
    if (m === 'morning') {
      if (inBar === 0) I.bass(ctx, out, t, chord[0], beat * 1.6);
      if (inBar === 3 || inBar === 7) I.piano(ctx, out, t, chord);
      if (deg !== null && Math.floor(s / 16) % 2 === 0) I.marimba(ctx, out, t, degree(def, deg, def.melodyRoot));
      return;
    }
    if (m === 'day') {
      if (inBar === 0 || inBar === 4) I.bass(ctx, out, t, chord[inBar === 0 ? 0 : 2 % chord.length], beat * 0.9);
      if (inBar % 2 === 1) I.piano(ctx, out, t, chord);
      I.shaker(ctx, out, t, inBar % 2 === 0);
      if (layer >= 2 && deg !== null) {
        // Variation à graine : parfois l'octave du dessus.
        const up = rnd() < 0.15 ? 12 : 0;
        I.marimba(ctx, out, t, degree(def, deg, def.melodyRoot) + up);
      }
      if (layer >= 3) {
        if (inBar === 2 || inBar === 6) I.clap(ctx, out, t);
        if (inBar % 2 === 0) I.pizz(ctx, out, t, chord[(inBar / 2) % chord.length] + 12);
      }
      return;
    }
    // Nuit et boss.
    if (inBar === 0) I.pad(ctx, out, t, chord, beat * 4);
    if (layer <= 1 || m === 'boss') {
      if (deg !== null && s % 2 === 0) I.musicbox(ctx, out, t, degree(def, deg, def.melodyRoot));
    }
    if (layer >= 2 || m === 'boss') {
      if (inBar % 2 === 0) I.pizz(ctx, out, t, chord[(inBar / 2) % chord.length]);
      if (inBar === 0 || inBar === 5) I.tom(ctx, out, t, inBar === 0 ? 140 : 110);
    }
    if (m === 'boss') {
      if (inBar === 0 || inBar === 4) I.timpani(ctx, out, t);
      if (inBar === 0 && bar % 2 === 0) I.choir(ctx, out, t, chord, beat * 7);
    }
  }

  /** Jingles : aube (arpège + oiseaux + cocorico) et crépuscule (cloche dans la tonalité). */
  function jingle(kind, o = {}) {
    const ctx = audio.context();
    const b = audio.buses();
    if (!ctx || !b || audio.muted) return;
    const out = b.music;
    const t = ctx.currentTime + 0.05;
    if (kind === 'dusk') {
      fmBell(ctx, out, { t0: t, freq: mtof(74), ratio: 1.4, index: 3, dur: 1.6, gain: 0.12 });
      return;
    }
    DAWN_ARP.forEach((m, i) => I.musicbox(ctx, out, t + i * 0.18, m));
    for (let k = 0; k < 3; k++) tone(ctx, out, { type: 'sine', freq: 2400, freqEnd: 3200, t0: t + 0.9 + k * 0.22, dur: 0.08, gain: 0.04 });
    if (o.rooster) audio.play('rooster', { at: 1.6 });
  }

  /** Ambiance voulue d'après l'écran et la phase (appelé à chaque pas). */
  function wanted(g, screen) {
    if (screen === 'title' || !g) return 'title';
    const ph = g.phase.name;
    if (ph === 'day' || ph === 'closing') return 'day';
    if (ph === 'dusk') return 'dusk';
    if (ph === 'night') {
      const n = g.night;
      const boss = n && n.monsters && n.monsters.active.some((m) => m.def.boss);
      return boss ? 'boss' : 'night';
    }
    if (ph === 'dawn') return 'dawn';
    return 'morning';
  }

  function layerFor(g, want) {
    if (!g) return 1;
    if (want === 'day') {
      const d = g.day;
      if (d && (d.rush || (d.order && d.order.waiting))) return 3;
      return d && d.customers && d.customers.length >= 2 ? 2 : 1;
    }
    if (want === 'night' || want === 'boss') {
      const n = g.night;
      const alive = n && n.monsters ? n.monsters.active.length : 0;
      return alive >= 6 ? 2 : 1;
    }
    return 1;
  }

  const music = {
    state,
    /**
     * À chaque pas de la boucle : choisit l'ambiance et planifie les notes des 250 ms à venir.
     * @param {any} g partie (ou null) ; @param {string} screen écran de base
     */
    update(g, screen) {
      const ctx = audio.context();
      const b = audio.buses();
      if (!ctx || !b) return;
      const want = wanted(g, screen);
      if (want === 'dawn' || want === 'dusk') {
        // Jingle une fois par aube / crépuscule, puis silence jusqu'à l'ambiance suivante.
        const key = `${want}|${g ? g.save.stats.nights : 0}`;
        if (lastDawn !== key) {
          lastDawn = key;
          jingle(want, { rooster: want === 'dawn' && g && g.save.settings.rooster !== false });
        }
        mood = null;
        pending = null;
        state.mood = want;
        return;
      }
      layer = layerFor(g, want);
      state.layer = layer;
      if (want !== mood) {
        // Changement calé sur la mesure (ou tout de suite si rien ne jouait).
        if (!mood || step % 8 === 0) {
          mood = want;
          step = 0;
          nextT = Math.max(nextT, ctx.currentTime + 0.05);
          pending = null;
        } else pending = want;
      }
      state.mood = mood;
      if (!mood || audio.muted) {
        nextT = ctx.currentTime + 0.05;
        return;
      }
      const def = MOODS[mood];
      const eighth = 60 / def.bpm / 2;
      // Après une longue pause (onglet caché), on repart de maintenant.
      if (nextT < ctx.currentTime - 0.5) nextT = ctx.currentTime + 0.05;
      while (nextT < ctx.currentTime + AHEAD) {
        if (pending && step % 8 === 0) {
          mood = pending;
          pending = null;
          step = 0;
          break;
        }
        // Swing : les croches paires durent un peu plus.
        const sw = step % 2 === 0 ? def.swing : 1 - def.swing;
        try {
          scheduleStep(ctx, b.music, nextT, def, step);
          state.notes++;
        } catch {
          /* un nœud refusé ne doit jamais casser le jeu */
        }
        nextT += eighth * 2 * sw;
        step++;
      }
    },
    /** Remet le séquenceur à zéro (nouvelle partie). */
    reset() {
      mood = null;
      pending = null;
      step = 0;
      lastDawn = -1;
    },
  };
  return music;
}
