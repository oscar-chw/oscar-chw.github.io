import { race, type Mode } from "../../../lib/lab/lostupdates";
import { h, segmented, slider, button } from "../ui";
import { Shuffle } from "lucide";

// Writers race on one record. The top lane is the record's value after every commit; each writer's
// lane shows its reads (·), commits (✓), commits that overwrote someone (✗) and stale re-reads (↻).
// The marks play in order, so the race can be watched rather than just tallied.
export function mount(stage: HTMLElement, controls: HTMLElement) {
  let seed = 1, writers = 5, each = 4, mode: Mode = "last write wins";
  const big = h("div", { class: "lu-big mono", "aria-live": "polite" });
  const lanes = h("div", { class: "lu", role: "img", "aria-label": "Timeline: the record's value, then each writer's reads, commits, overwrites and retries" });
  stage.append(big, lanes, h("p", { class: "lab-note mono" }, "·  read     ✓  commit     ✗  commit that overwrote another     ↻  stale: read again"));
  const draw = () => {
    const r = race(seed, writers, each, mode);
    const mark = { read: "·", commit: "✓", lost: "✗", retry: "↻" } as const;
    // the record lane replays the race: the value each commit leaves behind
    let val = 0; const held: number[] = Array(writers).fill(0);
    const record = r.steps.map((s, k) => {
      if (s.kind === "read") held[s.writer] = val;
      const commit = s.kind === "commit" || s.kind === "lost";
      if (commit) val = held[s.writer] + 1;
      return h("i", { class: commit ? `on ${s.kind}` : "", style: `--i:${k}` }, commit ? String(val) : "");
    });
    lanes.replaceChildren(
      h("div", { class: "lu-lane rec mono" }, h("span", { class: "lu-w" }, "record"), h("span", { class: "lu-t" }, ...record)),
      ...Array.from({ length: writers }, (_, w) => h("div", { class: "lu-lane mono" },
        h("span", { class: "lu-w" }, `W${w + 1}`),
        h("span", { class: "lu-t" }, ...r.steps.map((s, k) => h("i", { class: s.writer === w ? `on ${s.kind}` : "", style: `--i:${k}` }, s.writer === w ? mark[s.kind] : ""))))),
    );
    big.replaceChildren(
      h("span", {}, h("b", {}, String(r.expected)), "updates made"),
      h("span", { class: "arrow" }, "→"),
      h("span", {}, h("b", {}, String(r.final)), "kept"),
      h("span", { class: r.lost ? "bad" : "good" }, h("b", {}, String(r.lost)), r.lost ? "lost, silently" : "lost"),
      h("span", { class: "dim" }, h("b", {}, String(r.retries)), "retries"),
    );
  };
  controls.append(
    segmented("commit rule", ["last write wins", "compare-and-swap"], mode, (v) => { mode = v as Mode; draw(); }),
    slider("writers", 1, 12, 1, writers, String, (v) => { writers = v; draw(); }),
    slider("updates each", 1, 8, 1, each, String, (v) => { each = v; draw(); }),
    button("new interleaving", () => { seed++; draw(); }, "", Shuffle),
  );
  draw();
}
