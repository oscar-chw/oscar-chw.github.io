// The arithmetic behind FatQat's default GPU products, computed for real in the browser.
// Every complex product in a state-vector simulator needs a·b − c·d. "Plain" rounds each product and then the difference,
// as the CPU engines do; when the two products nearly cancel, most of the digits are rounding noise. The default
// ("compensated") uses Kahan's algorithm for 2×2 determinants, which needs a fused multiply-add and stays within 2 ulp
// even under cancellation. JavaScript has no FMA, so it is emulated exactly: every double is a dyadic rational, held here
// as a BigInt mantissa and a power-of-two exponent, and rounded back once with Number(BigInt), which rounds to nearest even.
// The same BigInt arithmetic gives the reference value each result is measured against.
import { rng } from "./series";

/** x = m · 2^e exactly. */
export interface Exact { m: bigint; e: number }

const view = new DataView(new ArrayBuffer(8));
export function toExact(x: number): Exact {
  if (x === 0) return { m: 0n, e: 0 };
  view.setFloat64(0, x);
  const hi = view.getUint32(0), lo = view.getUint32(4), ex = (hi >>> 20) & 0x7ff;
  let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  if (ex !== 0) m |= 1n << 52n;
  return { m: hi >>> 31 ? -m : m, e: ex === 0 ? -1074 : ex - 1075 };
}

const mul = (a: Exact, b: Exact): Exact => ({ m: a.m * b.m, e: a.e + b.e });
const add = (a: Exact, b: Exact): Exact => {
  const e = Math.min(a.e, b.e);
  return { m: (a.m << BigInt(a.e - e)) + (b.m << BigInt(b.e - e)), e };
};
const neg = (a: Exact): Exact => ({ m: -a.m, e: a.e });

/** Rounded once to the nearest double (inputs are kept to magnitudes where the scaling below stays exact). */
export const toDouble = (v: Exact): number => (v.m === 0n ? 0 : Number(v.m) * 2 ** v.e);

/** a·b + c with a single rounding. */
export const fma = (a: number, b: number, c: number): number => toDouble(add(mul(toExact(a), toExact(b)), toExact(c)));

/** The exact value of a·b − c·d. */
export const exactDet = (a: number, b: number, c: number, d: number): Exact =>
  add(mul(toExact(a), toExact(b)), neg(mul(toExact(c), toExact(d))));

/** Plain products: round a·b, round c·d, round their difference. */
export const plain = (a: number, b: number, c: number, d: number): number => a * b - c * d;

/** Kahan's algorithm: w = c·d rounded, e = its exact rounding error, f = a·b − w rounded once, then f + e. */
export function kahan(a: number, b: number, c: number, d: number): number {
  const w = c * d, e = fma(-c, d, w), f = fma(a, b, -w);
  return f + e;
}

const bitLength = (m: bigint) => (m < 0n ? -m : m).toString(2).length;

/** Error of a computed value against the exact a·b − c·d, in units in the last place of the exact value. */
export function ulpError(computed: number, a: number, b: number, c: number, d: number): number {
  const ex = exactDet(a, b, c, d);
  const diff = add(toExact(computed), neg(ex));
  if (ex.m === 0n) return diff.m === 0n ? 0 : Infinity;
  const topBit = ex.e + bitLength(ex.m) - 1;           // the exact value lies in [2^topBit, 2^(topBit+1))
  return Math.abs(toDouble({ m: diff.m, e: diff.e - (topBit - 52) }));
}

/** Roughly how many of a double's 16 significant digits survive an error of `ulps`. */
export const digitsKept = (ulps: number): number => (ulps === Infinity ? 0 : Math.max(0, Math.min(16, Math.round(15.95 - Math.log10(Math.max(ulps, 1))))));

/** Inputs like amplitudes: four values in [−1, 1]. */
export function typical(seed: number): [number, number, number, number] {
  const r = rng(seed);
  return [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r() * 2 - 1];
}

/** a·b and c·d agree to about 12 digits, so their difference is tiny: the case plain products get wrong. */
export function cancelling(seed: number): [number, number, number, number] {
  const r = rng(seed), x = 0.5 + 0.5 * r(), y = 0.5 + 0.5 * r(), u = (0.5 + r()) * 2 ** -40;
  return [x, y, x * (1 + u), y / (1 + u)];
}

export interface Summary { median: number; p95: number; max: number }
const summarise = (xs: number[]): Summary => {
  const s = [...xs].sort((p, q) => p - q), at = (q: number) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return { median: at(0.5), p95: at(0.95), max: s[s.length - 1] };
};

/** Run n seeded cases of one kind through both methods. */
export function sweep(kind: "typical" | "cancelling", n: number, seed = 1) {
  const gen = kind === "typical" ? typical : cancelling, p: number[] = [], k: number[] = [];
  for (let i = 0; i < n; i++) {
    const [a, b, c, d] = gen(seed * 100003 + i);
    p.push(ulpError(plain(a, b, c, d), a, b, c, d)); k.push(ulpError(kahan(a, b, c, d), a, b, c, d));
  }
  return { n, kind, plain: summarise(p), kahan: summarise(k) };
}
