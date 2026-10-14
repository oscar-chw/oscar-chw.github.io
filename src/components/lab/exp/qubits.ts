import { run, probs, type Gate } from "../../../lib/lab/qubits";
import { h, segmented, button } from "../ui";
import { Sparkles, RotateCcw } from "lucide";

export function mount(stage: HTMLElement, controls: HTMLElement) {
  let n = 3, target = 0, gates: Gate[] = [];
  const bars = h("div", { class: "amps" }), circuit = h("ol", { class: "circuit mono", "aria-label": "Circuit so far" });
  const res = h("p", { class: "lab-result", "aria-live": "polite" });
  const status=h('p',{class:'qubit-status lab-note',role:'status'}),norm=h('p',{class:'qubit-norm mono'});
  const gateButtons:HTMLButtonElement[]=[];
  const track=(b:HTMLButtonElement)=>{gateButtons.push(b);return b;};
  const undo=button('Undo last gate',()=>{gates.pop();draw();});
  stage.append(bars,circuit,res,status,norm);
  const draw = () => {
    const s = run(n, gates), p = probs(s);
    const full=gates.length>=24;gateButtons.forEach(b=>b.disabled=full);undo.disabled=!gates.length;
    status.textContent=full?'Circuit limit reached: use Undo last gate or reset to edit it.':`${gates.length} of 24 gates. Add a gate or undo the most recent one.`;
    norm.textContent='Total probability: '+p.reduce((a,b)=>a+b,0).toFixed(6);
    bars.replaceChildren(...p.map((v, i) => {
      const phase = Math.atan2(s[i][1], s[i][0]);
      return h("div", { class: "amp" },
        h("i", { style: `--p:${v.toFixed(4)};--hue:${((phase / Math.PI) * 180 + 172 + 360) % 360}` }),
        h("span", { class: "mono" }, `|${i.toString(2).padStart(n, "0")}⟩`),
        h("b", { class: "mono" }, v < 0.0005 ? "0" : v.toFixed(3)));
    }));
    circuit.replaceChildren(...(gates.length ? gates : []).map((g) => h("li", {}, g.g === "CNOT" ? `CNOT ${g.c}→${g.t}` : `${g.g} q${g.q}`)));
    if (!gates.length) circuit.append(h("li", { class: "empty" }, "|0…0⟩: add a gate"));
    // the result in words, and the scale it stands for: FatQat's GPU does this for 2^24 to 2^28 amplitudes per gate
    const amps = 2 ** n;
    res.textContent = gates.length
      ? `${gates.length} gate${gates.length > 1 ? "s" : ""} × ${amps} amplitudes = ${(gates.length * amps).toLocaleString("en-US")} amplitude updates. At 24–28 qubits the same circuit updates ${(2 ** 24).toLocaleString("en-US")}–${(2 ** 28).toLocaleString("en-US")} amplitudes per gate, which is what the GPU backend is for.`
      : `${amps} amplitudes, all in |${"0".repeat(n)}⟩. Every gate you add updates every one of them.`;
  };
  const add = (g: Gate) => { if (gates.length < 24) { gates.push(g); draw(); } };
  const tgt = h("div");
  const rebuildTarget = () => tgt.replaceChildren(segmented("target qubit", Array.from({ length: n }, (_, i) => `q${i}`), `q${target}`, (v) => (target = Number(v.slice(1)))));
  rebuildTarget();
  controls.append(
    segmented("qubits", ["2", "3", "4"], String(n), (v) => { n = Number(v); target = 0; gates = []; rebuildTarget(); draw(); }),
    tgt, undo,
    h("div", { class: "chips" }, ...(["H", "X", "Z", "S", "T"] as const).map((g) => track(button(g, () => add({ g, q: target }), "chip mono"))),
      track(button("CNOT → next", () => add({ g: "CNOT", c: target, t: (target + 1) % n }), "chip mono"))),
    h("div", { class: "chips" }, button("Bell state", () => { gates = [{ g: "H", q: 0 }, { g: "CNOT", c: 0, t: 1 }]; draw(); }, "chip mono", Sparkles), button("reset", () => { gates = []; draw(); }, "chip mono", RotateCcw)),
  );
  controls.append(button('Export circuit and state',()=>{
    const state=run(n,gates),href=URL.createObjectURL(new Blob([JSON.stringify({execution:'Browser state-vector simulation',qubits:n,gates,state,probabilities:probs(state)},null,2)+'\n'],{type:'application/json'}));h('a',{href,download:'circuit-state.json'}).click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  }));
  draw();
}
