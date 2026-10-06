import { describe, it, expect } from "vitest";
import { cdf, blackScholes, ssviVol, grid } from "./options";
import { race } from "./lostupdates";
import { buildIndex, search, tokens } from "./bm25";

describe("Black–Scholes", () => {
  it("normal CDF matches known values", () => {
    expect(cdf(0)).toBeCloseTo(0.5, 7);
    expect(cdf(1.96)).toBeCloseTo(0.9750021, 6);
    expect(cdf(-1)).toBeCloseTo(0.1586553, 6);
  });
  it("prices the textbook case and satisfies put–call parity", () => {
    expect(blackScholes(100, 100, 1, 0, 0.2).call).toBeCloseTo(7.965567, 4);
    for (const [S, K, T, r, s] of [[90, 100, 0.5, 0.03, 0.25], [120, 100, 2, 0.05, 0.4], [100, 80, 0.1, 0, 0.6]]) {
      const q = blackScholes(S, K, T, r, s);
      expect(q.call - q.put).toBeCloseTo(S - K * Math.exp(-r * T), 9);
    }
  });
  it("Greeks agree with finite differences of the price", () => {
    const [S, K, T, r, s, h] = [105, 100, 0.75, 0.02, 0.3, 1e-3];
    const c = (x: number, t = T, v = s) => blackScholes(x, K, t, r, v).call, q = blackScholes(S, K, T, r, s);
    expect(q.delta).toBeCloseTo((c(S + h) - c(S - h)) / (2 * h), 5);
    expect(q.gamma).toBeCloseTo((c(S + h) - 2 * c(S) + c(S - h)) / (h * h), 3);
    expect(q.vega).toBeCloseTo((c(S, T, s + h) - c(S, T, s - h)) / (2 * h) / 100, 5);
    expect(q.theta).toBeCloseTo(-(c(S, T + h) - c(S, T - h)) / (2 * h) / 365, 5);
  });
});

describe("SSVI implied volatility", () => {
  it("returns the ATM vol at the money, and a negative rho skews it towards low strikes", () => {
    expect(ssviVol(0, 0.5, 0.2, -0.6, 1)).toBeCloseTo(0.2, 12);
    expect(ssviVol(-0.2, 0.5, 0.2, -0.6, 1)).toBeGreaterThan(ssviVol(0.2, 0.5, 0.2, -0.6, 1));
    const g = grid(20, 20, [-0.5, 0.5], [0.1, 2], (k, T) => ssviVol(k, T, 0.25, -0.5, 1.2));
    expect(g.flat().every((v) => Number.isFinite(v) && v > 0)).toBe(true);
  });
});

describe("lost updates", () => {
  it("compare-and-swap keeps every update; last-write-wins loses some once writers overlap", () => {
    let lostLww = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const cas = race(seed, 8, 5, "compare-and-swap"), lww = race(seed, 8, 5, "last write wins");
      expect(cas.final).toBe(40); expect(cas.lost).toBe(0);
      expect(lww.final + lww.lost).toBe(40);
      lostLww += lww.lost;
    }
    expect(lostLww).toBeGreaterThan(0);
  });
  it("a single writer never loses anything and never retries", () => {
    const r = race(9, 1, 10, "last write wins");
    expect(r.lost).toBe(0); expect(race(9, 1, 10, "compare-and-swap").retries).toBe(0);
  });
});

describe("BM25", () => {
  const docs = [
    { id: "a", title: "Order book", href: "#a", text: "the order book replay engine in C++ rebuilds the book" },
    { id: "b", title: "Factors", href: "#b", text: "momentum and reversal factors scored by rank IC on validation data" },
    { id: "c", title: "Notes", href: "#c", text: "book book book book book book book book notes about a book of many words and many more words here" },
  ];
  it("tokenises without stopwords or accents", () => { expect(tokens("The Pokémon order-book")).toEqual(["pokemon", "order", "book"]); });
  it("ranks a passage with the rare term first, and the per-term parts add up to the score", () => {
    const ix = buildIndex(docs), hits = search(ix, "replay book");
    expect(hits[0].p.id).toBe("a");
    for (const h of hits) expect(h.terms.reduce((s, [, v]) => s + v, 0)).toBeCloseTo(h.score, 12);
  });
  it("a raw keyword count is fooled by repetition; BM25 saturates", () => {
    const ix = buildIndex(docs);
    expect(search(ix, "book", "count")[0].p.id).toBe("c");
    expect(search(ix, "replay book", "bm25")[0].p.id).toBe("a");
  });
});
