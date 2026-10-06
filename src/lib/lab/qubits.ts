// A tiny state-vector simulator for the lab (FatQat's idea at toy size, on the CPU): n qubits,
// 2^n complex amplitudes, single-qubit gates and CNOT. Qubit 0 is the least significant bit.
export type Amp = [re: number, im: number];
export type Gate = { g: "H" | "X" | "Z" | "S" | "T"; q: number } | { g: "CNOT"; c: number; t: number };

export function zero(n: number): Amp[] {
  return Array.from({ length: 1 << n }, (_, i) => (i === 0 ? [1, 0] : [0, 0]) as Amp);
}

const S2 = Math.SQRT1_2;
const ONE: Record<string, [Amp, Amp, Amp, Amp]> = {
  H: [[S2, 0], [S2, 0], [S2, 0], [-S2, 0]],
  X: [[0, 0], [1, 0], [1, 0], [0, 0]],
  Z: [[1, 0], [0, 0], [0, 0], [-1, 0]],
  S: [[1, 0], [0, 0], [0, 0], [0, 1]],
  T: [[1, 0], [0, 0], [0, 0], [S2, S2]],
};
const mul = (a: Amp, b: Amp): Amp => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const add = (a: Amp, b: Amp): Amp => [a[0] + b[0], a[1] + b[1]];

export function apply(state: Amp[], gate: Gate): Amp[] {
  const out = state.map((a) => [...a] as Amp);
  if (gate.g === "CNOT") {
    const cm = 1 << gate.c, tm = 1 << gate.t;
    for (let i = 0; i < state.length; i++) if (i & cm && !(i & tm)) { out[i] = state[i | tm]; out[i | tm] = state[i]; }
    return out;
  }
  const [m00, m01, m10, m11] = ONE[gate.g], bit = 1 << gate.q;
  for (let i = 0; i < state.length; i++) {
    if (i & bit) continue;
    const a = state[i], b = state[i | bit];
    out[i] = add(mul(m00, a), mul(m01, b));
    out[i | bit] = add(mul(m10, a), mul(m11, b));
  }
  return out;
}

export const probs = (s: Amp[]) => s.map(([re, im]) => re * re + im * im);
export const run = (n: number, gates: Gate[]) => gates.reduce(apply, zero(n));
