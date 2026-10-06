import { actions, evaluate, calibrate } from "../../../lib/lab/gate";
import { h, slider, readout, button } from "../ui";
import { ShieldOff } from "lucide";

export function mount(stage: HTMLElement, controls: HTMLElement) {
  const cal = actions(7, 1500), fresh = actions(42, 1500);
  const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 760 220"); svg.setAttribute("class", "chart"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Actions by risk score; the gate stops everything right of the line");
  stage.append(h("p", { class: "lab-note" }, "Each dot is an action an agent wants to take, placed by its risk score. Red ones would break a rule. The gate lets through only actions left of the line and abstains on the rest."), svg);
  let alpha = 0.05, tau = calibrate(cal, alpha);
  const ro = document.createElement("div");
  const draw = () => {
    const o = evaluate(fresh, tau);
    let html = fresh.slice(0, 600).map((a, i) => `<circle cx="${(20 + a.risk * 720).toFixed(1)}" cy="${(20 + ((i * 37) % 180)).toFixed(0)}" r="3" class="${a.breaks ? "brk" : "ok"}${a.risk >= tau ? " held" : ""}"/>`).join("");
    html += `<line x1="${20 + tau * 720}" x2="${20 + tau * 720}" y1="6" y2="214" class="tau"/><text x="${24 + tau * 720}" y="16" class="lg">gate</text>`;
    svg.innerHTML = html;
    ro.replaceChildren(readout([["threshold", tau.toFixed(3)], ["rule breaks let through", `${(o.violationRate * 100).toFixed(1)}%`], ["abstained", `${(o.abstainRate * 100).toFixed(1)}%`]]));
  };
  controls.append(
    slider("target: rule breaks at most", 0.01, 0.2, 0.01, alpha, (v) => `${(v * 100).toFixed(0)}%`, (v) => { alpha = v; tau = calibrate(cal, alpha); draw(); }),
    h("p", { class: "lab-note" }, "The threshold is calibrated on separate actions, then judged on fresh ones (conformal risk control, simplified)."),
    button("no gate (act on everything)", () => { tau = 1.01; draw(); }, "", ShieldOff),
    ro,
  );
  draw();
}
