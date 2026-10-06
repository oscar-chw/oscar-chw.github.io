import { backtest } from "../../../lib/lab/lookahead";
import { chart, segmented, button, readout, css } from "../ui";
import { Shuffle } from "lucide";

export function mount(stage: HTMLElement, controls: HTMLElement) {
  const c = chart("Equity curves: honest rule, leaky rule and the market");
  stage.append(c.el);
  let seed = 1, peek = "no";
  const ro = document.createElement("div");
  const draw = () => {
    const b = backtest(seed, 500), pct = (v: number) => `${((Math.exp(v) - 1) * 100).toFixed(0)}%`;
    const series = [
      { values: b.market, color: css("--muted"), label: "market", width: 1.5 },
      { values: b.honest, color: css("--accent"), label: "rule, decided yesterday" },
    ];
    if (peek === "yes") series.push({ values: b.leaky, color: css("--down"), label: "same rule, peeking at today", width: 2.5 });
    c.draw(series);
    ro.replaceChildren(readout([["honest", pct(b.honest.at(-1)!)], ["leaky", peek === "yes" ? pct(b.leaky.at(-1)!) : "hidden"], ["market", pct(b.market.at(-1)!)]]));
  };
  controls.append(
    segmented("let the rule see today's return?", ["no", "yes"], peek, (v) => { peek = v; draw(); }),
    button("new random market", () => { seed++; draw(); }, "", Shuffle),
    ro,
  );
  draw();
}
