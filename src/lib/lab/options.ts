// Option maths, exact formulas computed in the browser: Black–Scholes prices and Greeks for a
// European option on a non-dividend stock, and an SSVI implied-volatility surface (Gatheral and
// Jacquier's power-law parametrisation) for the smile and its term structure.
const SQ2PI = Math.sqrt(2 * Math.PI);
export const pdf = (x: number) => Math.exp(-x * x / 2) / SQ2PI;

/** Standard normal CDF via Abramowitz–Stegun 7.1.26 (absolute error below 1.5e-7). */
export function cdf(x: number) {
  const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z);
  const erf = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z);
  return x >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

export interface Quote { call: number; put: number; delta: number; gamma: number; vega: number; theta: number }

/** Spot S, strike K, years to expiry T, rate r, volatility sigma (both annual, as decimals). Vega per 1 vol point, theta per day. */
export function blackScholes(S: number, K: number, T: number, r: number, sigma: number): Quote {
  const t = Math.max(T, 1e-8), sq = sigma * Math.sqrt(t), disc = Math.exp(-r * t);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * t) / sq, d2 = d1 - sq;
  const call = S * cdf(d1) - K * disc * cdf(d2), put = K * disc * cdf(-d2) - S * cdf(-d1);
  return {
    call, put,
    delta: cdf(d1),
    gamma: pdf(d1) / (S * sq),
    vega: S * pdf(d1) * Math.sqrt(t) / 100,
    theta: (-S * pdf(d1) * sigma / (2 * Math.sqrt(t)) - r * K * disc * cdf(d2)) / 365,
  };
}

/** SSVI total implied variance at log-moneyness k for ATM total variance theta = atm^2 * T. */
export function ssviVol(k: number, T: number, atm: number, rho: number, eta: number) {
  const theta = atm * atm * T, phi = eta / Math.sqrt(theta);
  const w = (theta / 2) * (1 + rho * phi * k + Math.sqrt((phi * k + rho) ** 2 + 1 - rho * rho));
  return Math.sqrt(w / T);
}

/** A ny-by-nx grid of f over x in [x0, x1] (columns) and y in [y0, y1] (rows). */
export function grid(nx: number, ny: number, [x0, x1]: [number, number], [y0, y1]: [number, number], f: (x: number, y: number) => number) {
  return Array.from({ length: ny }, (_, j) => Array.from({ length: nx }, (_, i) => f(x0 + (i / (nx - 1)) * (x1 - x0), y0 + (j / (ny - 1)) * (y1 - y0))));
}
