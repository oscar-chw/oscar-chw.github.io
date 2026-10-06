// Small numeric helpers for the lab's SYNTHETIC experiments: a seeded RNG, Gaussian draws,
// a random-walk price path, and Spearman rank correlation.
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export function gauss(r: () => number) {
  let u = 0; while (u === 0) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/** Daily log returns with a little momentum (AR(1) coefficient phi), so a trend signal can exist. */
export function returns(seed: number, n: number, phi = 0.12, vol = 0.01): number[] {
  const r = rng(seed), out: number[] = [];
  let prev = 0;
  for (let i = 0; i < n; i++) { prev = phi * prev + vol * gauss(r); out.push(prev); }
  return out;
}

export function cumulative(rets: number[]): number[] {
  let s = 0;
  return rets.map((x) => (s += x));
}

function ranks(xs: number[]): number[] {
  const idx = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(xs.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) out[idx[k][1]] = (i + j) / 2;     // ties share the average rank
    i = j + 1;
  }
  return out;
}

export function spearman(a: number[], b: number[]): number {
  const ra = ranks(a), rb = ranks(b), n = a.length;
  const ma = ra.reduce((s, x) => s + x, 0) / n, mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (ra[i] - ma) * (rb[i] - mb); da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}
