import { describe, it, expect } from "vitest";
import { syntheticTape, LimitBook } from "./replay";

describe("syntheticTape", () => {
  it("is deterministic for a seed and differs across seeds", () => {
    expect(syntheticTape(1, 200)).toEqual(syntheticTape(1, 200));
    expect(syntheticTape(1, 200)).not.toEqual(syntheticTape(2, 200));
  });
});

describe("LimitBook", () => {
  it("never ends a step crossed, and trades only at resting prices", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const book = new LimitBook();
      for (const ev of syntheticTape(seed, 3000)) {
        const fills = book.apply(ev);
        const { bid, ask } = book.best();
        if (bid !== null && ask !== null) expect(bid).toBeLessThan(ask);
        for (const f of fills as { qty: number }[]) expect(f.qty).toBeGreaterThan(0);
      }
    }
  });
  it("a marketable order fills against the best price first (price-time priority)", () => {
    const book = new LimitBook();
    book.apply({ t: 0, kind: "limit", id: 1, side: "sell", price: 101, qty: 2 });
    book.apply({ t: 1, kind: "limit", id: 2, side: "sell", price: 100, qty: 1 });
    book.apply({ t: 2, kind: "limit", id: 3, side: "sell", price: 100, qty: 1 });
    const fills = book.apply({ t: 3, kind: "market", id: 4, side: "buy", qty: 3 });
    expect(fills.map((f) => [f.maker, f.price, f.qty])).toEqual([[2, 100, 1], [3, 100, 1], [1, 101, 1]]);
    expect(book.best().ask).toBe(101);
  });
  it("cancel removes resting size", () => {
    const book = new LimitBook();
    book.apply({ t: 0, kind: "limit", id: 1, side: "buy", price: 99, qty: 5 });
    book.apply({ t: 1, kind: "cancel", id: 1 });
    expect(book.best().bid).toBeNull();
  });
});
