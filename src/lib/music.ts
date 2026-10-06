// An original, generative piano piece for the site's background music. Nothing here is taken from an
// existing song: an eight-bar A-minor progression, a left hand that rolls each chord, and a sparse
// right-hand line that wanders by step over the chord tones. A seed varies every pass a little.
export interface Note { t: number; midi: number; vel: number; dur: number }   // t and dur in beats

// Am – F – C – G – Am – F – Dm – E: chord tones as MIDI notes (E major for a harmonic-minor lift into the repeat)
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
const SCALE = [57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81];      // A natural minor, A3 to A5
export const BEATS_PER_BAR = 4, BARS = CHORDS.length, BPM = 66;

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const isChordTone = (midi: number, ch: number[]) => ch.some((c) => (((midi - c) % 12) + 12) % 12 === 0);
/** The scale step nearest to `at` whose note belongs to the chord (ties go upward). */
function nearestChordTone(at: number, ch: number[]) {
  for (let d = 0; d < SCALE.length; d++)
    for (const k of [at + d, at - d]) if (k >= 0 && k < SCALE.length && isChordTone(SCALE[k], ch)) return k;
  return at;
}

/** One eight-bar pass, as notes in beats from its start. */
export function pass(seed: number): Note[] {
  const r = rng(seed), notes: Note[] = [];
  let at = SCALE.indexOf(72);                                            // the melody starts on C5
  CHORDS.forEach((ch, bar) => {
    const b0 = bar * BEATS_PER_BAR, [root, third, fifth] = ch;
    // left hand: low root, then the chord rolled upward in eighths, softer as it climbs
    const roll = [root - 12, fifth - 12, root, third, fifth, root + 12 - 12 * Number(r() < 0.5), third, fifth];
    roll.forEach((m, k) => notes.push({ t: b0 + k * 0.5, midi: m, vel: 0.42 - k * 0.025 + r() * 0.04, dur: k ? 1.4 : 3.6 }));
    // right hand: two to four notes per bar, landing on chord tones on strong beats
    for (const beat of [0, 1.5, 2, 3]) {
      if (beat && r() < 0.42) continue;
      const strong = beat === 0 || beat === 2;
      at = Math.max(5, Math.min(SCALE.length - 2, at + [-2, -1, -1, 0, 1, 1, 2][Math.floor(r() * 7)]));
      if (strong) at = nearestChordTone(at, ch);                          // strong beats land on the harmony
      notes.push({ t: b0 + beat, midi: SCALE[at], vel: (strong ? 0.5 : 0.36) + r() * 0.06, dur: strong ? 2.2 : 1.1 });
    }
  });
  return notes.sort((a, b) => a.t - b.t);
}

export const chordOf = (bar: number) => CHORDS[((bar % BARS) + BARS) % BARS];
