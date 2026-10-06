import { describe, it, expect } from "vitest";
import { FrameGate } from "./orderbook";

describe("FrameGate", () => {
  it("never admits two frames closer than 1/fps, even with irregular ticks", () => {
    const g = new FrameGate(10), admitted: number[] = [];
    for (const t of [0, 16, 99.9, 100, 150, 199.9, 200, 250, 300, 316, 401, 1000, 1000.5]) if (g.ready(t)) admitted.push(t);
    for (let i = 1; i < admitted.length; i++) expect(admitted[i] - admitted[i - 1]).toBeGreaterThanOrEqual(100);
    expect(admitted).toEqual([0, 100, 200, 300, 401, 1000]);
  });
  it("keeps up with a steady stream (no starvation)", () => {
    const g = new FrameGate(10);
    let n = 0;
    for (let t = 0; t < 1000; t += 16) if (g.ready(t)) n++;
    expect(n).toBeGreaterThanOrEqual(8);
    expect(n).toBeLessThanOrEqual(10);
  });
});
