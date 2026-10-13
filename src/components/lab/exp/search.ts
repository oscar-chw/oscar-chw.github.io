import { buildIndex, search, tokens, type Index, type Passage } from "../../../lib/lab/bm25";
import { h, segmented, button } from "../ui";

// BM25 over this website's own write-ups, fetched as JSON on first use. Each hit shows its score
// and what each query word contributed, so the ranking can be read rather than trusted.
export async function mount(stage: HTMLElement, controls: HTMLElement) {
  const base = (document.querySelector<HTMLElement>("[data-base]")?.dataset.base ?? "/").replace(/\/$/, "");
  const input = h("input", { class: "sr-in mono", type: "search", placeholder: "ask this site: look-ahead, GPU, order book…", "aria-label": "Search this website's write-ups", autocomplete: "off" }) as HTMLInputElement;
  const list = h("ol", { class: "sr", "aria-live": "polite" }), status = h("p", { class: "lab-note mono", role: "status" }, "Loading this site's text…");
  stage.append(input, status, list);
  let ix: Index | null = null, how: "bm25" | "count" = "bm25";
  let ready: Promise<boolean>;
  const retry = button("Retry search index", () => { ready = load(); void run(); });
  retry.hidden = true; controls.append(retry);
  const load = async () => {
    ix = null; list.replaceChildren(); retry.hidden = true;
    stage.dataset.loadState = "loading"; stage.setAttribute("aria-busy", "true");
    status.setAttribute("role", "status"); status.textContent = "Loading this site's text…";
    try {
      const response = await fetch(`${base}/lab/corpus.json`);
      if (!response.ok) throw new Error(`Corpus HTTP ${response.status}`);
      const ps: unknown = await response.json();
      const valid = (p: unknown): p is Passage => {
        if (!p || typeof p !== "object") return false;
        const x = p as Record<string, unknown>;
        return ["id", "title", "href", "text"].every((k) => typeof x[k] === "string")
          && (x.href as string).startsWith("/") && !(x.href as string).startsWith("//");
      };
      if (!Array.isArray(ps) || !ps.length || !ps.every(valid)) throw new Error("Invalid corpus");
      ix = buildIndex(ps); status.textContent = `${ps.length} passages indexed in your browser`;
      stage.dataset.loadState = "ready";
      return true;
    } catch (error) {
      console.warn("Lab search index could not load", error);
      status.setAttribute("role", "alert"); status.textContent = "Could not load this site's text. Retry the search index when the connection is available.";
      stage.dataset.loadState = "error"; retry.hidden = false;
      return false;
    } finally { stage.setAttribute("aria-busy", "false"); }
  };

  const mark = (text: string, qs: Set<string>) => {
    const out: (Node | string)[] = [];
    for (const part of text.split(/(\s+)/)) out.push(qs.has(tokens(part)[0] ?? "") ? h("mark", {}, part) : part);
    return out;
  };
  const run = async () => {
    if (!await ready) return;
    if (!ix) return;
    const q = input.value.trim(), qs = new Set(tokens(q));
    if (!q) { list.replaceChildren(); return; }
    const hits = search(ix, q, how).slice(0, 6), top = hits[0]?.score || 1;
    list.replaceChildren(...(hits.length ? hits.map((hit) => h("li", {},
      h("a", { href: `${base}${hit.p.href}` }, hit.p.title),
      h("span", { class: "sr-bar", style: `--w:${(hit.score / top) * 100}%` }),
      h("span", { class: "sr-s mono" }, `${how === "bm25" ? "BM25" : "count"} ${hit.score.toFixed(2)} = ${hit.terms.map(([t, v]) => `${t} ${v.toFixed(2)}`).join(" + ")}`),
      h("p", {}, ...mark(hit.p.text.slice(0, 220) + (hit.p.text.length > 220 ? "…" : ""), qs)),
    )) : [h("li", { class: "sr-none" }, "nothing matches every way of reading that; try fewer or plainer words")]));
  };
  input.addEventListener("input", () => void run());
  // open with an answered question, so the ranking is visible before anyone types
  const EXAMPLES = ["look-ahead bias", "GPU state vector", "order book replay", "memory streaming", "claims verified by tests"];
  const chips = h("div", { class: "chips" }, ...EXAMPLES.map((q) => { const c = h("button", { type: "button", class: "chip mono" }, q); c.addEventListener("click", () => { input.value = q; void run(); }); return c; }));
  stage.insertBefore(chips, status);
  input.value = EXAMPLES[0];
  controls.append(
    segmented("rank by", ["bm25", "count"], how, (v) => { how = v as typeof how; void run(); }),
    h("p", { class: "lab-note" }, "BM25 weighs a rare word above a common one and stops rewarding repeats; a raw count is fooled by a passage that says one word many times. Try “book” both ways."),
  );
  ready = load();
  await run();
}
