// Fort Boutique — musique (G21.2) : ambiances, grilles d'accords et motifs écrits à la main.
// Les motifs sont des degrés de la gamme de l'ambiance (null = silence), 16 croches = 2 mesures.
// Le motif A est l'ADN du jeu : il revient dans toutes les musiques.

/** Motifs (degrés de gamme, à partir de l'octave de la mélodie). */
export const MOTIFS = {
  A: [4, null, 5, 4, 2, null, 3, null, 2, null, 1, 0, 1, null, null, null],
  B: [0, 1, 2, null, 4, null, 2, 1, 2, null, null, 1, 0, null, null, null],
  C: [5, 4, null, 2, 4, null, null, 2, 1, 2, null, 1, 0, null, null, null],
  D: [2, null, 2, 3, 4, 5, 4, null, 3, null, 2, null, 1, null, null, null],
  E: [7, null, 5, null, 4, null, 2, null, 4, null, 5, null, 4, null, null, null],
  F: [0, null, null, 2, null, null, 4, null, 5, null, 4, null, 2, null, null, null],
  G: [4, 5, 4, 2, 1, null, 2, null, 4, null, null, null, 2, 1, 0, null],
  H: [0, null, 4, null, 2, null, 4, null, 1, null, 4, null, 0, null, null, null],
};

/** Ordre des motifs par ambiance (une entrée = 2 mesures) ; les variations à graine changent l'octave et les ornements. */
const DAY_CHORDS = [
  [53, 57, 60], // Fa
  [50, 53, 57], // Rém
  [46, 50, 53], // Si♭
  [48, 52, 55], // Do
  [53, 57, 60], // Fa
  [45, 48, 52], // Lam
  [46, 50, 53], // Si♭
  [48, 53, 55], // Do sus4
];
const NIGHT_CHORDS = [
  [50, 53, 57], // Rém
  [48, 52, 55], // Do
  [46, 50, 53], // Si♭
  [48, 52, 55], // Do
  [50, 53, 57], // Rém
  [53, 57, 60], // Fa
  [55, 59, 62], // Sol
  [57, 61, 64, 67], // La7
];

/**
 * Ambiances (G21.2). melody : octave de base de la mélodie (MIDI de la tonique) ; parts : ordre des motifs.
 * @type {Record<string, { bpm: number, swing: number, scale: 'day' | 'night', chords: number[][], melodyRoot: number, parts: string[] }>}
 */
export const MOODS = {
  title: { bpm: 72, swing: 0.5, scale: 'night', chords: NIGHT_CHORDS, melodyRoot: 74, parts: ['A', 'F', 'A', 'H'] },
  morning: { bpm: 96, swing: 0.54, scale: 'day', chords: DAY_CHORDS, melodyRoot: 77, parts: ['A', 'F', 'B', 'H'] },
  day: { bpm: 104, swing: 0.54, scale: 'day', chords: DAY_CHORDS, melodyRoot: 77, parts: ['A', 'B', 'C', 'D', 'A', 'G', 'E', 'D'] },
  night: { bpm: 92, swing: 0.5, scale: 'night', chords: NIGHT_CHORDS, melodyRoot: 74, parts: ['A', 'C', 'F', 'D'] },
  boss: { bpm: 100, swing: 0.5, scale: 'night', chords: NIGHT_CHORDS, melodyRoot: 74, parts: ['A', 'G', 'A', 'E'] },
};

/** Arpège de l'aube : ré majeur (ré, fa♯, la, ré). */
export const DAWN_ARP = [74, 78, 81, 86];

/** Gain de chaque instrument (avant le bus musique). */
export const INSTR_GAIN = {
  bass: 0.2, sub: 0.08, marimba: 0.1, piano: 0.035, shaker: 0.025, clap: 0.05,
  musicbox: 0.08, pizz: 0.07, pad: 0.012, tom: 0.1, timpani: 0.16, choir: 0.012,
};
