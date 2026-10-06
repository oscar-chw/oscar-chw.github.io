// A whole market in the browser: seeded synthetic order flow through the LimitBook matching engine
// (price-time priority). The harbour's city is this market's past and its water is the live book.
// Prices are integer ticks of 0.01 around a fair value that follows the chosen regime.
import { LimitBook, type Fill, type Side } from "./replay";

export type Regime = "calm" | "trend" | "revert" | "volatile" | "crash";
export const REGIMES: Record<Regime, { label: string; blurb: string }> = {
  calm: { label: "Calm", blurb: "small random steps, tight quotes" },
  trend: { label: "Trending", blurb: "a steady upward drift" },
  revert: { label: "Mean-reverting", blurb: "pulled back towards 100.00" },
  volatile: { label: "Volatile", blurb: "large steps, wide quotes" },
  crash: { label: "Crash", blurb: "rare sharp gaps down, slow recovery" },
};
const P: Record<Regime, { vol: number; drift: number; pull: number; jump: number; width: number }> = {
  calm: { vol: 2, drift: 0, pull: 0, jump: 0, width: 8 },
  trend: { vol: 2, drift: 0.15, pull: 0, jump: 0, width: 8 },
  revert: { vol: 4, drift: 0, pull: 0.003, jump: 0, width: 8 },
  volatile: { vol: 7, drift: 0, pull: 0, jump: 0, width: 18 },
  crash: { vol: 2, drift: 0.03, pull: 0, jump: 0.00015, width: 10 },
};
const ANCHOR = 10000, MAX_RESTING = 300;

export class Market {
  readonly book = new LimitBook();
  fair = ANCHOR;
  regime: Regime;
  private s: number;
  private id = 0;
  private live: number[] = [];
  private switching: boolean;

  /** "switching" moves between the five regimes at random, as real markets do. */
  constructor(seed: number, regime: Regime | "switching" = "switching") {
    this.s = seed >>> 0 || 1;
    this.switching = regime === "switching";
    this.regime = regime === "switching" ? "calm" : regime;
  }

  private rnd() { return (this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0) / 4294967296; }

  /** One order event: move the fair value, then a limit order, a cancel or a market order. */
  step(): Fill[] {
    const r0 = this.rnd();
    if (this.switching && r0 < 1 / 4000) this.regime = (Object.keys(P) as Regime[])[Math.floor(this.rnd() * 5)];
    const p = P[this.regime];
    this.fair += p.drift + (this.rnd() - 0.5) * 2 * p.vol + p.pull * (ANCHOR - this.fair);
    if (p.jump && this.rnd() < p.jump) this.fair *= 0.92 - this.rnd() * 0.06;
    this.fair = Math.max(500, this.fair);                       // a price never goes to zero
    const r = this.rnd();
    if (r < 0.62) {
      const side: Side = this.rnd() < 0.5 ? "buy" : "sell", off = 1 + Math.floor(this.rnd() * p.width);
      const price = Math.round(side === "buy" ? this.fair - off : this.fair + off);
      this.live.push(++this.id);
      // resting orders far from fair are stale: the oldest is cancelled so the book stays bounded
      if (this.live.length > MAX_RESTING) this.book.apply({ t: 0, kind: "cancel", id: this.live.shift()! });
      return this.book.apply({ t: 0, kind: "limit", id: this.id, side, price, qty: 1 + Math.floor(this.rnd() * 5) });
    }
    if (r < 0.8 && this.live.length) {
      this.book.apply({ t: 0, kind: "cancel", id: this.live.splice(Math.floor(this.rnd() * this.live.length), 1)[0] });
      return [];
    }
    return this.book.apply({ t: 0, kind: "market", id: ++this.id, side: this.rnd() < 0.5 ? "buy" : "sell", qty: 1 + Math.floor(this.rnd() * 4) });
  }

  /** Mid price in price units (ticks / 100); the fair value while one side of the book is empty. */
  mid() {
    const { bid, ask } = this.book.best();
    return (bid !== null && ask !== null ? (bid + ask) / 2 : this.fair) / 100;
  }

  /** Close of each session: the mid after every `perSession` events. */
  history(sessions: number, perSession: number): number[] {
    const out: number[] = [];
    for (let d = 0; d < sessions; d++) { for (let k = 0; k < perSession; k++) this.step(); out.push(this.mid()); }
    return out;
  }
}
