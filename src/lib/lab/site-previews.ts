// Build-computed results for the flagship pages (point-in-time reads for QTS, the gated build for the AI quant research
// system), computed by the same library code the Lab runs live. Stored under sources/site-experiments/ so check-numbers can
// trace every figure; site-previews.test.ts recomputes them and fails if a stored file and the code ever disagree.
import { asOf, STORE, KEYS, DAYS } from "./asof";
import { chain, runGate, claimDone, ready } from "./gatedbuild";

export function pointInTime() {
  const at = (k: string, t: number) => { const found = asOf(STORE, k, t); return found ? String(found.value) : "not known yet"; };
  const early = 1, late = 6;
  return {
    early: DAYS[early], late: DAYS[late],
    rows: KEYS.map((k) => ({ field: k, early: at(k, early), late: at(k, late), hiddenEarly: String(STORE.filter((x) => x.key === k && x.known > early).length) })),
  };
}

export function gatedBuild() {
  let ts = chain();
  const log: string[] = [];
  for (const id of [1, 2, 3]) ts = runGate(ts, id, true, "").tasks;
  log.push("gates 1, 2 and 3 pass: those tasks are done");
  ts = runGate(ts, 4, false, "pytest -q exited 1: a planted bug in the function").tasks;
  log.push("task 4's gate fails: dated evidence is recorded and the task returns to pending");
  log.push(claimDone(ts, 4).error);
  log.push(runGate(ts, 5, true, "").error ?? "");
  return { tasks: ts.map((t) => ({ id: String(t.id), title: t.title, gate: t.gate, state: t.state, evidence: t.evidence })), ready: ready(ts).map(String), log };
}
