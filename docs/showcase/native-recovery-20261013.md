# W05 native recovery — 13 October 2026

Recovered `showcase` at `c052097`. Remote `main` and the public site's build stamp both remain `e0221e5d45f1`. This recovery is local; publication still requires Oscar's W05 visual approval.

## Findings and changes

| Reproduced issue | Correction | Evidence |
|---|---|---|
| Clearing a numeric input silently calculated with zero | Reject blank input; preserve the last valid result; explicit zero remains valid | New browser regression tests |
| Reset, new inputs and presets left `aria-invalid` on valid restored fields | Clear validation state whenever valid values are drawn | Each replacement path tested; removing the cleanup makes the reset test fail |
| Correcting one field while a second field remained invalid left both marked | Clear earlier markers before identifying the current invalid field | Regression failed with stale `true`, then passed |
| An older queued surface morph overwrote a newer immediate update after reduced motion was enabled | Invalidate previous morphs at the start of every update | Compare actual canvas pixels before/after advancing queued frames |
| The Lab's status label overlapped explanation text at phone widths | Put the status label in document flow so wrapping reserves its own space | Geometry checks at 320 and 375 px, Chromium and WebKit; rendered screenshots inspected |
| The live tag could imply every arithmetic method was exact | State that computation uses a BigInt reference | The exact reference and rounded methods remain separately labelled |

The independent review's suggestion to embed live experiments on project pages was rejected: Oscar's adopted option 2 explicitly requires static build-computed previews and exact Lab links, preserving the existing JS budget.

## Verification

- Unchanged `plan gate website 39` on recovered `c052097`: PASS, exit 0 in 179 seconds; 102 unit tests, 174 Chromium/WebKit tests, type/build/claims/privacy/budget/IDs/links and Lighthouse assertions.
- Native render probe: 16 views covering FatQat, QTS, AI quant and compensated-products in Chromium and WebKit, desktop and emulated phone, reduced motion. All returned HTTP 200, without horizontal overflow or uncaught page errors. Screenshots inspected for actual presentation; the phone overlap above was found despite the automated checks being green.
- `plan gate website 40`: PASS, exit 0 in 13 seconds; 38 existing/new showcase tests across Chromium and WebKit.
- Mutation control: remove reset's validation cleanup, rebuild, run the unchanged reset regression. Expected exit 1 observed. Restored the exact source bytes before the final full gate.
- `npm run check && npm run test:unit`: PASS after source fixes; 102 unit tests, zero type errors. Two pre-existing unused-variable hints remain.
- `node scripts/check-cv.mjs`: PASS; the downloadable general CV remains phone-free and linked correctly.
- Final `plan gate website 39` after fixes: PASS, exit 0 in 171 seconds; 102 unit and 190 Chromium/WebKit tests, unchanged type/build/claims/privacy/budget/IDs/external and base-path links, Lighthouse ≥0.95 assertions for home, AI quant project and Lab. Full output lives in the durable node-39 plan record.
- Final rendered layout audit: all 18 inline experiments at desktop and phone sizes in Chromium and WebKit (72 views); zero uncaught page errors, horizontal overflow or status-footer collisions. Measured output and four inspected screenshots are saved in `native-20261013/`.
- Public CV download and local `public/cv/Oscar_Choi_CV.pdf` have identical SHA-256: `e7b1bc193df5aa22adc7550bb76d8866a74d7175fe65c6148c4346a9e985407b`.

The first version of the new tests used an accessible-role lookup for an intentionally hidden empty alert. That locator failed before the later assertions. The correction selects the same `.cp-err-msg` element and retains all assertions. A missing canvas TypeScript annotation was also corrected. No existing acceptance check, assertion, tolerance or gate was weakened. Oscar's newer autonomous-work instruction was verified in the coordinating native chat before correcting the locator.

## Remaining boundary

W05 visual approval is outstanding. No push, merge to main or deployment occurred. Actual physical-phone and screen-reader testing remains NOT_RUN; browser-engine/emulated tests do not establish universal device compatibility. The arithmetic demo is a browser demonstration, not a new GPU benchmark.
