// Point-in-time reads, as the QTS platform and the point-in-time research platform do them: every version of a value
// carries the time it became known; reading "as of" t returns the latest version known by t,
// never one that arrived later (a correction published tomorrow is invisible today).
export interface Version { key: string; value: number; known: number }

export function asOf(store: Version[], key: string, t: number): Version | null {
  let best: Version | null = null;
  for (const v of store) if (v.key === key && v.known <= t && (!best || v.known >= best.known)) best = v;
  return best;
}

// SYNTHETIC: a few fields of one stock, with corrections and late arrivals published on later days. Shared by the Lab
// experiment and the build-computed preview on the QTS page.
export const STORE: Version[] = [
  { key: "close (Mon)", value: 10.0, known: 1 }, { key: "close (Mon)", value: 10.4, known: 4 },
  { key: "volume (Mon)", value: 1200, known: 1 }, { key: "volume (Mon)", value: 1350, known: 2 },
  { key: "split factor", value: 1, known: 0 }, { key: "split factor", value: 2, known: 6 },
  { key: "close (Tue)", value: 10.9, known: 2 }, { key: "dividend (Wed)", value: 0.3, known: 5 },
];
export const KEYS = [...new Set(STORE.map((v) => v.key))];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
