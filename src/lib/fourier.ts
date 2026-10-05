// Fourier series of a closed path: each term is a rotating circle; summed tip to tail they redraw it.
export type Pt = [number, number];
export interface Term { freq: number; re: number; im: number; amp: number; phase: number }

/** n points evenly spaced by arc length along the closed polyline through `pts`. */
export function resample(pts: Pt[], n: number): Pt[] {
  const ring = [...pts, pts[0]], cum = [0];
  for (let i = 1; i < ring.length; i++) cum.push(cum[i - 1] + Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]));
  const total = cum[cum.length - 1], out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (k / n) * total;
    while (cum[j + 1] < s) j++;
    const f = (s - cum[j]) / Math.max(cum[j + 1] - cum[j], 1e-12);
    out.push([ring[j][0] + f * (ring[j + 1][0] - ring[j][0]), ring[j][1] + f * (ring[j + 1][1] - ring[j][1])]);
  }
  return out;
}

/** Discrete Fourier transform of x + iy, terms sorted by amplitude (largest first), centre term excluded. */
export function dft(pts: Pt[]): Term[] {
  const N = pts.length, out: Term[] = [];
  for (let k = 0; k < N; k++) {
    const freq = k <= N / 2 ? k : k - N;            // signed frequency: circles turn both ways
    if (freq === 0) continue;
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const a = (-2 * Math.PI * k * n) / N, c = Math.cos(a), s = Math.sin(a);
      re += pts[n][0] * c - pts[n][1] * s;
      im += pts[n][0] * s + pts[n][1] * c;
    }
    re /= N; im /= N;
    out.push({ freq, re, im, amp: Math.hypot(re, im), phase: Math.atan2(im, re) });
  }
  return out.sort((a, b) => b.amp - a.amp);
}

/** Centre of the path (the k = 0 term). */
export function centre(pts: Pt[]): Pt {
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}

/** Pen position at t in [0, 1) using the k largest terms, relative to the centre. */
export function evaluate(terms: Term[], k: number, t: number, c: Pt = [0, 0]): Pt {
  let x = c[0], y = c[1];
  for (let i = 0; i < k && i < terms.length; i++) {
    const a = 2 * Math.PI * terms[i].freq * t + terms[i].phase;
    x += terms[i].amp * Math.cos(a); y += terms[i].amp * Math.sin(a);
  }
  return [x, y];
}

/** Root-mean-square distance between the path and its k-term reconstruction. */
export function rmsError(pts: Pt[], terms: Term[], k: number): number {
  const c = centre(pts), N = pts.length;
  let s = 0;
  for (let n = 0; n < N; n++) { const [x, y] = evaluate(terms, k, n / N, c); s += (x - pts[n][0]) ** 2 + (y - pts[n][1]) ** 2; }
  return Math.sqrt(s / N);
}
