import { walkForward, type Stamp } from "../../../lib/lab/candles";
import { chart, segmented, button, readout, css } from "../ui";
import { Shuffle } from "lucide";

export function mount(stage: HTMLElement, controls: HTMLElement) {
  const c = chart("Equity of one rule under two candle timestamps, against the market");
  stage.append(c.el);
  let seed = 1, stamp: Stamp = "close";
  const ro = document.createElement("div");
  const draw = () => {
    const w = walkForward(seed, 400, stamp), pct = (v: number) => `${((Math.exp(v) - 1) * 100).toFixed(0)}%`;
    c.draw([
      { values: w.market, color: css("--muted"), label: "market", width: 1.5 },
      { values: w.equity, color: stamp === "open" ? css("--down") : css("--accent"), label: `rule, candles stamped at ${stamp}`, width: stamp === "open" ? 2.5 : 2 },
    ]);
    ro.replaceChildren(readout([
      ["rule", pct(w.equity.at(-1)!)],
      ["audit", w.leaks ? `${w.leaks} of ${w.decisions} reads used a close not yet known` : `0 of ${w.decisions} reads ahead of time`],
    ]));
  };
  controls.append(
    segmented("stamp each candle at its", ["close", "open"], stamp, (v) => { stamp = v as Stamp; draw(); }),
    button("new random market", () => { seed++; draw(); }, "", Shuffle),
    ro,
  );
  draw();
}
