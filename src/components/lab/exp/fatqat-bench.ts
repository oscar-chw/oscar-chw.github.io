import { h, segmented, selectSegment, button, readout } from "../ui";
import { RotateCcw } from "lucide";
import dataset from "../../../../sources/fatqat-cuda/portfolio-demo-2026-10-14.json";
import "./fatqat-bench.css";

type Output = "observable" | "full_state";
type Mode = "compensated" | "plain";
const DEFAULTS = { qubits: 24, output: "observable" as Output, mode: "compensated" as Mode };
const fmt = (n: number) => n >= 100 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n.toFixed(2);

export function mount(stage: HTMLElement, controls: HTMLElement) {
  let { qubits, output, mode } = DEFAULTS;
  stage.dataset.computation = "recorded";

  const result = h("div", { class: "fb-result", "aria-live": "polite" });
  const draw = () => {
    const row = dataset.rows.find((r) => r.mode === mode && r.output === output && r.qubits === qubits);
    if (!row) throw new Error(`No recorded FatQat measurement for ${mode}/${output}/${qubits}`);
    const source = dataset.sources.find((s) => s.mode === mode);
    if (!source) throw new Error(`No source metadata for FatQat mode ${mode}`);
    const max = Math.max(row.cpu_median_ms, row.gpu_median_ms);
    const bar = (label: string, median: number, bounds: number[], color: string) => h("div", { class: "fb-lane" },
      h("span", { class: "fb-label mono" }, label),
      h("span", { class: "fb-track", role: "img", "aria-label": `${label} median ${fmt(median)} milliseconds; sample IQR ${fmt(bounds[0])} to ${fmt(bounds[1])} milliseconds` },
        h("span", { class: "fb-bar", style: `--fb-width:${(median / max * 100).toFixed(3)}%;--fb-color:${color}` })),
      h("span", { class: "fb-value mono" }, `${fmt(median)} ms`, h("small", {}, `IQR ${fmt(bounds[0])}–${fmt(bounds[1])} ms`)));

    const sourceLink = h("a", { href: source.url, target: "_blank", rel: "noreferrer" }, `recorded source (${mode}) ↗`);
    result.replaceChildren(
      h("p", { class: "fb-tag mono" }, h("b", {}, "PRECOMPUTED · HISTORICAL"), " recorded warm-call measurements"),
      h("p", { class: "fb-question" }, `For ${qubits} qubits and ${output === "observable" ? "observable output" : "full-state output"}, how do the recorded warm-call medians compare?`),
      h("div", { class: "fb-chart", "aria-label": "CPU and GPU recorded warm-call median timings; bars share a scale normalized to the larger median in this selected pair" },
        bar("CPU · 32 threads", row.cpu_median_ms, row.cpu_iqr_ms, "var(--muted)"),
        bar("GPU", row.gpu_median_ms, row.gpu_iqr_ms, "var(--accent)")),
      h("p", { class: "fb-note" }, `Bar lengths share a pair scale: the larger of this row's CPU and GPU medians fills the track.`),
      readout([["CPU time / GPU time · this row", `${(row.cpu_median_ms / row.gpu_median_ms).toFixed(2)}×`]]),
      h("p", { class: "fb-insight" }, output === "observable"
        ? "Return the answer you need: the observable path reduces the state to a small result. It avoids copying every amplitude back to the host."
        : "Return the whole state: every amplitude comes back to the host. That transfer is part of this timing, so faster gate execution does not translate into the same overall ratio."),
      h("p", { class: "fb-note" }, `Each product mode uses its own recorded CPU baseline. Switching modes changes the source run, so these are not same-run head-to-head timings. The ratio above uses only this selected row's CPU median.`),
      h("details", { class: "fb-method" }, h("summary", {}, "Measurement method and limits"),
        h("p", { class: "fb-note" }, `complex128 statevector; five warm calls per median; simplification off. Timed: warm public call including synchronisation and requested host output. Excluded: imports, construction and first-call compilation. CPU baseline: compiled Numba, fixed 32 threads, not all-core.`),
        h("p", { class: "fb-note" }, "IQR means sample interquartile range, not a confidence interval. Speed does not establish accuracy or whole-program performance."),
        h("a", { href: dataset.documentation_release.readme }, "Pinned method and reproduction instructions ↗")),
      h("p", { class: "fb-source mono" }, sourceLink, ` · ${source.date} · code revision `, h("code", {}, source.measured_code_revision)),
    );
  };

  const qubitControl = segmented("qubits", ["24", "26", "28"], String(qubits), (v) => { qubits = Number(v); draw(); });
  const outputControl = segmented("requested output", ["observable", "full state"], "observable", (v) => { output = v === "observable" ? "observable" : "full_state"; draw(); });
  const modeControl = segmented("product mode", ["compensated", "plain"], mode, (v) => { mode = v as Mode; draw(); });

  controls.append(qubitControl, outputControl, modeControl,
    button("reset", () => {
      ({ qubits, output, mode } = DEFAULTS);
      selectSegment(qubitControl, String(qubits));
      selectSegment(outputControl, "observable");
      selectSegment(modeControl, mode);
      draw();
    }, "", RotateCcw),
  );
  stage.append(result);
  draw();
}
