// Okapi BM25, the lexical half of a retrieval stack: a query term scores a passage by how rare the
// term is across all passages (IDF) and how often it appears in this one, saturating with repeats
// (k1) and normalised for passage length (b). Every score is broken down per term.
export interface Passage { id: string; title: string; href: string; text: string }
const STOP = new Set("a an and are as at be by for from has have in into is it its of on or that the this to was were which with not no can i my we our you your".split(" "));

export const tokens = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP.has(t));

export interface Index { docs: { p: Passage; tf: Map<string, number>; len: number }[]; df: Map<string, number>; avg: number }

export function buildIndex(ps: Passage[]): Index {
  const docs = ps.map((p) => {
    const tf = new Map<string, number>(), ts = tokens(`${p.title} ${p.text}`);
    for (const t of ts) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { p, tf, len: ts.length };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  return { docs, df, avg: docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length) };
}

export interface Hit { p: Passage; score: number; terms: [string, number][] }

export function search(ix: Index, q: string, how: "bm25" | "count" = "bm25", k1 = 1.2, b = 0.75): Hit[] {
  const qs = [...new Set(tokens(q))], N = ix.docs.length;
  return ix.docs.map((d) => {
    const terms = qs.map((t): [string, number] => {
      const f = d.tf.get(t) ?? 0;
      if (how === "count") return [t, f];
      const n = ix.df.get(t) ?? 0, idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      return [t, f ? idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / ix.avg)) : 0];
    }).filter(([, s]) => s > 0);
    return { p: d.p, score: terms.reduce((s, [, v]) => s + v, 0), terms };
  }).filter((h) => h.score > 0).sort((x, y) => y.score - x.score);
}
