import { describe, it, expect } from "vitest";
import { toGray, edges, tour, resampleTour } from "./trace";

// a white 20x20 square on black, inside a 60x60 image
function square() {
  const w = 60, h = 60, rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const on = x >= 20 && x < 40 && y >= 20 && y < 40, i = (y * w + x) * 4;
    rgba[i] = rgba[i + 1] = rgba[i + 2] = on ? 255 : 0; rgba[i + 3] = 255;
  }
  return toGray(rgba, w, h);
}

describe("edges", () => {
  it("finds the square's outline and nothing far from it", () => {
    const pts = edges(square(), 0.2);
    expect(pts.length).toBeGreaterThan(40);
    for (const [x, y] of pts) {
      const nearX = Math.min(Math.abs(x - 19.5), Math.abs(x - 39.5)), nearY = Math.min(Math.abs(y - 19.5), Math.abs(y - 39.5));
      expect(Math.min(nearX, nearY)).toBeLessThanOrEqual(2.5);
    }
  });
  it("caps the number of points", () => { expect(edges(square(), 0.5, 50).length).toBe(50); });
  it("returns nothing for a flat image", () => {
    const flat = toGray(new Uint8ClampedArray(30 * 30 * 4).fill(128), 30, 30);
    expect(edges(flat).length).toBe(0);
  });
});

describe("tour", () => {
  it("visits every point exactly once and lifts the pen only on jumps", () => {
    const pts: [number, number][] = [[0, 0], [1, 0], [2, 0], [50, 50], [51, 50]];
    const { path, pen } = tour(pts, 4);
    expect(new Set(path.map((p) => p.join())).size).toBe(pts.length);
    expect(pen.filter(Boolean).length).toBe(2);       // the start, and the jump to the second stroke
  });
  it("orders a shuffled line into a short path", () => {
    const pts: [number, number][] = Array.from({ length: 100 }, (_, i) => [i, 0]);
    let s = 12345; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    expect(pts.slice(0, 5).map((p) => p[0])).not.toEqual([0, 1, 2, 3, 4]);   // really shuffled
    const { path } = tour(pts);
    let len = 0;
    for (let i = 1; i < path.length; i++) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    expect(len).toBeLessThan(250);                    // a scrambled order would be far longer
  });
});

describe("resampleTour", () => {
  it("returns n samples and keeps pen-up on the jumps", () => {
    const { path, pen } = tour([[0, 0], [1, 0], [2, 0], [40, 0], [41, 0]], 4);
    const r = resampleTour(path, pen, 64);
    expect(r.pts).toHaveLength(64);
    expect(r.pen.some((p) => p === 1)).toBe(true);
    expect(r.pen.some((p) => p === 0)).toBe(true);
  });
});
