// Fort Boutique — la musique (v1.1, V9) : un vrai thème écrit (data/music-score.js) joué partout avec des habillages
// différents. Planification « juste à temps » sur l'horloge audio, pilotée par la boucle du jeu (aucun minuteur).
// Instruments faits par le code : ukulélé (Karplus-Strong pré-rendu), glockenspiel, sifflement, piano électrique FM,
// marimba, boîte à musique, contrebasse, batterie légère ; la nuit : pizzicato, nappe, toms, timbales, chœur.
// Rien ne joue avant le premier geste (le contexte audio n'existe pas encore).
import { tone, noise, fmBell, mtof } from './synth.js';
import { THEME, CHORDS, UKE, STRUM, TEMPO, VOICE_GAIN as G, PAN, parseBar } from '../data/music-score.js';

/** Avance de planification (s). */
const AHEAD = 0.25;
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PARTS = { A: THEME.A.melody.map(parseBar), B: THEME.B.melody.map(parseBar) };

/** Transpose une note d'une gamme à l'autre degré par degré (fa majeur → ré mineur ou ré majeur). */
function mapScale(midi, toRoot, toSteps) {
  const fromRoot = 65;
  const rel = midi - fromRoot;
  const oct = Math.floor(rel / 12);
  const pc = ((rel % 12) + 12) % 12;
  let deg = MAJOR.indexOf(pc);
  let alt = 0;
  if (deg < 0) {
    deg = MAJOR.indexOf(pc - 1);
    alt = 1;
  }
  return toRoot + 12 * oct + toSteps[deg] + alt;
}

/** Notes qui commencent à la croche `e` (0 à 7) d'une mesure. */
function startsAt(bar, e) {
  const at = e * 0.5;
  return bar.filter((n) => n.midi !== null && Math.abs(n.at - at) < 1e-6);
}

/**
 * Forme d'une boucle (liste de mesures). role : intro | A | B | A2 | bridge | turn | breath.
 * @param {string} mood
 * @param {number} loop numéro de boucle (habillages et respiration)
 */
function form(mood, loop) {
  const bars = [];
  const add = (part, from, n, role) => {
    for (let i = 0; i < n; i++) bars.push({ part, bar: from + i, role });
  };
  if (mood === 'title') add('A', 0, 8, 'A');
  else if (mood === 'morning') {
    add('A', 0, 8, 'A');
    add('B', 0, 8, 'B');
  } else if (mood === 'day') {
    // Une boucle sur quatre commence par une respiration de 8 mesures (ukulélé et sifflement seuls).
    if (loop % 4 === 3) add('A', 0, 8, 'breath');
    // 36 mesures : intro (4) → A → B → A' → pont (4) → reprise des 4 dernières de A.
    add('A', 0, 4, 'intro');
    add('A', 0, 8, 'A');
    add('B', 0, 8, 'B');
    add('A', 0, 8, 'A2');
    add('B', 4, 4, 'bridge');
    add('A', 4, 4, 'turn');
  } else {
    add('A', 0, 8, 'A');
    add('B', 0, 8, 'B');
  }
  return bars;
}

/** Accord d'une mesure selon l'ambiance (la nuit : ré mineur). */
function chordOf(mood, b) {
  if (mood === 'night' || mood === 'boss') return (b.part === 'A' ? THEME.nightChords : THEME.nightChordsB)[b.bar];
  return THEME[b.part].chords[b.bar];
}

/**
 * @param {ReturnType<import('./audio.js').createAudio>} audio
 */
export function createMusic(audio) {
  let mood = null;
  let pending = null;
  let layer = 1;
  let step = 0;
  let nextT = 0;
  let loop = 0;
  let bars = [];
  let lastDawn = -1;
  let lastWhistle = 0;
  const state = { mood: null, layer: 1, notes: 0, loop: 0, skin: 0 };
  // Nœuds propres à un contexte audio : panoramiques, filtre de la contrebasse, ukulélé pré-rendu.
  let nodes = null;
  function ensureNodes(ctx, out) {
    if (nodes && nodes.ctx === ctx && nodes.out === out) return nodes;
    const pan = (v) => {
      try {
        const p = ctx.createStereoPanner();
        p.pan.value = v;
        p.connect(out);
        return p;
      } catch {
        return out;
      }
    };
    const bassLp = ctx.createBiquadFilter();
    bassLp.type = 'lowpass';
    bassLp.frequency.value = 700;
    bassLp.connect(out);
    nodes = { ctx, out, uke: pan(PAN.uke), epiano: pan(PAN.epiano), counter: pan(PAN.counter), bass: bassLp, uBuf: new Map() };
    return nodes;
  }

  /** Ukulélé : Karplus-Strong (bruit de 10 ms, rétroaction 0,985, passe-bas 3 kHz dans la boucle), rendu une fois. */
  function ukeBuffer(ctx, midi) {
    const n = nodes;
    if (n.uBuf.has(midi)) return n.uBuf.get(midi);
    const sr = 22050;
    const len = Math.round(sr * 1.2);
    let buf = null;
    try {
      buf = ctx.createBuffer(1, len, sr);
    } catch {
      n.uBuf.set(midi, null);
      return null;
    }
    const out = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / mtof(midi)));
    const line = new Float32Array(N);
    const a = Math.exp((-2 * Math.PI * 3000) / sr);
    const burst = Math.round(sr * 0.01);
    let seed = (midi * 2654435761) >>> 0;
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const k = i % N;
      let x = 0;
      if (i < burst) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        x = (seed / 4294967296) * 2 - 1;
      }
      lp = (1 - a) * line[k] + a * lp;
      const y = x + 0.985 * lp;
      line[k] = y;
      // Petite rampe de fin : pas de clic.
      out[i] = y * 0.45 * (i > len - 600 ? (len - i) / 600 : 1);
    }
    n.uBuf.set(midi, buf);
    return buf;
  }

  // ---------- Instruments ----------
  const I = {
    uke(ctx, t, chord, up, accent) {
      const notes = UKE[chord] || UKE.F;
      const order = up ? [...notes].reverse() : notes;
      order.forEach((m, i) => {
        const buf = ukeBuffer(ctx, m);
        if (!buf) return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = G.uke * (accent ? 1.3 : 1) * (up ? 0.75 : 1);
        src.connect(g);
        g.connect(nodes.uke);
        src.start(t + i * 0.012);
        src.stop(t + i * 0.012 + 1.2);
      });
    },
    glock(ctx, out, t, m, dur) {
      const f = mtof(m);
      tone(ctx, out, { type: 'sine', freq: f, t0: t, dur: Math.max(0.8, dur), gain: G.glock, attack: 0.002 });
      tone(ctx, out, { type: 'sine', freq: f * 2.76, t0: t, dur: 0.35, gain: G.glock * 0.35, attack: 0.002 });
      tone(ctx, out, { type: 'sine', freq: f * 5.4, t0: t, dur: 0.15, gain: G.glock * 0.15, attack: 0.002 });
    },
    whistle(ctx, out, t, m, dur) {
      const f = mtof(m);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      // Glissé de 30 ms depuis la note d'avant.
      o.frequency.setValueAtTime(lastWhistle > 0 ? lastWhistle : f, t);
      o.frequency.linearRampToValueAtTime(f, t + 0.03);
      lastWhistle = f;
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.value = f * (2 ** (12 / 1200) - 1);
      lfo.connect(depth);
      depth.connect(o.frequency);
      const end = t + dur;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(G.whistle, t + 0.04);
      g.gain.setValueAtTime(G.whistle, Math.max(t + 0.05, end - 0.06));
      g.gain.linearRampToValueAtTime(0, end + 0.02);
      o.connect(g);
      g.connect(out);
      o.start(t);
      lfo.start(t);
      o.stop(end + 0.05);
      lfo.stop(end + 0.05);
      // Souffle léger autour du double de la fréquence.
      noise(ctx, out, { t0: t, dur: Math.min(0.25, dur), gain: G.breath, filter: 'bandpass', freq: f * 2, q: 4 });
    },
    epiano(ctx, t, m, dur) {
      // FM (ratio 1, indice 1,5 qui retombe) et trémolo stéréo à 4 Hz.
      let target = nodes.epiano;
      try {
        const p = ctx.createStereoPanner();
        p.pan.value = PAN.epiano;
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = 4;
        lg.gain.value = 0.3;
        lfo.connect(lg);
        lg.connect(p.pan);
        p.connect(nodes.out);
        lfo.start(t);
        lfo.stop(t + Math.max(0.7, dur) + 0.1);
        target = p;
      } catch {
        /* sans trémolo */
      }
      fmBell(ctx, target, { t0: t, freq: mtof(m), ratio: 1, index: 1.5, indexEnd: 0.1, dur: Math.max(0.7, dur), gain: G.epiano });
    },
    marimba(ctx, out, t, m) {
      fmBell(ctx, out, { t0: t, freq: mtof(m), ratio: 4, index: 1.2, indexEnd: 0.05, dur: 0.35, gain: G.marimba });
    },
    musicbox(ctx, out, t, m) {
      tone(ctx, out, { type: 'sine', freq: mtof(m), t0: t, dur: 1.2, gain: G.musicbox, attack: 0.003 });
      tone(ctx, out, { type: 'sine', freq: mtof(m) * 3, t0: t, dur: 0.5, gain: G.musicbox * 0.22, attack: 0.003 });
    },
    bass(ctx, t, m, dur) {
      const out = nodes.bass;
      tone(ctx, out, { type: 'triangle', freq: mtof(m), t0: t, dur, gain: G.bass, attack: 0.004 });
      tone(ctx, out, { type: 'sine', freq: mtof(m), t0: t, dur, gain: G.bass * 0.6, attack: 0.004 });
      noise(ctx, out, { t0: t, dur: 0.02, gain: G.pluck, filter: 'bandpass', freq: 1200, q: 1 });
    },
    kick(ctx, out, t) {
      tone(ctx, out, { type: 'sine', freq: 120, freqEnd: 50, t0: t, dur: 0.12, gain: G.kick, attack: 0.002 });
    },
    rim(ctx, out, t) {
      noise(ctx, out, { t0: t, dur: 0.06, gain: G.rim, filter: 'bandpass', freq: 1800, q: 2 });
      tone(ctx, out, { type: 'triangle', freq: 330, t0: t, dur: 0.02, gain: G.rim * 0.8, attack: 0.001 });
    },
    shaker(ctx, out, t, accent) {
      noise(ctx, out, { t0: t, dur: 0.03, gain: G.shaker * (accent ? 1.6 : 1), filter: 'bandpass', freq: 7000, q: 1.2 });
    },
    clap(ctx, out, t) {
      for (const d of [0, 0.01, 0.022]) noise(ctx, out, { t0: t + d, dur: 0.012, gain: G.clap, filter: 'bandpass', freq: 1500, q: 1 });
    },
    hat(ctx, out, t) {
      noise(ctx, out, { t0: t, dur: 0.16, gain: G.hat, filter: 'highpass', freq: 8000, q: 0.7 });
    },
    pizz(ctx, out, t, m) {
      tone(ctx, out, { type: 'triangle', freq: mtof(m - 12), t0: t, dur: 0.15, gain: G.pizz, attack: 0.004 });
    },
    pad(ctx, out, t, notes, dur) {
      for (const m of notes) {
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
    choir(ctx, out, t, notes, dur) {
      for (const m of notes.slice(0, 3)) tone(ctx, out, { type: 'sawtooth', freq: mtof(m), t0: t, dur, gain: G.choir, attack: 0.4, sustain: 0.7, release: 0.6 });
    },
    bird(ctx, out, t) {
      for (let k = 0; k < 3; k++) tone(ctx, out, { type: 'sine', freq: 2400, freqEnd: 3200, t0: t + k * 0.16, dur: 0.08, gain: G.bird });
    },
  };

  /** Habillage du jour (3 qui tournent) : instrument de tête et contre-chant. */
  const skinOf = (l) => l % 3;

  /** Une croche de la boucle courante. */
  function scheduleStep(ctx, out, t, s, beat) {
    if (!bars.length) bars = form(mood, loop);
    const bi = Math.floor(s / 8);
    const b = bars[bi % bars.length];
    const e = s % 8;
    const chord = chordOf(mood, b);
    const C = CHORDS[chord] || CHORDS.F;
    const nextB = bars[(bi + 1) % bars.length];
    const next = CHORDS[chordOf(mood, nextB)] || C;
    const role = b.role;
    const melodyOn = role !== 'intro' && role !== 'bridge';
    const night = mood === 'night' || mood === 'boss';
    const notes = melodyOn ? startsAt(PARTS[b.part][b.bar], e) : [];
    const pitch = (m) => (night ? mapScale(m, 62, MINOR) : m);
    const bassLine = () => {
      if (e === 0) I.bass(ctx, t, C.root, beat * 1.6);
      else if (e === 4) I.bass(ctx, t, C.root + 7, beat * 1.4);
      else if (e === 7 && next.root !== C.root) I.bass(ctx, t, next.root - 1, beat * 0.45);
    };
    const strum = () => {
      const k = STRUM[e];
      if (k) I.uke(ctx, t, chord, k === 'U', e === 2 || e === 6);
    };
    if (mood === 'title') {
      for (const n of notes) {
        I.musicbox(ctx, out, t, n.midi);
        // Réverbération large : un envoi de plus vers la réverbération partagée.
        const v = audio.buses() && audio.buses().verb;
        if (v) I.musicbox(ctx, v, t, n.midi);
      }
      return;
    }
    if (mood === 'morning') {
      strum();
      bassLine();
      for (const n of notes) I.whistle(ctx, out, t, n.midi, n.dur * beat);
      return;
    }
    if (mood === 'day') {
      const skin = skinOf(loop);
      state.skin = skin;
      const full = role === 'A2' || role === 'turn';
      const drums = role === 'bridge' || full || layer >= 2;
      if (role !== 'bridge') strum();
      if (role !== 'intro' && role !== 'breath') bassLine();
      // Mélodie.
      for (const n of notes) {
        const d = n.dur * beat;
        if (role === 'breath') I.whistle(ctx, out, t, n.midi, d);
        else if (role === 'B' && skin !== 2) I.marimba(ctx, out, t, n.midi);
        else if (skin === 0) I.glock(ctx, out, t, n.midi, d);
        else if (skin === 1) {
          I.marimba(ctx, out, t, n.midi);
          I.whistle(ctx, out, t, n.midi + 12, d);
        } else I.epiano(ctx, t, n.midi, d);
      }
      // Contre-chant de glockenspiel en arpèges (B, et l'habillage 3 ; tout le monde en A').
      const counter = role === 'B' || (skin === 2 && melodyOn && role !== 'breath') || (full && layer >= 2);
      if (counter && e % 2 === 1) I.glock(ctx, nodes.counter, t, C.notes[(e >> 1) % C.notes.length] + 24, 0.4);
      if (drums && role !== 'breath' && role !== 'intro') {
        if (e === 0 || e === 4 || (full && e === 3)) I.kick(ctx, out, t);
        if (e === 2 || e === 6) I.rim(ctx, out, t);
        I.shaker(ctx, out, t, e % 2 === 0);
        if ((full || layer >= 3) && (e === 2 || e === 6)) I.clap(ctx, out, t);
        if ((full || layer >= 3 || role === 'bridge') && e === 7 && b.bar % 2 === 1) I.hat(ctx, out, t);
      }
      return;
    }
    // Nuit et boss : ré mineur, boîte à musique + pizzicato + nappe ; toms pendant les vagues.
    if (e === 0) I.pad(ctx, out, t, C.notes, beat * 4);
    for (const n of notes) I.musicbox(ctx, out, t, pitch(n.midi));
    if (e % 2 === 0) I.pizz(ctx, out, t, C.notes[(e >> 1) % C.notes.length]);
    if (layer >= 2 || mood === 'boss') {
      if (e === 0 || e === 5) I.tom(ctx, out, t, e === 0 ? 140 : 110);
    }
    if (mood === 'boss') {
      if (e === 0 || e === 4) I.timpani(ctx, out, t);
      if (e === 0 && b.bar % 2 === 0) I.choir(ctx, out, t, C.notes, beat * 7);
    }
  }

  /** Jingles : aube (les 4 dernières mesures de A en ré majeur, boîte à musique + oiseaux) et crépuscule. */
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
    const beat = 60 / TEMPO.dawn;
    for (let k = 0; k < 4; k++) {
      for (const n of PARTS.A[4 + k]) {
        if (n.midi !== null) I.musicbox(ctx, out, t + (k * 4 + n.at) * beat, mapScale(n.midi, 62, MAJOR));
      }
    }
    I.bird(ctx, out, t + 0.9);
    I.bird(ctx, out, t + 5.2);
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

  /** Couches selon l'action : plus de clients = plus d'instruments ; Rush et vitesse ×2/×3 = percussions en plus. */
  function layerFor(g, want) {
    if (!g) return 1;
    if (want === 'day') {
      const d = g.day;
      const fast = (g.save.settings.daySpeed || 1) > 1;
      if (d && (d.rush || (d.order && d.order.waiting) || fast)) return 3;
      return d && d.customers && d.customers.length >= 2 ? 2 : 1;
    }
    if (want === 'night' || want === 'boss') {
      const n = g.night;
      const alive = n && n.monsters ? n.monsters.active.length : 0;
      return alive >= 1 ? 2 : 1;
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
          loop = 0;
          bars = [];
          nextT = Math.max(nextT, ctx.currentTime + 0.05);
          pending = null;
        } else pending = want;
      }
      state.mood = mood;
      if (!mood || audio.muted) {
        nextT = ctx.currentTime + 0.05;
        return;
      }
      ensureNodes(ctx, b.music);
      const bpm = TEMPO[mood] || THEME.bpm;
      const beat = 60 / bpm;
      const swing = mood === 'title' || mood === 'night' || mood === 'boss' ? 0.5 : THEME.swing;
      // Après une longue pause (onglet caché), on repart de maintenant.
      if (nextT < ctx.currentTime - 0.5) nextT = ctx.currentTime + 0.05;
      while (nextT < ctx.currentTime + AHEAD) {
        if (pending && step % 8 === 0) {
          mood = pending;
          pending = null;
          step = 0;
          loop = 0;
          bars = [];
          break;
        }
        if (!bars.length) bars = form(mood, loop);
        if (step >= bars.length * 8) {
          // Boucle suivante : un autre habillage (et, une fois sur quatre, la respiration).
          step = 0;
          loop++;
          state.loop = loop;
          bars = form(mood, loop);
        }
        const sw = step % 2 === 0 ? swing : 1 - swing;
        try {
          scheduleStep(ctx, b.music, nextT, step, beat);
          state.notes++;
        } catch {
          /* un nœud refusé ne doit jamais casser le jeu */
        }
        nextT += beat * sw;
        step++;
      }
    },
    /** Remet le séquenceur à zéro (nouvelle partie). */
    reset() {
      mood = null;
      pending = null;
      step = 0;
      loop = 0;
      bars = [];
      lastDawn = -1;
    },
  };
  return music;
}
