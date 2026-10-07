import { run, score, STEPS, DRIFT_FROM, DRIFT_TO } from "../../../lib/lab/kalman";
import { h, chart, slider, readout, button, css } from "../ui";
import { Shuffle } from "lucide";

export function mount(stage: HTMLElement, controls: HTMLElement) {
  const price = chart("Mid price, true fair value and the Kalman fair value", 760, 240);
  const ns = "http://www.w3.org/2000/svg", strip = document.createElementNS(ns, "svg");
  strip.setAttribute("viewBox", "0 0 760 118"); strip.setAttribute("class", "chart gk"); strip.setAttribute("role", "img");
  strip.setAttribute("aria-label", "When each drift gate fires: green inside the real drift, red outside it");
  stage.append(h("p", { class: "lab-note" }, "The market drifts only inside the shaded stretch. Each tick below is a step where a gate says \"drift\": green when it is real, red when noise fooled it. Raise the noise and watch the fixed window start seeing drift everywhere."), price.el, strip);
  let noise = 0.6, seed = 1;
  const ro = document.createElement("div");
  const X = (i: number) => 40 + (i / (STEPS - 1)) * (760 - 56);
  const ticks = (fires: boolean[], y: number) => fires.map((f, t) => f ? `<rect x="${X(t).toFixed(1)}" y="${y}" width="2" height="20" class="${t >= DRIFT_FROM && t < DRIFT_TO ? "gk-hit" : "gk-false"}"/>` : "").join("");
  const draw = () => {
    const r = run(noise, seed), f = score(r.fixed), k = score(r.kalman);
    price.draw([
      { values: r.mid, color: css("--muted"), label: "mid (noisy)", width: 1 },
      { values: r.fair, color: css("--ink"), label: "true fair value", dash: true, width: 1.5 },
      { values: r.level, color: css("--accent"), label: "Kalman fair value" },
    ]);
    // rows sit high: the panel's status bar overlays the bottom of the stage
    strip.innerHTML = `<rect x="${X(DRIFT_FROM)}" y="2" width="${X(DRIFT_TO) - X(DRIFT_FROM)}" height="82" class="gk-drift"/>`
      + `<text x="${X(DRIFT_FROM) + 4}" y="15" class="lg">real drift</text>`
      + `<text x="36" y="40" text-anchor="end" class="lg">fixed</text>${ticks(r.fixed, 24)}`
      + `<text x="36" y="74" text-anchor="end" class="lg">Kalman</text>${ticks(r.kalman, 58)}`;
    const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
    ro.replaceChildren(readout([["fixed window: false drift calls", pct(f.falseCalls)], ["fixed window: drift caught", pct(f.caught)], ["Kalman: false drift calls", pct(k.falseCalls)], ["Kalman: drift caught", pct(k.caught)]]));
  };
  controls.append(
    slider("price noise", 0.1, 1.2, 0.05, noise, (v) => v.toFixed(2), (v) => { noise = v; draw(); }),
    h("p", { class: "lab-note" }, "Fixed window: a line through the last 20 mids, \"drift\" when its slope passes a set threshold. Kalman: tracks level and slope together, \"drift\" only when the slope is 3 of its own standard errors from zero."),
    button("new random market", () => { seed++; draw(); }, "", Shuffle),
    ro,
  );
  draw();
}
