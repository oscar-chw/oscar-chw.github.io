import { clash, type Section } from "../../../lib/lab/timetable";
import { h, button } from "../ui";

// SYNTHETIC course sections (codes and times are invented for the demo).
const CATALOG: Section[] = [
  { code: "CSCI 3100 · A", slots: [{ day: 0, start: 570, end: 660 }, { day: 2, start: 570, end: 660 }] },
  { code: "CSCI 3150 · B", slots: [{ day: 1, start: 630, end: 720 }, { day: 3, start: 630, end: 720 }] },
  { code: "STAT 2005 · A", slots: [{ day: 0, start: 630, end: 720 }] },
  { code: "MATH 2050 · C", slots: [{ day: 2, start: 840, end: 930 }, { day: 4, start: 840, end: 930 }] },
  { code: "FINA 4150 · A", slots: [{ day: 3, start: 690, end: 780 }] },
  { code: "ENGG 1110 · D", slots: [{ day: 4, start: 870, end: 960 }] },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const T0 = 540, T1 = 1020;          // 09:00 to 17:00
const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function mount(stage: HTMLElement, controls: HTMLElement) {
  let plan: Section[] = [];
  const grid = h("div", { class: "tt" }), msg = h("p", { class: "lab-note mono", "aria-live": "polite" }, "add sections; a clash is refused and named");
  stage.append(grid, msg);
  const draw = () => {
    grid.replaceChildren(...DAYS.map((d, di) => h("div", { class: "tt-day" }, h("span", { class: "mono" }, d),
      ...plan.flatMap((s) => s.slots.filter((x) => x.day === di).map((x) => h("b", { class: "tt-blk", style: `--a:${(x.start - T0) / (T1 - T0)};--b:${(x.end - T0) / (T1 - T0)}` }, h("span", { class: "mono" }, s.code), h("span", { class: "mono t" }, `${hh(x.start)}–${hh(x.end)}`)))))));
  };
  const chips = h("div", { class: "chips" });
  for (const s of CATALOG) chips.append(button(s.code, () => {
    if (plan.includes(s)) { plan = plan.filter((x) => x !== s); msg.textContent = `dropped ${s.code}`; draw(); return; }
    const c = clash(plan, s);
    if (c) { msg.textContent = `✗ ${s.code} clashes with ${c.with} on ${DAYS[c.slot.day]} ${hh(c.slot.start)}`; grid.classList.remove("shake"); void grid.offsetWidth; grid.classList.add("shake"); return; }
    plan = [...plan, s]; msg.textContent = `✓ added ${s.code}`; draw();
  }, "chip mono"));
  controls.append(h("p", { class: "ctl-l mono" }, "sections (click to add or drop)"), chips);
  draw();
}
