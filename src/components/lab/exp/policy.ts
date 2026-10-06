import { maskedSoftmax } from "../../../lib/lab/policy";
import { h, slider } from "../ui";

const OPTIONS = ["attack", "attach energy", "retreat", "evolve", "play supporter", "use ability", "bench a card", "end turn"];
const SCORES = [2.4, 1.1, -0.4, 1.9, 1.5, 0.6, 0.2, -1.2];

export function mount(stage: HTMLElement, controls: HTMLElement) {
  const legal = [true, true, false, true, false, true, true, true];
  let temp = 1;
  const cards = h("div", { class: "cards" });
  stage.append(h("p", { class: "lab-note" }, "The engine lists the legal options at each prompt. The policy scores every option, illegal ones are masked out before the softmax, so it can never pick a move the rules forbid. Click a card to make it legal or illegal."), cards);
  const draw = () => {
    const p = maskedSoftmax(SCORES, legal, temp), best = p.indexOf(Math.max(...p));
    cards.replaceChildren(...OPTIONS.map((o, i) => {
      const b = h("button", { type: "button", class: `card${legal[i] ? "" : " illegal"}${i === best ? " best" : ""}`, "aria-pressed": String(legal[i]), "aria-label": `${o}: ${legal[i] ? "legal" : "illegal"}, probability ${(p[i] * 100).toFixed(0)}%` },
        h("span", { class: "nm" }, o), h("span", { class: "mono sc" }, `score ${SCORES[i].toFixed(1)}`), h("i", { style: `--p:${p[i].toFixed(3)}` }), h("b", { class: "mono" }, legal[i] ? `${(p[i] * 100).toFixed(0)}%` : "masked"));
      b.addEventListener("click", () => { legal[i] = !legal[i]; draw(); });
      return b;
    }));
  };
  controls.append(slider("temperature", 0.2, 3, 0.1, temp, (v) => v.toFixed(1), (v) => { temp = v; draw(); }));
  draw();
}
