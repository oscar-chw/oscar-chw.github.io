import { describe, it, expect } from "vitest";
import { pass, chordOf, BEATS_PER_BAR, BARS } from "./music";

describe("background music", () => {
  it("is reproducible from its seed and varies between seeds", () => {
    expect(pass(3)).toEqual(pass(3));
    expect(pass(3)).not.toEqual(pass(4));
  });
  it("stays inside an eight-bar pass, in a piano's comfortable range, and quiet", () => {
    for (const seed of [1, 2, 3, 4, 5]) for (const n of pass(seed)) {
      expect(n.t).toBeGreaterThanOrEqual(0);
      expect(n.t).toBeLessThan(BARS * BEATS_PER_BAR);
      expect(n.midi).toBeGreaterThanOrEqual(36); expect(n.midi).toBeLessThanOrEqual(84);
      expect(n.vel).toBeGreaterThan(0); expect(n.vel).toBeLessThanOrEqual(0.6);
    }
  });
  it("every strong-beat melody note belongs to its bar's chord", () => {
    for (const seed of [1, 2, 3, 4, 5]) for (const n of pass(seed)) {
      const beat = n.t % BEATS_PER_BAR, ch = chordOf(Math.floor(n.t / BEATS_PER_BAR));
      if (n.midi >= 62 && (beat === 0 || beat === 2) && n.dur > 2) expect(ch.some((c) => (((n.midi - c) % 12) + 12) % 12 === 0)).toBe(true);
    }
  });
});
