import { simulate } from "../../../lib/lab/marketmaking";
import { chart, slider, readout, button, css } from "../ui";
import { Shuffle } from "lucide";

export function mount(stage: HTMLElement, controls: HTMLElement) {
  const quotes = chart("Fair value with the bid and ask you quote"), inv = chart("Inventory over time", 760, 160), pnl = chart("Marked-to-market P&L", 760, 160);
  stage.append(quotes.el, inv.el, pnl.el);
  let spread = 0.4, skew = 0.02, seed = 3;
  const ro = document.createElement("div");
  const draw = () => {
    const m = simulate({ spread, skew, seed });
    quotes.draw([{ values: m.fair, color: css("--ink"), label: "fair value", width: 1.5 }], { lo: m.bid, hi: m.ask, color: css("--accent") });
    inv.draw([{ values: m.inventory, color: css("--amber"), label: "inventory" }]);
    pnl.draw([{ values: m.pnl, color: css("--up"), label: "P&L" }]);
    ro.replaceChildren(readout([["fills", String(m.fills)], ["peak |inventory|", String(Math.max(...m.inventory.map(Math.abs)))], ["final P&L", m.pnl.at(-1)!.toFixed(2)]]));
  };
  controls.append(
    slider("spread", 0.05, 1.5, 0.05, spread, (v) => v.toFixed(2), (v) => { spread = v; draw(); }),
    slider("inventory skew", 0, 0.12, 0.005, skew, (v) => v.toFixed(3), (v) => { skew = v; draw(); }),
    button("new random flow", () => { seed++; draw(); }, "", Shuffle),
    ro,
  );
  draw();
}
