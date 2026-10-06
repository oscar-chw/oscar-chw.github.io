// Point-in-time reads, as the QTS platform and asof-research do them: every version of a value
// carries the time it became known; reading "as of" t returns the latest version known by t,
// never one that arrived later (a correction published tomorrow is invisible today).
export interface Version { key: string; value: number; known: number }

export function asOf(store: Version[], key: string, t: number): Version | null {
  let best: Version | null = null;
  for (const v of store) if (v.key === key && v.known <= t && (!best || v.known >= best.known)) best = v;
  return best;
}
