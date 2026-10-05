import { describe, it, expect } from "vitest";
import { parseFigure, figureAt } from "./countup";

describe("count-up figures", () => {
  it.each(["89,048", "0.09 s", "top 5%", "−96%", "700B+", "25×", "6×", "23 of 23", "141 of 290", "18,803"])(
    "ends exactly on the original text: %s", (s) => { expect(figureAt(parseFigure(s)!, 1)).toBe(s); });
  it("counts grouped numbers as one number, keeping separators", () => {
    const f = parseFigure("89,048")!;
    expect(f.n).toBe(89048);
    expect(figureAt(f, 0.5)).toBe("44,524");
  });
  it("keeps decimals and surrounding text while counting", () => {
    expect(figureAt(parseFigure("0.09 s")!, 0.5)).toBe("0.04 s");   // 0.045 rounds half-even in toFixed's binary form
    expect(figureAt(parseFigure("top 5%")!, 0)).toBe("top 0%");
  });
  it("ratios start at the 1× baseline, not at zero", () => {
    expect(figureAt(parseFigure("25×")!, 0)).toBe("1×");
    expect(figureAt(parseFigure("6×")!, 0)).toBe("1×");
    expect(figureAt(parseFigure("700B+")!, 0)).toBe("0B+");
  });
  it("returns null for text with no number", () => { expect(parseFigure("live")).toBeNull(); });
});
