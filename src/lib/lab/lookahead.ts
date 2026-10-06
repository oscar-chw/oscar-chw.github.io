// Look-ahead bias, on SYNTHETIC returns: a trend-following rule that decides from yesterday's
// return (honest) against the same rule allowed to see today's return before trading (leaky).
import { returns, cumulative } from "./series";

export interface Backtest { honest: number[]; leaky: number[]; market: number[] }

/** Equity curves (cumulative log return) for the honest rule, the leaky rule and buy-and-hold. */
export function backtest(seed: number, n = 500): Backtest {
  const r = returns(seed, n);
  const honest: number[] = [], leaky: number[] = [];
  for (let t = 0; t < n; t++) {
    honest.push(t === 0 ? 0 : Math.sign(r[t - 1]) * r[t]);   // signal known at decision time
    leaky.push(Math.sign(r[t]) * r[t]);                      // signal uses the return it is trading
  }
  return { honest: cumulative(honest), leaky: cumulative(leaky), market: cumulative(r) };
}
