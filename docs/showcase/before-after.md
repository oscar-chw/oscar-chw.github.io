# Showcase W05: before and after

Branch `showcase` (local; **not deployed**: Oscar's visual approval is the gate). Before: `e0221e5` (live). After: the
branch head. Preview: `npx astro preview --port 4340` from this repo, at http://localhost:4340.

## What changed, and the evidence

| Area | Before | After | Evidence |
|---|---|---|---|
| Flagship pages (FatQat, QTS, AI quant research system) | summary, figures, then a decorative graphic | an engineering case study: problem, constraints, a labelled BUILD-COMPUTED result, the tradeoff (chose / over / because / cost), what I built, evidence links, one click to the live experiment | `shots/after-projects_*`, e2e `showcase.spec.ts` |
| FatQat's tradeoff | asserted in prose ("error-compensated GPU products") | computed: a new Lab experiment rounds a·b − c·d plainly and with Kahan's algorithm against an exact BigInt reference; the visitor edits inputs, switches cases and runs a 2,000-case sweep | `kahan.test.ts` (7 tests, 3 mutants caught), e2e (5 tests) |
| Provenance of computed figures | — | stored in `sources/site-experiments/*.json`, listed as page sources so check-numbers traces them, and recomputed by unit tests that fail on any drift | `kahan-preview.test.ts`, `site-previews.test.ts` |
| Reset | 9 of 17 experiments had none | every experiment has one (its own, or the shared reset that remounts it) | e2e: every experiment, plus a change-reset-compare check; mutant caught |
| In-page links to another experiment | changed only the hash: nothing opened (command menu, search, typed hash) | the Lab opens the experiment on `hashchange` | e2e (found by the new tests) |
| Result lines | rank IC and the qubit sandbox had none | one line in words for both | e2e |
| Text under 14 px | 2,359 findings over 68 views; Lab labels at 11.5–12.8 px | 134, none in the Lab; the rest are mostly decorative labels in the home-page harbour scene | `inventory-before.json` vs `inventory-after.json` |
| Keyboard focus on the nav's command input | none visible | 2 px accent ring | e2e; mutant caught |
| Script on project pages | shared site script only | unchanged (js-budget unchanged): results are build-computed, the live run is in the Lab | `js-budget.mjs` |

Unchanged: no console errors and no horizontal overflow at 1280 or 375 px, before or after.

## Commands and results (branch head)

Recorded by `plan gate website 39` (the CI-equal gate: check, unit tests, build, js-budget, check-numbers, scan-content,
dup-ids, link-check internal and external, the `/next/` base build and its link check, Playwright in Chromium and WebKit,
Lighthouse ≥ 0.95 on home, a project page and the Lab). Its output is in `plan/website/39-*.md`.

## Not run (NOT_RUN)

- The inventory script ran in Chromium only; WebKit is covered by the e2e suite, not by the inventory.
- No screen-reader pass (VoiceOver/NVDA); the checks are DOM-level (roles, names, live regions, focus).
- No real-device run; phones are emulated (375 × 812, touch).
- Inline embedding of the live experiment on project pages: not built, by decision (keep js-budget unchanged). If it is still
  wanted after this preview, it is a separate decision to make with its measured cost.

## Against references

- **Bartosz Ciechanowski, "Mechanical Watch"** (https://ciechanow.ski/mechanical-watch/): the reader manipulates the real
  mechanism under explanation (drag to rotate, a slider to see inside). The new FatQat experiment applies this to the
  project's own mechanism, the 2×2 determinant in every complex product, instead of a generic visual.
- **Bret Victor, "Explorable Explanations"** (https://worrydream.com/ExplorableExplanations/): a reactive document lets the
  reader "play with the author's assumptions and analyses, and see the consequences". The tradeoff card states the
  assumption (plain is fine on typical inputs); the experiment lets the visitor test it, including the case where it is not.
- **Distill, "Research Debt"** (https://distill.pub/2017/research-debt/): good explanation is engineering work in itself.
  Here every figure on a case study is traceable (CONTENT.md, `sources/`, or a recomputed results file), so the
  explanation cannot drift from the evidence.

What this does *not* claim: the aesthetic is unchanged by design (keep the current style); the improvement is that the work
is now demonstrated rather than described, on the pages a visitor reaches first.
