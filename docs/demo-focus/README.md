# Demo focus — 14 October 2026

Baseline: published `7bba358e088231a6a0a1048705782288191e8bd5`. Candidate branch: `codex/demo-focus-20261014`.
Parent plan: `../plan/website.md`, nodes 46–49. The accepted site shell stays unchanged.

existing: read W05's complete prompt, the qfrmlab design toolkit, the source/claim contract, existing Lab modules and `ui.ts`, `scripts/showcase-inventory.mjs`, `scripts/long-tasks.mjs`, previous route/demo inventories and Playwright suites. Applied production-code, standards, systematic debugging and verification skills. Existing Astro/CSS/Playwright is sufficient; Figma/Sites regeneration or a new dependency would add a competing design source. Public FatQat source artifacts were fetched and hash/row checked, not inferred from a headline.

## Interaction brief and coverage

| Surface | Before | Focused change / visitor journey | Evidence boundary |
|---|---|---|---|
| FatQat Lab | Live arithmetic and small statevector demos; recorded speed claim lived in prose | Choose state size, output and product mode → CPU/GPU timing and ratio → output-transfer explanation → method/source → reset | Twelve archived warm-call rows. Modes have separate CPU baselines. Sample IQR is not a confidence interval. No live GPU benchmark or general speed claim. |
| QTS point-in-time | Cutoff slider and version table | Compare as-of versus latest → late correction exposes leakage → inspect publication days → before-data boundary → reset | Synthetic independent teaching store, not private QTS implementation or measured strategy performance. |
| Lazy loading / search | Rejected imports/fetches left an unhandled or blank state | Explicit loading, failed state, working reload/retry; failed data never labelled live | Network failures injected through browser routing. Chromium caches failed imports per document; WebKit retained failed preloads across reloads, fixed by refreshing same-origin preloads then reloading. |
| Phone navigation / controls | Hash changes could leave the chosen experiment out of view; long results preceded inputs | Reveal selected panel; stack these two demos' controls first; keyboard-scrollable version table with visible hint | Browser viewport emulation, not a physical-device claim. |
| Segmented controls | Space selection worked but arrow-key radio navigation did not | Arrow/Home/End selection, roving tab stop, resets preserve the selected tab stop | Shared helper affects all existing Lab radio controls; unchanged full suite covers regressions. |

Project pages remain build-computed reading surfaces. FatQat now links directly to `/demos/#fatqat-bench`. Existing compensated-arithmetic interactions remain available. The catalogue now has 23 experiments (19 inline, four standalone). Prior complete route/demo inventories remain under `docs/showcase/`; this pass checks every affected surface and reruns the existing whole-site suite.

The wider seven-lane portfolio map is owned by GitHub integration. This slice does not label the crypto-first blueprint as an implemented asset-agnostic platform, publish private WQB code, or create a duplicate quant vault. Existing selection-bias and pricing demos retain their implementation scope; no new trading edge or hedging result is claimed here.

## Verification record

- `npm run check && npm run build && BASE_URL=http://localhost:4340 npx playwright test e2e/demo-focus.spec.ts`: 12 PASS after the keyboard repair; zero type errors/warnings (two existing hints).
- `plan gate website 46`, `47`, `48`: PASS, respectively 13 s, 8 s, 11 s before the final shared-radio correction. Node 49 reruns the full unchanged suite over that correction.
- Source verification: both upstream JSON SHA256 values match; all 12 medians, quartiles and ratios match their exact recorded workload rows. See `source-verification.json`.
- Render inventory: 24 views, three affected demos at 320/375/768/1280 in Chromium/WebKit. No page overflow, meaningful text below 14px or uncaught errors. `render-results.json`. The two flagship demos then received control-first stacked layouts and refreshed screenshots.
- Named failing controls preserved: missing loading/search recovery (two Chromium failures); WebKit reload without cache refresh; mobile hash transition; missing radio arrow navigation. Build failure from Astro's generated `url` export was repaired with an import alias. The unchanged phone scanner matched an eight-digit date filename; the source filename now uses an ISO date. No gate or assertion was weakened.
- `mutations.json` and accompanying logs record independent broken-data probes against an isolated build copy, with clean and restored controls. They do not mutate the serving build.

Final local acceptance: `plan gate website 49 --owner website-demo-integration` PASS, exit 0 in 193 seconds: 102 unit tests, 228 Chromium/WebKit checks, build/type, unchanged claim/number/privacy/ID/JS-budget/CV checks, 25 external links, root and `/next/` links, and nine Lighthouse runs across three routes. Lowest category score 0.97; performance 0.99–1.00. Independent semantic re-review found no remaining concrete issue after the radio correction. See `review.json`, `lighthouse.json`, `mutations.json`. Local click-to-next-paint diagnostics (20 clicks per view, two frames) average 19.2–33.2 ms; `response-times.json` records standard errors and scope. This is not a hardware-independent guarantee. Actual live release is recorded separately in the career receipt after CI/Pages and public readback.

NOT_RUN: physical phone/tablet tests, an actual assistive-technology session, fresh GPU benchmark, economic outperformance or validation of a new trading platform.
