// Concurrent writers on one shared record, SYNTHETIC: each writer reads the record, works, then
// writes it back plus one. A seeded scheduler interleaves them. "Last write wins" overwrites
// whatever landed in between, so those updates are lost; "compare-and-swap" commits only if the
// version it read is still current, and otherwise re-reads and retries, so nothing is lost.
import { rng } from "./series";

export type Mode = "last write wins" | "compare-and-swap";
export interface Step { writer: number; kind: "read" | "commit" | "lost" | "retry" }
export interface Race { expected: number; final: number; lost: number; retries: number; steps: Step[] }

export function race(seed: number, writers: number, each: number, mode: Mode): Race {
  const r = rng(seed), steps: Step[] = [];
  let value = 0, version = 0, retries = 0;
  const left = Array(writers).fill(each);
  const held: ({ value: number; version: number } | null)[] = Array(writers).fill(null);
  while (left.some((n, w) => n > 0 || held[w])) {
    const live = left.map((n, w) => (n > 0 || held[w] ? w : -1)).filter((w) => w >= 0);
    const w = live[Math.floor(r() * live.length)];
    const h = held[w];
    if (!h) { held[w] = { value, version }; steps.push({ writer: w, kind: "read" }); continue; }
    if (mode === "compare-and-swap" && h.version !== version) {
      held[w] = null; retries++; steps.push({ writer: w, kind: "retry" }); continue;   // stale: read again
    }
    value = h.value + 1; version++; held[w] = null; left[w]--;   // overwrites any commit made since this read
    steps.push({ writer: w, kind: h.version !== version - 1 ? "lost" : "commit" });
  }
  return { expected: writers * each, final: value, lost: writers * each - value, retries, steps };
}
