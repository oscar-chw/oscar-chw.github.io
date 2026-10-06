import { asOf, type Version } from "../../../lib/lab/asof";
import { h, slider } from "../ui";

// SYNTHETIC: a few fields of one stock, with corrections and late arrivals published on later days.
const STORE: Version[] = [
  { key: "close (Mon)", value: 10.0, known: 1 }, { key: "close (Mon)", value: 10.4, known: 4 },
  { key: "volume (Mon)", value: 1200, known: 1 }, { key: "volume (Mon)", value: 1350, known: 2 },
  { key: "split factor", value: 1, known: 0 }, { key: "split factor", value: 2, known: 6 },
  { key: "close (Tue)", value: 10.9, known: 2 }, { key: "dividend (Wed)", value: 0.3, known: 5 },
];
const KEYS = [...new Set(STORE.map((v) => v.key))];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
