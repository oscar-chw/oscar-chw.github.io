// DNA storage's hard case, SYNTHETIC: text becomes a DNA strand at two bits per letter (A C G T), a
// seeded channel substitutes, inserts and deletes letters, and the strand is read back with no
// correction at all. A substitution damages one character; a single insertion or deletion shifts
// every letter after it and garbles the rest, which is why indel-aware decoders exist.
import { rng } from "./series";

const BASES = "ACGT";
export type Event = { pos: number; kind: "sub" | "ins" | "del" };

export function encode(text: string): string {
  return [...new TextEncoder().encode(text)].map((b) => [6, 4, 2, 0].map((s) => BASES[(b >> s) & 3]).join("")).join("");
}

/** Read a strand back four letters per byte; a trailing partial byte is dropped. */
export function decode(strand: string): string {
  const bytes: number[] = [];
  for (let i = 0; i + 4 <= strand.length; i += 4) bytes.push([...strand.slice(i, i + 4)].reduce((v, c) => (v << 2) | Math.max(0, BASES.indexOf(c)), 0));
  // show unreadable bytes as a dot rather than as control characters
  return bytes.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "·")).join("");
}

/** Apply the given numbers of substitutions, insertions and deletions at seeded positions. */
export function channel(strand: string, seed: number, subs: number, ins: number, dels: number): { out: string; events: Event[] } {
  const r = rng(seed), s = [...strand], events: Event[] = [];
  const at = () => Math.floor(r() * Math.max(1, s.length));
  for (let k = 0; k < subs; k++) { const p = at(); s[p] = BASES[(BASES.indexOf(s[p]) + 1 + Math.floor(r() * 3)) % 4]; events.push({ pos: p, kind: "sub" }); }
  // splicing moves every later letter, so earlier events' positions are kept pointing at the final strand
  for (let k = 0; k < dels; k++) {
    const p = at(); s.splice(p, 1);
    for (const e of events) if (e.pos > p) e.pos--; else if (e.pos === p && e.kind !== "del") e.kind = "del";
    events.push({ pos: p, kind: "del" });
  }
  for (let k = 0; k < ins; k++) {
    const p = at(); s.splice(p, 0, BASES[Math.floor(r() * 4)]);
    for (const e of events) if (e.pos >= p) e.pos++;
    events.push({ pos: p, kind: "ins" });
  }
  return { out: s.join(""), events };
}

export const gc = (strand: string) => strand ? [...strand].filter((c) => c === "G" || c === "C").length / strand.length : 0;
export function longestRun(strand: string) {
  let best = 0, run = 0;
  for (let i = 0; i < strand.length; i++) { run = i && strand[i] === strand[i - 1] ? run + 1 : 1; best = Math.max(best, run); }
  return best;
}

/** How many characters survive, comparing position by position. */
export const intact = (a: string, b: string) => [...a].filter((c, i) => b[i] === c).length;
