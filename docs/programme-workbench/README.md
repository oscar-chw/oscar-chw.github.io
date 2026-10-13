# Browser programmes — 14 October 2026

Extends the reviewed demo slice in `../demo-focus/`. Baseline: live `7bba358e0882`; parent candidate `b06a729`. Parent plan: website nodes 49–52. Final release evidence belongs in the career release receipt, not in these historical baseline identifiers.

## Brief and scope

Keep the existing terminal/liquid-glass design, quiet work surfaces and source boundaries. Oscar asked for useful programmes with editable inputs and real outcomes, and a console that behaves more like a familiar shell. The focused addition connects those two requests without a backend, new dependency or private platform code.

| Surface | Before | Visitor can now do | Boundary |
| --- | --- | --- | --- |
| Console | Search, navigation, jokes and policy verdicts | Navigate a virtual filesystem; create, edit, copy and remove scratch files; use pipes, literal-text filtering, sorting, counts and redirects | Browser implementation of a documented command subset; no host shell, package installs or network commands |
| Editor | No editable workspace | `nano notes.txt`, change text, save to the virtual workspace or download it | Scratch files last for the current page; download to keep |
| Data workbench | Fixed synthetic records in a cutoff illustration | Edit or import version CSV, execute an as-of query, inspect individual publication events and source lines, export the actual result | Independent public teaching logic; synthetic starter rows or visitor-supplied local data, no upload |
| Connected journey | Demos and console separate | Create a CSV in the console and `open data-workbench FILE` to query it | One-time tab-storage handoff, consumed by the workbench; direct import remains available if storage is blocked |
| Failure/recovery | No custom data path | Invalid or ambiguous rows show source-line errors; edited drafts invalidate old output/export; reset restores the example | 200 records / 64 KB input, bounded terminal files/output; no silent partial ingestion |

The computation is `queryVersions` over parsed input using the existing `asOf` implementation. The cutoff determines which published version each field may use. The result identifies the selected source row and later information withheld, making the leakage tradeoff visible. Export includes that same result and input provenance.

## Try the connected journey

Open the top console and run each line separately:

```text
pwd
mkdir research
cp /lab/versions.csv research/custom.csv
nano research/custom.csv
cat research/custom.csv | head -n 4
open data-workbench research/custom.csv
```

Change a value or its publication time, run the query, select a revision marker, inspect its source line, then export. `help` lists supported commands and limits; `guard COMMAND` retains the real guard's policy demonstration. `rm /` reports that the target is a directory, and protected source paths remain read-only.

## Verification and review

- Node 51 gate: type/build/unit checks and 46 Chromium/WebKit terminal/navigation tests PASS, exit 0 in 27 seconds.
- Node 52 gate: type/build/unit checks and four Chromium/WebKit data-workbench tests PASS, exit 0 in 13 seconds. Both gates ran 111 unit tests.
- Connected browser tests inspect edited file contents, the passed CSV, selected data/source rows, an actual JSON download, validation, reset, keyboard focus, local import and phone bounds.
- Independent review reproduced silent removal of empty delimited CSV records and a Unicode byte-limit bypass. Added regressions failed before the two fixes, then passed. Genuine blank lines, quoted fields, source line numbers and exact byte boundaries have positive controls.
- Visual review found overlapping phone timeline markers and lost focus after redraw. New assertions reproduced both. Separate 44px revision rows, larger targets and restored focus pass in both engines. `render-results.json` records 375/1280px render checks: no page overflow or uncaught errors; editor dialogs fit the viewport. PNGs include viewport and cropped component views; fixed navigation may overlap the top of a tall component-only screenshot.
- The separately approved benchmark test split preserves all original assertions, adjacent same-panel transitions and the default timeout. No unrelated timeout or check was relaxed.
- The first full integration attempt passed 254 of 260 browser checks. It caught duplicate project CTA links from eagerly constructed console entries and a displaced existing rail transition. Deferring console-only entries until use and appending the new workbench after the existing QTS entries restored all 98 affected checks, with the old tests unchanged.
- A stronger phone assertion reproduced the two-row header obscuring the experiment breadcrumb; the mobile scroll margin now clears it. Independent visual review also caught page text bleeding through the editor: a theme-backed opaque reading surface preserves the glass rim and sheen while removing that overlap. The refreshed `*-375-viewport.png` and `*-375-editor.png` show these corrections.

The full unchanged node 49 integration gate, independent final review, cloud CI, automatic Pages deployment and exact live readback remain required for publication. Their final results are recorded separately.

NOT_RUN: physical devices, a screen-reader session, an actual Linux kernel, fresh CPU/GPU benchmarks, private QTS services, economic or hiring outcomes.

## Coordinated accuracy update

The CV owner corrected the IMC percentile claim: the published participation count did not establish a ranked-finisher denominator. The site now states 904th globally and 18th in Hong Kong, retaining Team SHDC and Oscar's final-two-rounds contribution. The phone-free PDF byte-matches the approved canonical source at SHA256 `8b4341bda24a347854da7143ba464a827017ff3bca36518af8992c1f03160873`. Node 53's unchanged build/claim/number/privacy/CV checks passed, as did an explicit built-HTML/search/PDF scan for the withdrawn wording. Root independently checked all seven CV variants and rendered the public one.

The programme-only full node 49 gate passed in 202 seconds: 111 unit and 260 browser tests, nine Lighthouse runs and all existing checks. It preceded this accuracy update; the combined final candidate requires a fresh gate. Root independently verified all 19 source-manifest pins and the final WebKit phone viewport/editor images.

An optional all-image refresh aborted on an incorrect diagnostic word-count literal (the fixture has nine words; the script waited for ten). It did not modify an acceptance test or gate. No completed all-image refresh is claimed from that attempt; the earlier render inventory and separately refreshed, root-reviewed final phone images retain their stated scope.

## School-project scope and final input repair

Oscar withdrew StudyFlow from the showcase. Its case study and unused source part are removed from the current tree; the old URL still resolves to the coursework introduction. The independently authored synthetic interval checker remains a general maths exercise without a StudyFlow claim or project link. Historical public commits are not rewritten. The coursework artwork now depicts data/code representations. The compiler remains a private-code case study, without a claim that it executes in the browser.

The blueprint title and scope now distinguish an asset-agnostic architecture from the demonstrated crypto worked example. Existing URLs, source artifacts, limitations and controls remain intact.

A new same-page navigation test reproduced the console covering the selected Lab experiment in both engines. Dismissing the dialog on its navigation-link activation passes both tests. Node 54's affected suites passed 112 browser cases.

The site's separate DNA exercise encoded UTF-8 but decoded non-ASCII bytes as dots and replaced empty input with a space. Three new unit cases and two browser cases failed first. UTF-8 decoding, code-point accounting, honest empty output and bounded deletion events fix that behavior; node 55 passed 114 unit and 66 browser tests, including the unchanged clean-ASCII and deletion checks.

The Kaggle team's model is not being copied or presented as executable here. A separately authored synthetic attention/parity illustration is pending its own source and checks, outside this candidate.

The final render pass also exposed an input-position seam in the DNA panel and cropped coursework-art labels. The input now lives with stable controls, which precede output on narrow screens; both desktop and phone browser cases keep the field below navigation. The artwork's representations fit within the phone view. Fresh `final-*` images record these corrected surfaces.

Final frozen-candidate acceptance: `plan gate website 49 --owner website-demo-integration` PASS, exit 0 in 191 seconds: 114 unit tests, 266 Chromium/WebKit tests, the unchanged build/type/content/number/privacy/ID/JS-budget/CV gates, internal/external and `/next/` links, and nine Lighthouse runs. Scores are recorded in `lighthouse.json`. `source-manifest.json` binds the 28 implementation/test/content files and records the withdrawn source file. Independent root review and actual CI/Pages/live release remain separate receipts.
