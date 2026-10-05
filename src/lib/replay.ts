// A small price-time-priority limit order book and a seeded synthetic order flow for the replay demo.
export type Side = "buy" | "sell";
export type Event =
  | { t: number; kind: "limit"; id: number; side: Side; price: number; qty: number }
  | { t: number; kind: "market"; id: number; side: Side; qty: number }
  | { t: number; kind: "cancel"; id: number };
export interface Fill { taker: number; maker: number; price: number; qty: number; side: Side }
interface Resting { id: number; qty: number }

export class LimitBook {
  readonly bids = new Map<number, Resting[]>();     // price -> FIFO queue
  readonly asks = new Map<number, Resting[]>();
  private where = new Map<number, [Side, number]>();

  best() {
    return { bid: this.bids.size ? Math.max(...this.bids.keys()) : null, ask: this.asks.size ? Math.min(...this.asks.keys()) : null };
  }

  apply(ev: Event): Fill[] {
    if (ev.kind === "cancel") { this.remove(ev.id); return []; }
    const fills: Fill[] = [];
    const opp = ev.side === "buy" ? this.asks : this.bids;
    let left = ev.qty;
    const crosses = (p: number) => ev.kind === "market" || (ev.side === "buy" ? p <= ev.price : p >= ev.price);
    while (left > 0 && opp.size) {
      const p = ev.side === "buy" ? Math.min(...opp.keys()) : Math.max(...opp.keys());
      if (!crosses(p)) break;
      const q = opp.get(p)!;
      while (left > 0 && q.length) {
        const m = q[0], take = Math.min(left, m.qty);
        fills.push({ taker: ev.id, maker: m.id, price: p, qty: take, side: ev.side });
        m.qty -= take; left -= take;
        if (m.qty === 0) { q.shift(); this.where.delete(m.id); }
      }
      if (!q.length) opp.delete(p);
    }
    if (ev.kind === "limit" && left > 0) {               // the rest joins the back of its price queue
      const own = ev.side === "buy" ? this.bids : this.asks;
      if (!own.has(ev.price)) own.set(ev.price, []);
      own.get(ev.price)!.push({ id: ev.id, qty: left });
      this.where.set(ev.id, [ev.side, ev.price]);
    }
    return fills;
  }

  private remove(id: number) {
    const w = this.where.get(id); if (!w) return;
    const side = w[0] === "buy" ? this.bids : this.asks, q = side.get(w[1])!;
    q.splice(q.findIndex((r) => r.id === id), 1);
    if (!q.length) side.delete(w[1]);
    this.where.delete(id);
  }

  depth(levels: number) {
    const lv = (m: Map<number, Resting[]>, dir: 1 | -1) => [...m.entries()].sort((a, b) => dir * (a[0] - b[0])).slice(0, levels).map(([p, q]) => [p, q.reduce((s, r) => s + r.qty, 0)] as [number, number]);
    return { bids: lv(this.bids, -1), asks: lv(this.asks, 1) };
  }
}

/** SYNTHETIC order flow: a random-walk fair value, passive quotes around it, some aggression and cancels. */
export function syntheticTape(seed: number, steps: number): Event[] {
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const out: Event[] = [], live: number[] = [];
  let fair = 10000, id = 0;
  for (let t = 0; t < steps; t++) {
    fair += (rnd() - 0.5) * 2;
    const r = rnd();
    if (r < 0.62) {
      const side: Side = rnd() < 0.5 ? "buy" : "sell", off = 1 + Math.floor(rnd() * 8);
      const price = Math.round(side === "buy" ? fair - off : fair + off);
      out.push({ t, kind: "limit", id: ++id, side, price, qty: 1 + Math.floor(rnd() * 5) }); live.push(id);
    } else if (r < 0.8 && live.length) {
      out.push({ t, kind: "cancel", id: live.splice(Math.floor(rnd() * live.length), 1)[0] });
    } else {
      out.push({ t, kind: "market", id: ++id, side: rnd() < 0.5 ? "buy" : "sell", qty: 1 + Math.floor(rnd() * 4) });
    }
  }
  return out;
}
