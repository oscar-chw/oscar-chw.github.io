import { panel, noise, meanIC, SPLITS } from "../../../lib/lab/factors";
import { h, slider, readout } from "../ui";

export function mount(stage: HTMLElement, controls: HTMLElement) {
  const viz = h("div", { class: "mt" });
  stage.append(h("p", { class: "lab-note" }, "Every candidate here is pure noise. Search enough of them and the best one looks like a signal on the data it was picked on. That is why a search needs a sealed test and an equal-budget random control."), viz);
  const p = panel(11), pool = Array.from({ length: 60 }, (_, i) => noise(500 + i));
  const train = pool.map((s) => meanIC(p, s, ...SPLITS.train));
  let k = 8;
  const ro = document.createElement("div");
  const draw = () => {
    const tr = train.slice(0, k), best = tr.indexOf(Math.max(...tr)), te = meanIC(p, pool[best], ...SPLITS.test);
    viz.replaceChildren(...tr.map((v, i) => { const px = v * 2500; return h("i", { class: i === best ? "best" : "", style: `--h:${Math.max(2, Math.abs(px)).toFixed(1)}px;--y:${(-px / 2).toFixed(1)}px` }); }));
    ro.replaceChildren(readout([["candidates searched", String(k)], ["best on train", tr[best].toFixed(3)], ["same one on test", te.toFixed(3)]]));
  };
  controls.append(slider("random formulas searched", 1, 60, 1, k, (v) => String(v), (v) => { k = v; draw(); }), ro);
  draw();
}
