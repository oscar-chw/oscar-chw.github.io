import { describe, expect, test } from "vitest";
import { exactDet, fma, kahan, plain, ulpError, typical, cancelling, sweep, toDouble } from "./kahan";

describe("exact reference and fma emulation", () => {
  test("integer determinants are exact in every method", () => {
    expect(toDouble(exactDet(3, 4, 2, 5))).toBe(2);
    expect(plain(3, 4, 2, 5)).toBe(2);
    expect(kahan(3, 4, 2, 5)).toBe(2);
  });

  test("fma rounds once: 0.1 × 10 − 1 keeps the representation error a two-rounding product loses", () => {
    expect(fma(0.1, 10, -1)).toBe(5.551115123125783e-17);
    expect(0.1 * 10 - 1).toBe(0);
  });

  test("ulpError is 0 for the correctly rounded value and grows by one per ulp", () => {
    const [a, b, c, d] = [0.7, 0.3, 0.2, 0.9];
    const ref = toDouble(exactDet(a, b, c, d));
    expect(ulpError(ref, a, b, c, d)).toBeLessThanOrEqual(0.5);
    const next = ref + Math.abs(ref) * 2 ** -52 * 2;   // about two ulps away
    expect(ulpError(next, a, b, c, d)).toBeGreaterThan(1);
  });
});

describe("Kahan's 2×2 determinant (FatQat's default GPU products)", () => {
  test("stays within 2 ulp on typical and on cancelling inputs (2,000 seeded cases each)", () => {
    for (let s = 1; s <= 2000; s++) {
      for (const [a, b, c, d] of [typical(s), cancelling(s)]) expect(ulpError(kahan(a, b, c, d), a, b, c, d)).toBeLessThanOrEqual(2);
    }
  });

  test("plain products lose most of their digits when the two products nearly cancel", () => {
    const errs = Array.from({ length: 200 }, (_, i) => { const [a, b, c, d] = cancelling(i + 1); return ulpError(plain(a, b, c, d), a, b, c, d); });
    expect(errs.filter((e) => e > 1e3).length).toBeGreaterThan(150);
  });

  test("on typical inputs plain products are close too, which is why plain mode is a reasonable opt-in", () => {
    const errs = Array.from({ length: 2000 }, (_, i) => { const [a, b, c, d] = typical(i + 1); return ulpError(plain(a, b, c, d), a, b, c, d); });
    errs.sort((x, y) => x - y);
    expect(errs[1000]).toBeLessThan(2);           // the median plain error on typical inputs is a couple of ulps at most
  });

  test("a sweep summarises both methods and is deterministic", () => {
    const s = sweep("cancelling", 500, 7);
    expect(sweep("cancelling", 500, 7)).toEqual(s);
    expect(s.kahan.max).toBeLessThanOrEqual(2);
    expect(s.plain.median).toBeGreaterThan(s.kahan.max);
  });
});
