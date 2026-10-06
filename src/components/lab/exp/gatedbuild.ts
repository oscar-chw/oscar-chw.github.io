import { chain, ready, runGate, claimDone, type Task } from "../../../lib/lab/gatedbuild";
import { h, segmented, button } from "../ui";
import { Play, MessageSquare, RotateCcw } from "lucide";

// The centrepiece build's rule, played by hand: run the gate of whatever is ready; plant a bug and
// watch the gate send the task back with evidence; ask the agent to just say "done" and see nothing move.
export function mount(stage: HTMLElement, controls: HTMLElement) {
  let ts: Task[] = chain(), bug = "correct", runs = 0;
  const list = h("ol", { class: "gb mono", "aria-live": "polite" });
  const msg = h("p", { class: "gb-msg mono", role: "status" }, "task 1 is ready: run its gate");
  const day = new Date().toISOString().slice(0, 10);

  const draw = () => {
    const r = ready(ts);
    list.replaceChildren(...ts.map((t) => {
      const st = t.state === "done" ? "done" : r.includes(t.id) ? "ready" : "blocked";
      const run = button("run gate", () => {
        runs++;
        const pass = !(t.id === 4 && bug === "has a bug");
        const out = runGate(ts, t.id, pass, `${day} run ${runs}: ${t.gate.split(" exits")[0]} → 1 test failing`);
        ts = out.tasks;
        msg.textContent = out.error ?? (pass ? `gate passed: task ${t.id} done` : `gate failed: task ${t.id} back to pending, evidence recorded`);
        draw();
      }, "", Play);
      run.toggleAttribute("disabled", st !== "ready");
      return h("li", { class: `gb-t ${st}` },
        h("span", { class: "gb-n" }, String(t.id).padStart(2, "0")),
        h("span", { class: "gb-b" }, h("b", {}, t.title), h("span", { class: "gb-g" }, `gate: ${t.gate}`),
          ...t.evidence.map((e) => h("span", { class: "gb-e" }, e))),
        h("span", { class: "gb-s" }, st), run);
    }));
  };
  stage.append(h("div", { class: "gbw" }, list, msg));
  controls.append(
    segmented("the agent's code for task 4", ["correct", "has a bug"], bug, (v) => { bug = v; }),
    button("agent: \"the next task is done\"", () => { const id = ready(ts)[0]; msg.textContent = id ? claimDone(ts, id).error : "nothing left to claim"; }, "", MessageSquare),
    button("start over", () => { ts = chain(); runs = 0; msg.textContent = "task 1 is ready: run its gate"; draw(); }, "", RotateCcw),
  );
  draw();
}
