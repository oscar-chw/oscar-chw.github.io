import { h, button } from "../ui";
import { STORE } from "../../../lib/lab/asof";
import { parseVersions, queryVersions, versionsCSV, MAX_CSV_BYTES, type RecordVersion } from "../../../lib/lab/data-workbench";
import "./data-workbench.css";

export function mount(stage: HTMLElement, controls: HTMLElement) {
  const initial = versionsCSV(STORE);
  let rows: RecordVersion[] = [], cutoff = 1, valid = false;
  const editor = h("textarea", { class: "dw-editor mono", "aria-label": "Version records CSV", spellcheck: "false", rows: "9", "data-lenis-prevent": "" });
  editor.value = initial;
  const alert = h("p", { class: "dw-error", role: "alert", hidden: "" });
  const status = h("p", { class: "dw-status mono", role: "status" });
  const timeline = h("div", { class: "dw-timeline", "aria-label": "Publication timeline" });
  const result = h("div", { class: "dw-result", tabindex: "0", role: "region", "aria-label": "Query result and source lines", "data-lenis-prevent": "" });
  const time = h("input", { type: "range", min: "0", max: "6", step: "1", value: "1", "aria-label": "Query cutoff" });
  const timeOut = h("output", { class: "mono" }, "t = 1");
  const run = button("Run query", () => apply());
  const save = button("Export result", () => {
    if (!valid) return;
    const output = { format: "point-in-time-workbench-v1", data: "User-edited browser workspace; no upload", cutoff, records: rows, fields: queryVersions(rows, cutoff) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: "application/json" }));
    const a = h("a", { href: url, download: "point-in-time-result.json" }); a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const markDraft = () => {
    valid = false; save.disabled = true; result.hidden = true; timeline.hidden = true;
    status.textContent = "Draft changed · run the query to update the result.";
  };
  editor.addEventListener("input", () => { imports++; markDraft(); });
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.stopPropagation(); apply(); }
  });
  const file = h("input", { type: "file", accept: ".csv,text/csv", "aria-label": "Import CSV" });
  let imports = 0;
  file.addEventListener("change", async () => {
    const n = ++imports, selected = file.files?.[0]; if (!selected) return;
    markDraft(); alert.hidden = true;
    try {
      if (selected.size > MAX_CSV_BYTES) throw new Error("File exceeds the 64 KB workspace limit.");
      const text = await selected.text(); if (n !== imports) return;
      editor.value = text; status.textContent = `Loaded ${selected.name} · inspect the text, then run the query.`;
    } catch (error) { if (n === imports) { alert.textContent = error instanceof Error ? error.message : "Could not read this file."; alert.hidden = false; } }
  });
  time.addEventListener("input", () => { cutoff = Number(time.value); timeOut.textContent = `t = ${cutoff}`; if (valid) draw(); });
  const preset = (csv: string) => { imports++; file.value = ""; editor.value = csv; cutoff = 1; time.value = "1"; apply(); };
  controls.append(
    h("p", { class: "lab-note" }, "A real local data tool. Edit the records, run an as-of query, then click a publication event to inspect what changed. Your data stays in this browser; no file is uploaded."),
    h("label", { class: "ctl" }, h("span", { class: "ctl-l mono" }, "1 · input records"), editor),
    h("p", { class: "lab-note" }, "key = field; value = number; known = publication time. Up to 200 rows / 64 KB. Ctrl/⌘ + Enter runs the query."),
    h("label", { class: "dw-file" }, "Import CSV", file),
    h("div", { class: "dw-actions" }, run, button("Late correction", () => preset(initial)), button("Delayed report", () => preset("key,value,known\nrevenue,100,3\nrevenue,115,6\nshares,10,0\nshares,12,5\n"))),
    alert,
    h("label", { class: "ctl" }, h("span", { class: "ctl-l mono" }, "2 · query cutoff"), time, timeOut),
    h("div", { class: "dw-actions" }, save, button("Reset workspace", () => preset(initial))),
  );
  stage.append(status, h("p", { class: "lab-note" }, "Each marker is a published revision. Read time from left to right; revisions have separate rows so every event stays selectable. The vertical line is your cutoff: events to its right must not influence a historical read."), timeline, h("p", { class: "lab-note dw-scroll-hint" }, "Scroll the table sideways to compare the latest value and its availability."), result);
  const takeTerminalInput = () => {
    let pending: string | null = null;
    try { pending = sessionStorage.getItem("lab:pending-versions"); if (pending !== null) sessionStorage.removeItem("lab:pending-versions"); } catch { /* direct file import remains available when tab storage is blocked */ }
    if (pending !== null) { imports++; editor.value = pending; cutoff = 1; apply(); }
  };
  addEventListener("lab:versions-ready", takeTerminalInput);

  function apply() {
    alert.hidden = true;
    try {
      rows = parseVersions(editor.value); const max = Math.max(...rows.map((r) => r.known), 1);
      cutoff = Math.min(cutoff, max); time.max = String(max); time.value = String(cutoff); timeOut.textContent = `t = ${cutoff}`;
      valid = true; save.disabled = false; result.hidden = false; timeline.hidden = false; editor.removeAttribute("aria-invalid"); draw();
    } catch (error) {
      valid = false; save.disabled = true; result.hidden = true; timeline.hidden = true; editor.setAttribute("aria-invalid", "true");
      alert.textContent = error instanceof Error ? error.message : "Could not parse the records."; alert.hidden = false;
      status.textContent = "Query not run · fix the input above.";
    }
  }
  function draw() {
    const focusedEvent = timeline.contains(document.activeElement) ? document.activeElement?.getAttribute("aria-label") : null;
    const fields = queryVersions(rows, cutoff), max = Number(time.max);
    const withheld = fields.filter((f) => f.later).length;
    status.textContent = `${rows.length} records · ${fields.length} fields · cutoff ${cutoff} · ${withheld} fields have later information withheld`;
    timeline.style.setProperty("--cutoff", `${cutoff / max * 100}%`);
    timeline.replaceChildren(...fields.map((field) => h("div", { class: "dw-lane" },
      h("span", { class: "dw-key mono" }, field.key),
      h("div", { class: "dw-track", style: `height:${field.versions.length * 48}px` }, ...field.versions.map((v, i) => {
        const dot = h("button", { type: "button", class: v.known <= cutoff ? "dw-event known" : "dw-event later", style: `left:${v.known / max * 100}%;top:${i * 48 + 4}px`, "aria-label": `${field.key}: ${v.value}, available at ${v.known}`, title: `${v.value} · t=${v.known} · line ${v.line}` }, String(v.value));
        dot.addEventListener("click", () => { dot.focus({ preventScroll: true }); cutoff = v.known; time.value = String(cutoff); timeOut.textContent = `t = ${cutoff}`; draw(); });
        return dot;
      })),
    )));
    if (focusedEvent) [...timeline.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.getAttribute("aria-label") === focusedEvent)?.focus({ preventScroll: true });
    result.replaceChildren(h("table", { class: "dw-table mono" },
      h("thead", {}, h("tr", {}, ...["field", `as of ${cutoff}`, "lineage", "latest / availability"].map((x) => h("th", { scope: "col" }, x)))),
      h("tbody", {}, ...fields.map((f) => h("tr", {},
        h("th", { scope: "row" }, f.key),
        h("td", {}, f.selected ? String(f.selected.value) : "not known yet"),
        h("td", {}, f.selected ? `line ${f.selected.line} · t=${f.selected.known}` : "no eligible record"),
        h("td", { class: f.later ? "dw-later" : "" }, `${f.latest.value} · t=${f.latest.known}${f.later ? " · later information" : " · available"}`),
      ))),
    ));
  }
  apply();
  takeTerminalInput();
}
