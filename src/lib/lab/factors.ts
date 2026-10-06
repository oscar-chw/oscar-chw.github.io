// SYNTHETIC cross-sectional factor research: a panel of assets with a little momentum, candidate
// signals scored by daily Spearman rank IC (signal today vs return tomorrow) on fixed
// train / validation / test windows. Two lessons: choose on validation only (Factor Lab), and
// the best of many random signals on train is luck that does not survive (alpha search).
import { rng, gauss, spearman } from "./series";

export interface Panel { rets: number[][] }                  // rets[day][asset]
export const SPLITS = { train: [0, 300], valid: [300, 450], test: [450, 600] } as const;

export function panel(seed: number, assets = 30, days = 600): Panel {
  const r = rng(seed), rets: number[][] = [], prev = new Array(assets).fill(0);
  const tilt = Array.from({ length: assets }, () => 0.15 + 0.1 * r());   // each asset trends a little
  for (let d = 0; d < days; d++) {
    const row = prev.map((p, a) => tilt[a] * p + 0.01 * gauss(r));
    rets.push(row); row.forEach((x, a) => (prev[a] = x));
  }
  return { rets };
}

export type Signal = (p: Panel, day: number, asset: number) => number;
export const momentum = (L: number): Signal => (p, d, a) => { let s = 0; for (let k = Math.max(0, d - L + 1); k <= d; k++) s += p.rets[k][a]; return s; };
export const reversal = (L: number): Signal => { const m = momentum(L); return (p, d, a) => -m(p, d, a); };

/** Mean daily rank IC over [from, to): signal at day d against returns on day d + 1 (delay-1). */
export function meanIC(p: Panel, sig: Signal, from: number, to: number): number {
  const assets = p.rets[0].length;
  let s = 0, n = 0;
  for (let d = Math.max(from, 60); d < to - 1; d++) {
    const x = Array.from({ length: assets }, (_, a) => sig(p, d, a)), y = p.rets[d + 1];
    s += spearman(x, y); n++;
  }
  return n ? s / n : 0;
}

/** Random noise signals: by construction they predict nothing. A hash of (seed, day, asset) makes each
 *  value deterministic without storing it (a cache of every value would be ~1M entries on a phone). */
export const noise = (seed: number): Signal => (_p, d, a) => {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(d + 1, 0xc2b2ae35) ^ Math.imul(a + 7, 0x27d4eb2f);
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d); x = Math.imul(x ^ (x >>> 12), 0x297a2d39); x ^= x >>> 15;
  return gauss(rng(x >>> 0));
};
