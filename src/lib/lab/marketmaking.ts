// A SYNTHETIC market-making toy: quote around a drifting fair value, skew the quotes against the
// inventory you carry, and watch inventory and marked-to-market P&L. Takers arrive at random and
// hit whichever side is cheaper relative to fair value.
import { rng, gauss } from "./series";

export interface MMParams { spread: number; skew: number; steps?: number; seed?: number }
export interface MMPath { fair: number[]; bid: number[]; ask: number[]; inventory: number[]; pnl: number[]; fills: number }

export function simulate({ spread, skew, steps = 600, seed = 3 }: MMParams): MMPath {
  const r = rng(seed);
  let fair = 100, inv = 0, cash = 0, fills = 0;
  const out: MMPath = { fair: [], bid: [], ask: [], inventory: [], pnl: [], fills: 0 };
  for (let t = 0; t < steps; t++) {
    fair += 0.05 * gauss(r);
    const centre = fair - skew * inv;                 // long inventory -> quote lower to sell it down
    const bid = centre - spread / 2, ask = centre + spread / 2;
    // a taker's private value is fair value plus noise; they trade if our quote beats it
    const v = fair + 0.6 * gauss(r);
    if (r() < 0.5) { if (v > ask) { inv -= 1; cash += ask; fills++; } }
    else if (v < bid) { inv += 1; cash -= bid; fills++; }
    out.fair.push(fair); out.bid.push(bid); out.ask.push(ask); out.inventory.push(inv); out.pnl.push(cash + inv * fair);
  }
  out.fills = fills;
  return out;
}
