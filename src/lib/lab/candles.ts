// Candle timing, on SYNTHETIC 5-minute candles: candle i opens at 5i and its close is only known
// at 5i + 5. A rule decides at each candle's open from "the latest candle". Stamp candles at their
// open time and the latest candle is the one still trading, so the rule reads a close from the
// future. The availability audit checks every read against when its close was actually known.
import { returns, cumulative } from "./series";

export type Stamp = "open" | "close";
export interface Run { equity: number[]; market: number[]; leaks: number; decisions: number }

export function walkForward(seed: number, n: number, stamp: Stamp): Run {
  const r = returns(seed, n), pnl: number[] = [];
  let leaks = 0, decisions = 0;
  for (let i = 0; i < n; i++) {
    // latest candle whose timestamp is at or before the decision time 5i
    const used = stamp === "open" ? i : i - 1;
    if (used < 0) { pnl.push(0); continue; }
    decisions++;
    if (5 * used + 5 > 5 * i) leaks++;                    // its close was not yet known at 5i
    pnl.push(Math.sign(r[used]) * r[i]);
  }
  return { equity: cumulative(pnl), market: cumulative(r), leaks, decisions };
}
