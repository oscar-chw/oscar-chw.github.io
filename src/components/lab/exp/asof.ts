import { asOf, STORE, KEYS, DAYS } from "../../../lib/lab/asof";
import { h, slider } from "../ui";

export function mount(stage: HTMLElement, controls: HTMLElement) {
  const table = h("table", { class: "asof mono" });
  stage.append(h("p", { class: "lab-note" }, "Each row is what a study reading as of that day is allowed to see. Values published later stay hidden, even though they exist in the store."), table);
  let t = 1;
  const draw = () => {
    table.replaceChildren(
      h("thead", {}, h("tr", {}, h("th", {}, "field"), h("th", {}, `value as of ${DAYS[t]}`), h("th", {}, "every version (day known)"))),
      h("tbody", {}, ...KEYS.map((k) => {
        const v = asOf(STORE, k, t);
        return h("tr", {}, h("td", {}, k), h("td", { class: v ? "now" : "none" }, v ? String(v.value) : "not known yet"),
          h("td", {}, ...STORE.filter((x) => x.key === k).map((x) => h("span", { class: x.known <= t ? "seen" : "future" }, `${x.value} (${DAYS[x.known]})`))));
      })),
    );
  };
  controls.append(slider("read as of", 0, 6, 1, t, (v) => DAYS[v], (v) => { t = v; draw(); }));
  draw();
}
