// Every inline Lab experiment, by id: the Lab and the project pages mount the same module through this one map.
// mountExperiment adds the shared reset when an experiment has none of its own, so every experiment can be replayed.
type Exp = { mount: (stage: HTMLElement, controls: HTMLElement) => void | Promise<void> };
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
  "fatqat-bench": () => import("./exp/fatqat-bench"),
};

const RESET = /reset|start over|replay/i;
export async function mountExperiment(id: string, stage: HTMLElement, controls: HTMLElement) {
  stage.dataset.loadState = "loading";
  stage.setAttribute("aria-busy", "true");
  const failed = (error: unknown) => {
    console.warn(`Lab experiment ${id} could not open`, error);
    stage.dataset.loadState = "error";
    stage.setAttribute("aria-busy", "false");
    const message = document.createElement("p");
    message.className = "lab-note"; message.setAttribute("role", "alert");
    message.textContent = "Could not open this experiment. Reload to retry, or choose another experiment.";
    const retry = document.createElement("button");
    retry.type = "button"; retry.className = "lab-btn"; retry.textContent = "Reload to retry";
    retry.addEventListener("click", async () => {
      retry.disabled = true;
      try {
        // Chromium caches a failed import per document; WebKit also caches failed preloads across
        // reloads. Refresh Vite's same-origin preloads before creating a fresh module map.
        const assets = [...document.querySelectorAll<HTMLLinkElement>('link[rel="modulepreload"], link[rel="stylesheet"]')]
          .map((link) => link.href).filter((href) => new URL(href).origin === location.origin);
        await Promise.all(assets.map(async (href) => {
          const response = await fetch(href, { cache: "reload" });
          if (!response.ok) throw new Error(`Experiment asset HTTP ${response.status}`);
          await response.arrayBuffer();
        }));
        location.reload();
      } catch (error) {
        console.warn(`Lab experiment ${id} retry failed`, error);
        message.textContent = "The experiment files are still unavailable. Check your connection, then reload to retry.";
        retry.disabled = false;
      }
    });
    stage.replaceChildren(message); controls.replaceChildren(retry);
  };
  try {
    const m = await LOAD[id]();
    const run = async () => {
      stage.dataset.loadState = "loading"; stage.setAttribute("aria-busy", "true");
      stage.replaceChildren(); controls.replaceChildren();
      try {
        await m.mount(stage, controls);
        // Data-backed experiments may render their own recoverable load failure.
        if (stage.dataset.loadState !== "error") stage.dataset.loadState = "ready";
        stage.setAttribute("aria-busy", "false");
        if (![...controls.querySelectorAll("button")].some((b) => RESET.test(b.textContent ?? ""))) {
          const b = document.createElement("button");
          b.type = "button"; b.className = "lab-btn reset"; b.dataset.reset = "";
          b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg><span>reset</span>';
          b.addEventListener("click", () => void run());
          controls.append(b);
        }
      } catch (error) { failed(error); }
    };
    await run();
  } catch (error) { failed(error); }
}
