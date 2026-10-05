// Count-up for headline figures: "89,048", "0.09 s", "top 5%", "−96%", "700B+" animate their number
// and keep the surrounding text; at t = 1 the output is exactly the original string.
export interface Figure { pre: string; n: number; dec: number; grouped: boolean; post: string }

export function parseFigure(s: string): Figure | null {
  const m = s.match(/^(\D*?)(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const grouped = m[2].includes(",");
  return { pre: m[1], n: Number(m[2].replace(/,/g, "")), dec: grouped ? 0 : (m[2].split(".")[1] ?? "").length, grouped, post: m[3] };
}

/** Ratios ("25×") count up from 1× (the baseline itself), everything else from 0. */
export function figureAt(f: Figure, t: number): string {
  const from = /^\s*×/.test(f.post) ? Math.min(1, f.n) : 0;
  const v = from + (f.n - from) * Math.min(1, Math.max(0, t));
  return f.pre + (f.grouped ? Math.round(v).toLocaleString("en-US") : v.toFixed(f.dec)) + f.post;
}
