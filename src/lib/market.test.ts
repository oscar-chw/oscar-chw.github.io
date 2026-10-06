import { describe, it, expect } from "vitest";
import { Market, REGIMES, type Regime } from "./market";

const path = (seed: number, regime: Regime | "switching") => new Market(seed, regime).history(400, 25);
const logRet = (h: number[]) => h.slice(1).map((v, i) => Math.log(v / h[i]));
const sd = (xs: number[]) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length); };

describe("simulated market", () => {
  it("is reproducible from its seed and differs across seeds", () => {
    expect(path(42, "switching")).toEqual(path(42, "switching"));
    expect(path(42, "calm")).not.toEqual(path(43, "calm"));
  });
  it("never leaves the book crossed and keeps it bounded", () => {
    const m = new Market(7, "volatile");
    for (let i = 0; i < 20000; i++) {
      m.step();
      const { bid, ask } = m.book.best();
      if (bid !== null && ask !== null) expect(bid).toBeLessThan(ask);
    }
    const resting = [...m.book.bids.values(), ...m.book.asks.values()].reduce((s, q) => s + q.length, 0);
    expect(resting).toBeLessThanOrEqual(300);
  });
  it("each regime has its shape: trend rises, volatile moves most, revert stays near 100, crash gaps down", () => {
    for (const seed of [1, 2, 3]) {
      const t = path(seed, "trend"), c = path(seed, "calm"), v = path(seed, "volatile"), r = path(seed, "revert");
      expect(t.at(-1)!).toBeGreaterThan(t[0] * 1.1);
      expect(sd(logRet(v))).toBeGreaterThan(2 * sd(logRet(c)));
      expect(Math.max(...r.map((x) => Math.abs(x - 100)))).toBeLessThan(Math.max(...c.map((x) => Math.abs(x - 100))) + 2);
    }
    // a crash path has at least one session-to-session drop larger than anything the calm path shows
    const k = path(5, "crash"), c = path(5, "calm");
    expect(Math.min(...logRet(k))).toBeLessThan(Math.min(...logRet(c)) * 3);
  });
  it("names every regime", () => { expect(Object.keys(REGIMES)).toEqual(["calm", "trend", "revert", "volatile", "crash"]); });
});
