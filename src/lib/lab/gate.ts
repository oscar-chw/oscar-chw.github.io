// A SYNTHETIC decision gate (the final-year project's idea, simplified): an agent proposes actions,
// a model scores each one's risk of breaking a rule, and the gate abstains above a threshold.
// Empirical calibration picks a threshold using labelled calibration actions. The denominator is
// all proposals, not only accepted actions; this is not a finite-sample conformal guarantee.
import { rng, gauss } from "./series";

export interface Action { risk: number; breaks: boolean }

/** Actions whose true chance of breaking a rule rises with the (noisy) risk score. */
export function actions(seed: number, n: number): Action[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const latent = gauss(r);
    const breaks = r() < 1 / (1 + Math.exp(-(latent * 2.2 - 1.6)));
    return { risk: 1 / (1 + Math.exp(-(latent + 0.5 * gauss(r)))), breaks };
  });
}

export interface Outcome { acted: number; abstained: number; violations: number; violationRate: number; abstainRate: number }

export function evaluate(xs: Action[], threshold: number): Outcome {
  let acted = 0, violations = 0;
  for (const a of xs) if (a.risk < threshold) { acted++; if (a.breaks) violations++; }
  const abstained = xs.length - acted;
  return { acted, abstained, violations, violationRate: xs.length ? violations / xs.length : 0, abstainRate: xs.length ? abstained / xs.length : 0 };
}

/** Largest boundary whose empirical violations / all calibration proposals is <= alpha. */
export function calibrate(cal: Action[], alpha: number): number {
  if(!cal.length)return 0;
  const cands = [...new Set([0,...cal.map((a) => a.risk),1+Number.EPSILON])].sort((a, b) => a - b);
  let best = 0;
  for (const t of cands) if (evaluate(cal, t).violationRate <= alpha) best = t; else break;
  return best;
}
