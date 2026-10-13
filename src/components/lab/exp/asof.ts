import { asOf, STORE, KEYS, DAYS } from "../../../lib/lab/asof";
import { h, slider, segmented, selectSegment, button } from "../ui";
import "./asof.css";

type Policy = "as of cutoff" | "latest available";

export function mount(stage: HTMLElement, controls: HTMLElement) {
  const table = h("table", { class: "asof mono" });
  const status = h("p", { class: "asof-status mono", "aria-live": "polite" });
  const wrap = h("div", {
    class: "asof-wrap",
    role: "region",
    "aria-label": "Point-in-time version table; scroll horizontally to view all columns",
    tabindex: "0",
    "data-lenis-prevent": "",
  }, table);
  stage.append(
    h("p", { class: "lab-note" }, "This synthetic store records when a value became available separately from the day it describes. A historical study must read only versions known by its cutoff; using today's corrected values can quietly add information that did not exist then."),
    status,
    h("p", { class: "asof-hint lab-note" }, "Scroll the table sideways to inspect each value's status and revision history."),
    wrap,
  );

  let t = 1;
  let policy: Policy = "as of cutoff";
  const policyControl = segmented("read policy", ["as of cutoff", "latest available"], policy, (v) => { policy = v as Policy; draw(); });
  const timeControl = slider("read as of", 0, 6, 1, t, (v) => DAYS[v], (v) => { t = v; draw(); });
  const setCutoff = (day: number) => {
    t = day;
    const input = timeControl.querySelector<HTMLInputElement>('input[type="range"]')!;
    input.value = String(day);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const setPolicy = (value: Policy) => {
    policy = value;
    selectSegment(policyControl, value);
    draw();
  };

  controls.append(
    policyControl,
    timeControl,
    h("div", { class: "ctl" }, h("span", { class: "ctl-l mono" }, "guided scenarios"),
      h("div", { class: "asof-actions" },
        button("before data", () => setCutoff(0)),
        button("late correction", () => setCutoff(4)),
        button("all published", () => setCutoff(6)),
        button("reset", () => { setPolicy("as of cutoff"); setCutoff(1); }),
      ),
    ),
  );

  function draw() {
    const rows = KEYS.map((key) => {
      const cutoffValue = asOf(STORE, key, t);
      const latest = asOf(STORE, key, Number.POSITIVE_INFINITY);
      const selected = policy === "as of cutoff" ? cutoffValue : latest;
      const isLater = Boolean(selected && selected.known > t);
      const versions = STORE.filter((v) => v.key === key).sort((a, b) => a.known - b.known);
      const previous = selected ? versions.filter((v) => v.known < selected.known).at(-1) : null;
      const changed = Boolean(selected && previous && selected.value !== previous.value);
      const change = changed ? ` · ${previous!.value} → ${selected!.value}` : "";
      const next = versions.find((v) => v.known > t);
      const rowStatus = isLater
        ? { cls: "later", label: `Later value${change} · known ${DAYS[selected!.known]}` }
        : selected
          ? { cls: changed ? "changed" : "known", label: `${changed ? "Updated" : "Known"}${change} · known ${DAYS[selected.known]}` }
          : next
            ? { cls: "withheld", label: `Withheld · first known ${DAYS[next.known]}` }
            : { cls: "unavailable", label: "Unavailable · no published value" };
      return { key, selected, isLater, rowStatus };
    });
    const laterCount = rows.filter((r) => r.isLater).length;
    const withheldCount = rows.filter((r) => STORE.some((v) => v.key === r.key && v.known > t)).length;
    const availableCount = rows.filter((r) => r.selected).length;
    const close = rows.find((r) => r.key === "close (Mon)");
    const closeRead = close?.selected
      ? `close (Mon) is ${close.selected.value.toFixed(1)}, known ${DAYS[close.selected.known]}`
      : "close (Mon) is unavailable by this cutoff";
    status.textContent = policy === "as of cutoff"
      ? `${availableCount} of ${rows.length} fields known by ${DAYS[t]}; ${withheldCount} fields have later versions withheld. ${closeRead}.`
      : `Latest available while reading as of ${DAYS[t]}: ${availableCount} of ${rows.length} fields shown; ${laterCount} use later information. ${closeRead}${close?.isLater ? ` — using this at ${DAYS[t]} leaks a correction published ${DAYS[close.selected!.known]}.` : "."}`;
    table.replaceChildren(
      h("thead", {}, h("tr", {},
        h("th", { scope: "col" }, "field"),
        h("th", { scope: "col" }, policy === "as of cutoff" ? `value as of ${DAYS[t]}` : `latest available · ignores ${DAYS[t]} cutoff`),
        h("th", { scope: "col" }, "read status"),
        h("th", { scope: "col" }, "every version (day known)"),
      )),
      h("tbody", {}, ...rows.map(({ key, selected, rowStatus }) => h("tr", {},
        h("td", {}, key),
        h("td", { class: selected ? "now" : "none" }, selected ? String(selected.value) : "not known yet"),
        h("td", { class: `asof-mark ${rowStatus.cls}` }, rowStatus.label),
        h("td", {}, ...STORE.filter((x) => x.key === key).map((x) => h("span", { class: x.known <= t ? "seen" : "future" }, `${x.value} (${DAYS[x.known]})`))),
      ))),
    );
  }
  draw();
}
