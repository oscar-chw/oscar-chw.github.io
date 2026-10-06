import { blackScholes, ssviVol, grid } from "../../../lib/lab/options";
import { surface } from "../surface3d";
import { h, segmented, slider, readout } from "../ui";

type What = "price" | "delta" | "gamma" | "vega" | "theta" | "implied vol";
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

// Black–Scholes over spot × time to expiry, or an SSVI implied-vol surface over strike × expiry, in 3D.
export function mount(stage: HTMLElement, controls: HTMLElement) {
  const s = surface("3D surface of an option quantity; drag or use the arrow keys to turn it");
  const note = h("p", { class: "lab-note" }, "drag to turn it, or focus it and use the arrow keys");
  stage.append(s.el, note);
  let what: What = "price", vol = 0.25, rate = 0.03, strike = 100, atm = 0.22, rho = -0.55, eta = 1.1;
  const sliders = h("div", { class: "ctl-group" }), ro = h("div", {});

  const draw = () => {
    if (what === "implied vol") {
      s.set({
        z: grid(34, 34, [-0.5, 0.5], [0.05, 2], (k, T) => ssviVol(k, T, atm, rho, eta)),
        x: [-0.5, 0.5], y: [0.05, 2], labels: ["log strike / forward", "years", "implied vol"],
        fmt: (v, a) => a === "z" ? pct(v) : a === "y" ? `${v.toFixed(2)}y` : v.toFixed(1),
      });
      ro.replaceChildren(readout([
        ["ATM, 1y", pct(ssviVol(0, 1, atm, rho, eta))],
        ["strike −30%, 1y", pct(ssviVol(Math.log(0.7), 1, atm, rho, eta))],
        ["strike +30%, 1y", pct(ssviVol(Math.log(1.3), 1, atm, rho, eta))],
      ]));
      return;
    }
    const key = what === "price" ? "call" : what;
    s.set({
      z: grid(34, 34, [50, 150], [0.02, 2], (S, T) => blackScholes(S, strike, T, rate, vol)[key]),
      x: [50, 150], y: [0.02, 2], labels: ["stock price", "years to expiry", what === "price" ? "call price" : what],
      fmt: (v, a) => a === "x" ? v.toFixed(0) : a === "y" ? `${v.toFixed(2)}y` : Math.abs(v) < 0.1 ? v.toFixed(4) : v.toFixed(2),
    });
    const q = blackScholes(strike, strike, 0.5, rate, vol);
    ro.replaceChildren(readout([
      ["at the money, 6m", `call ${q.call.toFixed(2)} · put ${q.put.toFixed(2)}`],
      ["put–call parity", `|C − P − (S − Ke⁻ʳᵀ)| = ${Math.abs(q.call - q.put - (strike - strike * Math.exp(-rate * 0.5))).toExponential(0)}`],
      ["delta · gamma", `${q.delta.toFixed(3)} · ${q.gamma.toFixed(4)}`],
    ]));
  };
  const controlsFor = () => {
    sliders.replaceChildren(...(what === "implied vol" ? [
      slider("ATM vol", 0.05, 0.6, 0.01, atm, pct, (v) => { atm = v; draw(); }),
      slider("skew ρ", -0.95, 0.5, 0.05, rho, (v) => v.toFixed(2), (v) => { rho = v; draw(); }),
      slider("curvature η", 0.2, 2.5, 0.1, eta, (v) => v.toFixed(1), (v) => { eta = v; draw(); }),
    ] : [
      slider("volatility", 0.05, 0.8, 0.01, vol, pct, (v) => { vol = v; draw(); }),
      slider("interest rate", 0, 0.1, 0.005, rate, (v) => `${(v * 100).toFixed(1)}%`, (v) => { rate = v; draw(); }),
      slider("strike", 60, 140, 1, strike, (v) => v.toFixed(0), (v) => { strike = v; draw(); }),
    ]));
  };
  controls.append(
    segmented("plot", ["price", "delta", "gamma", "vega", "theta", "implied vol"], what, (v) => { what = v as What; controlsFor(); draw(); }),
    sliders, ro,
  );
  controlsFor(); draw();
}
