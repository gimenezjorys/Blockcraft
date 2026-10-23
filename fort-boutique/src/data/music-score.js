// Fort Boutique — le thème écrit de la v1.1 (V9.1), recopié tel quel. Fa majeur, 112 BPM, swing 56 %.
// Notation : note+octave:durée en temps ; « - » = silence. Une mesure = 4 temps.
// Il revient partout (titre, matin, jour, nuit, boss, aube) avec des habillages différents (audio/music.js).

export const THEME = {
  key: 'F',
  bpm: 112,
  swing: 0.56,
  A: {
    chords: ['F', 'Dm', 'Gm7', 'C7', 'F', 'Am', 'Bb', 'C'],
    melody: [
      'C5:0.5 F5:0.5 A5:1 G5:0.5 F5:0.5 C5:1',
      'D5:0.5 F5:0.5 A5:0.5 G5:0.5 F5:1 D5:1',
      'Bb4:0.5 D5:0.5 F5:1 E5:0.5 F5:0.5 G5:1',
      'E5:1.5 C5:0.5 -:2',
      'C5:0.5 F5:0.5 A5:1 C6:1 A5:1',
      'G5:0.5 A5:0.5 G5:0.5 E5:0.5 C5:2',
      'D5:0.5 F5:0.5 Bb5:1 A5:0.5 G5:0.5 F5:1',
      'G5:1 E5:1 F5:2',
    ],
  },
  B: {
    chords: ['Bb', 'C', 'Am', 'Dm', 'Gm7', 'C', 'F', 'C7'],
    melody: [
      'F5:1 D5:0.5 F5:0.5 G5:2',
      'E5:1 C5:0.5 E5:0.5 G5:2',
      'A5:0.5 G5:0.5 E5:0.5 C5:0.5 E5:1 A4:1',
      'D5:0.5 E5:0.5 F5:0.5 A5:0.5 D6:2',
      'Bb5:1 A5:0.5 G5:0.5 F5:1 D5:1',
      'E5:0.5 F5:0.5 G5:1 C5:2',
      'A5:1 F5:1 C6:1 A5:1',
      'G5:1.5 -:0.5 E5:1 C5:1',
    ],
  },
  /** La nuit : le même thème en ré mineur. */
  nightChords: ['Dm', 'Bb', 'Gm7', 'A7', 'Dm', 'F', 'Bb', 'A'],
  nightChordsB: ['Bb', 'C', 'Gm7', 'Dm', 'Gm7', 'A7', 'Dm', 'A7'],
  /** L'aube : les 4 dernières mesures de A en ré majeur. */
  dawnChords: ['D', 'F#m', 'G', 'A'],
};

/** Accords : notes (MIDI, autour de l'octave 3) et fondamentale de la basse (octave 2). */
export const CHORDS = {
  F: { notes: [53, 57, 60], root: 41 },
  Dm: { notes: [50, 53, 57], root: 38 },
  Gm7: { notes: [55, 58, 62, 65], root: 43 },
  C7: { notes: [48, 52, 55, 58], root: 36 },
  Am: { notes: [57, 60, 64], root: 45 },
  Bb: { notes: [46, 50, 53], root: 46 - 12 },
  C: { notes: [48, 52, 55], root: 36 },
  A7: { notes: [57, 61, 64, 67], root: 45 },
  A: { notes: [57, 61, 64], root: 45 },
  D: { notes: [50, 54, 57], root: 38 },
  'F#m': { notes: [54, 57, 61], root: 42 },
  G: { notes: [55, 59, 62], root: 43 },
};

/** Accords au ukulélé (accord sol-do-mi-la, cordes de la plus grave à la plus aiguë dans l'ordre du grattage). */
export const UKE = {
  F: [69, 60, 65, 69],
  Dm: [69, 62, 65, 69],
  Gm7: [67, 62, 65, 70],
  C7: [67, 60, 64, 70],
  Am: [69, 60, 64, 69],
  Bb: [70, 62, 65, 70],
  C: [67, 60, 64, 72],
  A7: [67, 61, 64, 69],
  A: [69, 61, 64, 69],
  D: [69, 62, 66, 69],
  'F#m': [69, 61, 66, 69],
  G: [67, 62, 67, 71],
};

/** Grattage du ukulélé en croches : bas - bas haut - haut bas haut (accents sur 2 et 4). */
export const STRUM = ['D', null, 'D', 'U', null, 'U', 'D', 'U'];

/** Tempos des habillages (V9.3). */
export const TEMPO = { title: 90, morning: 100, day: 112, night: 92, boss: 100, dawn: 100 };

/** Gains des instruments (avant le bus musique). */
export const VOICE_GAIN = {
  uke: 0.12, glock: 0.07, whistle: 0.05, breath: 0.006, epiano: 0.06, marimba: 0.09, musicbox: 0.08, bass: 0.22, pluck: 0.03,
  kick: 0.2, rim: 0.05, shaker: 0.022, clap: 0.045, hat: 0.03, pizz: 0.07, pad: 0.012, tom: 0.1, timpani: 0.16, choir: 0.012, bird: 0.035,
};

/** Placement stéréo (V9.3) : ukulélé à gauche, piano à droite, mélodie au centre. */
export const PAN = { uke: -0.35, epiano: 0.35, melody: 0, counter: 0.2, bass: 0, drums: 0 };

/**
 * Lit une mesure « C5:0.5 F5:0.5 … » : notes { at (temps), midi (null = silence), dur (temps) }.
 * @param {string} bar
 */
export function parseBar(bar) {
  const out = [];
  let at = 0;
  for (const tok of bar.trim().split(/\s+/)) {
    const [n, d] = tok.split(':');
    const dur = Number(d);
    out.push({ at, midi: n === '-' ? null : noteToMidi(n), dur });
    at += dur;
  }
  return out;
}

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** « Bb4 » → 70, « C6 » → 84, « F#3 » → 54. */
export function noteToMidi(n) {
  const m = /^([A-G])(b|#)?(-?\d)$/.exec(n);
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0);
}
