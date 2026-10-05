import { describe, it, expect } from "vitest";
import { dft, evaluate, rmsError, resample, centre } from "./fourier";

const circle = (n: number) => Array.from({ length: n }, (_, i) => [Math.cos((2 * Math.PI * i) / n), Math.sin((2 * Math.PI * i) / n)] as [number, number]);
const square = (n: number) => resample([[0, 0], [1, 0], [1, 1], [0, 1]], n);

describe("dft", () => {
  it("represents a circle with one term", () => {
    const terms = dft(circle(64));
    expect(Math.hypot(terms[0].re, terms[0].im)).toBeCloseTo(1, 9);
    expect(terms[0].freq).toBe(1);
    expect(rmsError(circle(64), terms, 1)).toBeLessThan(1e-9);
  });
  it("sorts terms by amplitude, largest first, excluding the centre", () => {
    const t = dft(square(128));
    for (let i = 1; i < t.length; i++) expect(t[i - 1].amp).toBeGreaterThanOrEqual(t[i].amp);
    expect(t.some((x: { freq: number }) => x.freq === 0)).toBe(false);
  });
  it("reconstructs exactly with all terms, and error falls as terms are added", () => {
    const pts = square(128);
    const t = dft(pts);
    expect(rmsError(pts, t, t.length)).toBeLessThan(1e-9);
    const e = [2, 8, 32].map((k) => rmsError(pts, t, k));
    expect(e[0]).toBeGreaterThan(e[1]);
    expect(e[1]).toBeGreaterThan(e[2]);
  });
  it("evaluate at t = i/n returns the i-th sample", () => {
    const pts = square(64), t = dft(pts);
    const [x, y] = evaluate(t, t.length, 5 / 64, centre(pts));
    expect(x).toBeCloseTo(pts[5][0], 9);
    expect(y).toBeCloseTo(pts[5][1], 9);
  });
});

describe("resample", () => {
  it("returns n points evenly spaced along the closed path", () => {
    const pts = resample([[0, 0], [2, 0], [2, 2], [0, 2]], 8);
    expect(pts).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      const [a, b] = [pts[i], pts[(i + 1) % 8]];
      expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeCloseTo(1, 9);
    }
  });
});
