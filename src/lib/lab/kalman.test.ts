import { describe, expect, test } from "vitest";
import { run, score, STEPS } from "./kalman";

// Averaged over 40 random markets, so no single lucky seed carries a claim.
const avg = (noise: number, N = 40) => {
  const a = { fixedFalse: 0, fixedCaught: 0, kalmanFalse: 0, kalmanCaught: 0 };
  for (let s = 1; s <= N; s++) {
    const r = run(noise, s), f = score(r.fixed), k = score(r.kalman);
    a.fixedFalse += f.falseCalls / N; a.fixedCaught += f.caught / N; a.kalmanFalse += k.falseCalls / N; a.kalmanCaught += k.caught / N;
  }
  return a;
};

describe("kalman drift gate (SYNTHETIC)", () => {
  test("is deterministic per seed and covers every step", () => {
    expect(run(0.6, 3)).toEqual(run(0.6, 3));
    const r = run(0.6, 3);
    for (const k of ["fair", "mid", "level", "fixed", "kalman"] as const) expect(r[k]).toHaveLength(STEPS);
  });

  test("noise alone makes the fixed-window gate call drift more and more often", () => {
    expect(avg(1.2).fixedFalse).toBeGreaterThan(4 * avg(0.1).fixedFalse);
  });

  test("the Kalman gate's false drift calls stay low at every noise level, and far below the fixed window's in heavy noise", () => {
    for (const noise of [0.1, 0.5, 1.2]) expect(avg(noise).kalmanFalse).toBeLessThan(0.1);
    const heavy = avg(1);
    expect(heavy.kalmanFalse).toBeLessThan(heavy.fixedFalse / 3);
  });

  test("it still catches real drift, later as noise grows (the price of being sure)", () => {
    expect(avg(0.1).kalmanCaught).toBeGreaterThan(0.8);
    expect(avg(1.2).kalmanCaught).toBeGreaterThan(0.4);
    expect(avg(1.2).kalmanCaught).toBeLessThan(avg(0.1).kalmanCaught);
  });
});
