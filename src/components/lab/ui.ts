// Shared building blocks for lab experiments: tiny DOM builder, controls styled as instruments
// (segmented switches, sliders with live readouts), and an SVG line chart that redraws in place.
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...kids: (Node | string)[]) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.append(...kids);
  return e;
}

export function slider(label: string, min: number, max: number, step: number, value: number, fmt: (v: number) => string, on: (v: number) => void) {
  const out = h("output", { class: "mono" }, fmt(value));
  const input = h("input", { type: "range", min: String(min), max: String(max), step: String(step), value: String(value), "aria-label": label });
  input.addEventListener("input", () => { const v = Number(input.value); out.textContent = fmt(v); on(v); });
  return h("label", { class: "ctl" }, h("span", { class: "ctl-l mono" }, label), input, out);
}

export function segmented(label: string, options: string[], value: string, on: (v: string) => void) {
  const wrap = h("div", { class: "seg", role: "radiogroup", "aria-label": label });
  for (const o of options) {
    const b = h("button", { type: "button", role: "radio", "aria-checked": String(o === value) }, o);
    b.addEventListener("click", () => { wrap.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", String(x === b))); on(o); });
    wrap.append(b);
  }
  return h("div", { class: "ctl" }, h("span", { class: "ctl-l mono" }, label), wrap);
}

export function button(text: string, on: () => void, cls = "") {
  const b = h("button", { type: "button", class: `lab-btn ${cls}` }, text);
  b.addEventListener("click", on);
  return b;
}

export function readout(pairs: [string, string][]) {
  return h("dl", { class: "ro" }, ...pairs.flatMap(([k, v]) => [h("dt", { class: "mono" }, k), h("dd", { class: "mono" }, v)]));
}

/** Line chart of several series over the same x; returns redraw(series). Colours are CSS tokens. */
export function chart(aria: string, W = 760, H = 300) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "chart"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", aria);
  const draw = (series: { values: number[]; color: string; label: string; dash?: boolean; width?: number }[], band?: { lo: number[]; hi: number[]; color: string }) => {
    const all = series.flatMap((s) => s.values).concat(band ? [...band.lo, ...band.hi] : []);
    const lo = Math.min(...all), hi = Math.max(...all), n = Math.max(...series.map((s) => s.values.length));
    const X = (i: number) => 40 + (i / Math.max(1, n - 1)) * (W - 56), Y = (v: number) => H - 26 - ((v - lo) / (hi - lo || 1)) * (H - 50);
    const path = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
    let html = `<line x1="40" x2="${W - 16}" y1="${Y(0 < lo || 0 > hi ? lo : 0).toFixed(1)}" y2="${Y(0 < lo || 0 > hi ? lo : 0).toFixed(1)}" class="axis"/>`;
    if (band) html += `<path d="${path(band.hi)}L${band.lo.map((v, i) => `${X(band.lo.length - 1 - i).toFixed(1)} ${Y(band.lo[band.lo.length - 1 - i]).toFixed(1)}`).join("L")}Z" fill="${band.color}" opacity="0.18"/>`;
    series.forEach((s, k) => {
      html += `<path d="${path(s.values)}" fill="none" stroke="${s.color}" stroke-width="${s.width ?? 2}" ${s.dash ? 'stroke-dasharray="5 5"' : ""} class="ln" pathLength="1"/>`;
      html += `<text x="${W - 16}" y="${18 + k * 18}" text-anchor="end" fill="${s.color}" class="lg">${s.label}</text>`;
    });
    svg.innerHTML = html;
  };
  return { el: svg, draw };
}

export const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
