import { panel, momentum, reversal, meanIC, SPLITS } from "../../../lib/lab/factors";
import { h, button, segmented } from "../ui";

const CANDS = [["momentum 5d", momentum(5)], ["momentum 20d", momentum(20)], ["momentum 60d", momentum(60)], ["reversal 5d", reversal(5)]] as const;

export function mount(stage: HTMLElement, controls: HTMLElement) {
  const grid = h("div", { class: "ics" });
  stage.append(grid);
  let seed = 4, reveal = "hidden";
  const draw = () => {
    const p = panel(seed);
    const rows = CANDS.map(([name, s]) => ({ name, tr: meanIC(p, s, ...SPLITS.train), va: meanIC(p, s, ...SPLITS.valid), te: meanIC(p, s, ...SPLITS.test) }));
    const pick = rows.reduce((b, r) => (r.va > b.va ? r : b));
    const max = Math.max(...rows.flatMap((r) => [Math.abs(r.tr), Math.abs(r.va), Math.abs(r.te)]), 1e-6);
    const bar = (v: number, cls: string, hidden = false) => h("span", { class: `icb ${cls}${hidden ? " sealed" : ""}`, style: `--w:${((Math.abs(v) / max) * 50).toFixed(1)}%;--s:${v < 0 ? -1 : 1}` }, h("b", { class: "mono" }, hidden ? "sealed" : v.toFixed(3)));
    grid.replaceChildren(
      h("div", { class: "ic-head mono" }, h("span", {}, "candidate"), h("span", {}, "train"), h("span", {}, "validation"), h("span", {}, "test")),
      ...rows.map((r) => h("div", { class: `ic-row${r === pick ? " pick" : ""}` }, h("span", { class: "mono" }, r.name + (r === pick ? "  ← chosen on validation" : "")), bar(r.tr, "tr"), bar(r.va, "va"), bar(r.te, "te", reveal === "hidden" || r !== pick))),
    );
  };
  controls.append(
    h("p", { class: "lab-note" }, "Mean daily rank IC: today's signal against tomorrow's returns. The test column stays sealed until a candidate has been chosen on validation, and then only the chosen one is opened."),
    segmented("test window", ["hidden", "open the chosen one"], reveal, (v) => { reveal = v; draw(); }),
    button("new random market", () => { seed++; draw(); }),
  );
  draw();
}
