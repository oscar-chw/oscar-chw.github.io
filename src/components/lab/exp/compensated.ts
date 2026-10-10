import { exactDet, toDouble, plain, kahan, ulpError, digitsKept, typical, cancelling, sweep } from "../../../lib/lab/kahan";
import { h, button, segmented, readout } from "../ui";
import { Shuffle, RotateCcw, Play } from "lucide";

// FatQat's default GPU products, computed live: a·b − c·d plainly and with Kahan's algorithm, each measured in ulps
// against the exact value. Input on the right, the three results in the stage, one result line, one line on why it matters.
const KINDS = { "nearly cancelling": cancelling, "typical amplitudes": typical } as const;
type Kind = keyof typeof KINDS;
const LIMIT = 1e6;

export function mount(stage: HTMLElement, controls: HTMLElement) {
  let kind: Kind = "nearly cancelling", seed = 1;
  let [a, b, c, d] = KINDS[kind](seed);

  const rows = h("div", { class: "cp-rows", role: "table", "aria-label": "a·b − c·d by three methods" });
  const result = h("p", { class: "cp-result", "aria-live": "polite", "data-testid": "cp-result" });
  const sweepOut = h("div", { class: "cp-sweep", "data-testid": "cp-sweep" });
  stage.append(
    h("p", { class: "cp-tag mono" }, h("b", {}, "LIVE"), " computed in your browser now, exact to the last bit"),
    h("p", { class: "cp-formula mono", "aria-hidden": "true" }, "a·b − c·d"),
    rows, result,
    h("p", { class: "cp-why" }, "Every complex multiply in a state-vector simulator computes this. FatQat's default GPU products pay about 1.5× in GPU speed for the compensated result; plain mode is an opt-in, because across 110 real circuits the two differ by only +0.03 ± 0.03 machine epsilons on average (one circuit 1.5 worse)."),
    sweepOut,
  );

  // the significant digits that agree with the exact value are bright; the rest are rounding noise
  const digits = (v: number, ref: number) => {
    const f = (x: number) => (x === 0 ? "0" : x.toPrecision(17)), s = f(v), r = f(ref);
    let k = 0; while (k < s.length && s[k] === r[k]) k++;
    return h("span", { class: "cp-num mono" }, h("span", { class: "ok" }, s.slice(0, k)), h("span", { class: "bad" }, s.slice(k)));
  };
  const row = (name: string, note: string, v: number, ref: number, ulps: number | null, cls: string) => h("div", { class: `cp-row ${cls}`, role: "row", "data-method": cls },
    h("span", { class: "cp-name", role: "cell" }, h("b", {}, name), h("small", {}, note)),
    h("span", { role: "cell" }, digits(v, ref)),
    h("span", { class: "cp-err mono", role: "cell" }, ulps === null ? "reference" : ulps === Infinity ? "all digits lost" : `${ulps < 10 ? ulps.toFixed(2) : ulps.toExponential(1)} ulp`),
    h("span", { class: "cp-bar", role: "cell", "aria-label": ulps === null ? "" : `about ${digitsKept(ulps)} of 16 digits correct` },
      ...Array.from({ length: 16 }, (_, i) => h("i", { class: ulps === null || i < digitsKept(ulps) ? "on" : "" }))));

  const draw = () => {
    const ref = toDouble(exactDet(a, b, c, d)), p = plain(a, b, c, d), k = kahan(a, b, c, d);
    const ep = ulpError(p, a, b, c, d), ek = ulpError(k, a, b, c, d);
    rows.replaceChildren(
      row("exact", "BigInt reference, rounded once", ref, ref, null, "exact"),
      row("plain", "round each product, then subtract", p, ref, ep, "plain"),
      row("compensated", "Kahan's algorithm (FatQat's default)", k, ref, ek, "kahan"),
    );
    result.textContent = ep <= 2
      ? `Both methods are within 2 ulp here: for inputs like these, plain products are fine.`
      : `Plain products kept about ${digitsKept(ep)} of 16 digits; the compensated result kept ${digitsKept(ek)} (error ${ek.toFixed(2)} ulp).`;
    for (const [i, el] of inputs.entries()) el.value = String([a, b, c, d][i]);
  };

  // inputs: four editable values, checked before use; an invalid one is named and nothing is recomputed
  const err = h("p", { class: "cp-err-msg", role: "alert" });
  const inputs = ["a", "b", "c", "d"].map((n) => {
    const el = h("input", { type: "text", inputmode: "decimal", "aria-label": n, spellcheck: "false", class: "mono" });
    el.addEventListener("change", () => {
      const v = inputs.map((x) => Number(x.value.trim()));
      const bad = v.findIndex((x) => !Number.isFinite(x) || Math.abs(x) > LIMIT || (x !== 0 && Math.abs(x) < 1 / LIMIT));
      if (bad >= 0) { err.textContent = `${"abcd"[bad]} must be a number between 1e-6 and 1e6 in size, or 0.`; inputs[bad].setAttribute("aria-invalid", "true"); return; }
      err.textContent = ""; inputs.forEach((x) => x.removeAttribute("aria-invalid"));
      [a, b, c, d] = v as [number, number, number, number]; draw();
    });
    return el;
  });

  controls.append(
    segmented("inputs", Object.keys(KINDS), kind, (v) => { kind = v as Kind; [a, b, c, d] = KINDS[kind](seed); err.textContent = ""; draw(); }),
    h("div", { class: "cp-in" }, ...inputs.flatMap((el, i) => [h("label", { class: "ctl-l mono" }, "abcd"[i]), el])),
    err,
    button("new inputs", () => { seed++; [a, b, c, d] = KINDS[kind](seed); err.textContent = ""; draw(); }, "", Shuffle),
    button("run 2,000 cases", () => {
      const s = sweep(kind === "typical amplitudes" ? "typical" : "cancelling", 2000, seed);
      const f = (x: number) => (x < 10 ? x.toFixed(2) : x.toExponential(1));
      sweepOut.replaceChildren(h("p", { class: "ctl-l mono" }, `${s.n.toLocaleString("en-US")} ${kind} cases, worst error in ulp`),
        readout([["plain: median", f(s.plain.median)], ["plain: worst", f(s.plain.max)], ["compensated: median", f(s.kahan.median)], ["compensated: worst", f(s.kahan.max)]]));
    }, "", Play),
    button("reset", () => { kind = "nearly cancelling"; seed = 1; [a, b, c, d] = KINDS[kind](seed); err.textContent = ""; sweepOut.replaceChildren(); controls.querySelectorAll<HTMLButtonElement>(".seg button").forEach((x) => x.setAttribute("aria-checked", String(x.textContent === kind))); draw(); }, "", RotateCcw),
  );
  draw();
}
