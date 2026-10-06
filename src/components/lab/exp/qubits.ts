import { run, probs, type Gate } from "../../../lib/lab/qubits";
import { h, segmented, button } from "../ui";

export function mount(stage: HTMLElement, controls: HTMLElement) {
  let n = 3, target = 0, gates: Gate[] = [];
  const bars = h("div", { class: "amps" }), circuit = h("ol", { class: "circuit mono", "aria-label": "Circuit so far" });
  stage.append(bars, circuit);
  const draw = () => {
    const s = run(n, gates), p = probs(s);
    bars.replaceChildren(...p.map((v, i) => {
      const phase = Math.atan2(s[i][1], s[i][0]);
      return h("div", { class: "amp" },
        h("i", { style: `--p:${v.toFixed(4)};--hue:${((phase / Math.PI) * 180 + 172 + 360) % 360}` }),
        h("span", { class: "mono" }, `|${i.toString(2).padStart(n, "0")}⟩`),
        h("b", { class: "mono" }, v < 0.0005 ? "0" : v.toFixed(3)));
    }));
    circuit.replaceChildren(...(gates.length ? gates : []).map((g) => h("li", {}, g.g === "CNOT" ? `CNOT ${g.c}→${g.t}` : `${g.g} q${g.q}`)));
    if (!gates.length) circuit.append(h("li", { class: "empty" }, "|0…0⟩: add a gate"));
  };
  const add = (g: Gate) => { if (gates.length < 24) { gates.push(g); draw(); } };
  const tgt = h("div");
  const rebuildTarget = () => tgt.replaceChildren(segmented("target qubit", Array.from({ length: n }, (_, i) => `q${i}`), `q${target}`, (v) => (target = Number(v.slice(1)))));
  rebuildTarget();
  controls.append(
    segmented("qubits", ["2", "3", "4"], String(n), (v) => { n = Number(v); target = 0; gates = []; rebuildTarget(); draw(); }),
    tgt,
    h("div", { class: "chips" }, ...(["H", "X", "Z", "S", "T"] as const).map((g) => button(g, () => add({ g, q: target }), "chip mono")),
      button("CNOT → next", () => add({ g: "CNOT", c: target, t: (target + 1) % n }), "chip mono")),
    h("div", { class: "chips" }, button("Bell state", () => { gates = [{ g: "H", q: 0 }, { g: "CNOT", c: 0, t: 1 }]; draw(); }, "chip mono"), button("reset", () => { gates = []; draw(); }, "chip mono")),
  );
  draw();
}
