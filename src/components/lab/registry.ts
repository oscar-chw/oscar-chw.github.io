// Every inline Lab experiment, by id: the Lab and the project pages mount the same module through this one map.
// mountExperiment adds the shared reset when an experiment has none of its own, so every experiment can be replayed.
type Exp = { mount: (stage: HTMLElement, controls: HTMLElement) => void };
export const LOAD: Record<string, () => Promise<Exp>> = {
    gatedbuild: () => import("./exp/gatedbuild"),
    search: () => import("./exp/search"),
    lostupdates: () => import("./exp/lostupdates"),
    options: () => import("./exp/options"),
    dna: () => import("./exp/dna"),
    candles: () => import("./exp/candles"),
    guard: () => import("./exp/guard"),
    qubits: () => import("./exp/qubits"),
    "point-in-time": () => import("./exp/asof"),
    lookahead: () => import("./exp/lookahead"),
    marketmaking: () => import("./exp/marketmaking"),
    imc: () => import("./exp/imc"),
    factors: () => import("./exp/factors"),
    multitest: () => import("./exp/multitest"),
    policy: () => import("./exp/policy"),
    timetable: () => import("./exp/timetable"),
    gate: () => import("./exp/gate"),
  compensated: () => import("./exp/compensated"),
};

const RESET = /reset|start over|replay/i;
export async function mountExperiment(id: string, stage: HTMLElement, controls: HTMLElement) {
  const m = await LOAD[id]();
  const run = () => {
    stage.replaceChildren(); controls.replaceChildren(); m.mount(stage, controls);
    if (![...controls.querySelectorAll("button")].some((b) => RESET.test(b.textContent ?? ""))) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lab-btn reset"; b.dataset.reset = "";
      b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg><span>reset</span>';
      b.addEventListener("click", run);
      controls.append(b);
    }
  };
  run();
}
