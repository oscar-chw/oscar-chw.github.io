// A gated work graph, as in the AI quant research system's centrepiece build, on a SYNTHETIC
// five-task chain: a task is done only when its gate passes. A failed gate never leaves a
// "failed" state; it records dated evidence and the task goes back to pending.
export type State = "pending" | "done";
export interface Task { id: number; title: string; gate: string; needs: number[]; state: State; evidence: string[] }

export function chain(): Task[] {
  const t = (id: number, title: string, gate: string, needs: number[]): Task => ({ id, title, gate, needs, state: "pending", evidence: [] });
  return [
    t(1, "Read the chapter", "notes cite every page they use", []),
    t(2, "Extract claims", "each claim paraphrased and cited", [1]),
    t(3, "Write a test per claim", "tests collected, none empty", [2]),
    t(4, "Implement the function", "pytest -q exits 0", [3]),
    t(5, "Review", "a fresh reviewer finds nothing", [4]),
  ];
}

/** Tasks that can start now: pending, with every dependency done. */
export function ready(ts: Task[]): number[] {
  const done = new Set(ts.filter((t) => t.state === "done").map((t) => t.id));
  return ts.filter((t) => t.state === "pending" && t.needs.every((n) => done.has(n))).map((t) => t.id);
}

/** Run a task's gate. Only a ready task can run; pass marks it done, fail appends evidence and leaves it pending. */
export function runGate(ts: Task[], id: number, pass: boolean, note: string): { tasks: Task[]; error?: string } {
  if (!ready(ts).includes(id)) return { tasks: ts, error: `task ${id} is not ready: its dependencies are not done` };
  return { tasks: ts.map((t) => t.id !== id ? t : pass ? { ...t, state: "done" } : { ...t, evidence: [...t.evidence, note] }) };
}

/** An agent saying "done" changes nothing: only the gate's exit code can. */
export function claimDone(ts: Task[], id: number): { tasks: Task[]; error: string } {
  return { tasks: ts, error: `task ${id} stays ${ts.find((t) => t.id === id)?.state}: a claim is not evidence, run its gate` };
}
