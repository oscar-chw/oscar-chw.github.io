# Explorable input and terminal follow-up — 14 October 2026

Local preview: `http://localhost:4340/demos/#gatedbuild`. The console is available
from the top bar or `/` on any page. This follow-up extends local commit
`bbc9ab389abd3e85ac643dde019f4d0ae2f2d3df`; its older results remain in `RESULT.md`.

## Interaction

- Choose the correct archive, a bad clock, an off-grid price or a recording gap.
  Each changes editable input bytes only. The unchanged public Python validator
  decides the result; a selector cannot manufacture acceptance.
- Change `0.49001` to `0.49` in the price example and rerun to see an actual
  rejection become acceptance. The recording-gap example remains structurally
  valid but returns `GAP` and no usable book for the unavailable interval.
- Download a correct JSON-lines template, edit it, and import the file locally.
  The editor shows the imported text before running anything. Oversized or invalid
  UTF-8 files are refused without replacing the editor. A delayed file read cannot
  overwrite a newer edit. Prior receipts become unavailable as soon as input changes.
- Inspect the exception, returned rows, source and exact downloadable receipt.
  Reset restores the original faulty archive and clears run history.
- The terminal retains its browser filesystem, editor, pipelines, history and
  page/Lab navigation. `man apt` explains Linux package syntax, including the
  distinction between `apt install` and the single command `apt-get install`.
  Unsupported package and privilege commands report their limits without a fake
  installation. Source: [apt](https://manpages.debian.org/trixie/apt/apt.8.en.html)
  and [apt-get](https://manpages.debian.org/trixie/apt/apt-get.8.en.html).

Starter archives are synthetic. The validator checks declared data; it cannot
authenticate supplied timestamps, prove exchange completeness or establish
research performance. Visitor input is data, not arbitrary Python or host commands.

## Verification

- Baseline: seven APT unit failures, one APT browser failure and two exploration
  browser failures before implementation. The phone help-position regression
  failed in both engines before the scroll fix.
- `plan gate website 64 --owner website-exploration-apt`: PASS, 27 seconds;
  128 unit and 20 targeted browser checks. Existing assertions and timeouts remain.
- `plan gate website 65 --owner website-exploration-full`: PASS, 222 seconds;
  128 unit and 290 Chromium/WebKit browser checks. Type/build, script budget,
  claim/number/privacy scans, duplicate IDs, external/internal and `/next/` links,
  CV validation and all nine Lighthouse runs passed.
- The first node65 run failed the existing wording scan because an example hint
  used a phrase reserved by the FatQat accuracy rule. The hint was rewritten to
  describe checking decimal strings against the price grid. The check was unchanged.
- Mutation control: removing the stale-import revision check made the unchanged
  late-file-read test fail. Source was restored byte-for-byte before the final gate.
- `CAPTURE_DIR=docs/real-feed-gate/exploration-renders node scripts/inspect-feed-gate.mjs`:
  PASS after the final gate. Chromium and WebKit at 375 and 1280 px, reduced motion;
  initial/rejected/accepted/off-grid/gap states and APT guidance captured. Zero
  horizontal page overflow and uncaught browser errors. Main inspected phone and
  desktop renders, including first-visible syntax, file controls and actual results.
- Lighthouse performance: home 99/99/99, project 100/100/100, Lab 99/99/99;
  accessibility 97–100. See `exploration-lighthouse.json` for all nine reports.
- `git diff --check`: PASS. Main read the owned source/test diff. This is not
  independent review.

The render checks serve the actual pinned Pyodide runtime from installed package
assets to avoid CDN variability; results are computed, not mocked. Physical devices
and screen readers were not exercised. External runtime availability is separate
from the tested error/recovery contract.

## Release state

**Checked local candidate only. Independent review remains NOT_RUN.** The earlier
reviewer spawn was rejected by automatic PreToolUse review with
`NETWORK BOUNDARY: scheduling or delegating a network/VPN mutation is prohibited.`
No child was created; no retry, rephrasing or alternate review route was attempted.
This evidence is not a substitute reviewer verdict or publication approval.

Plan nodes62 and63 remain pending. Nothing in this revision was pushed or deployed.
The public release remains `14591ed867c511581142d130f7bb2918ee4c290e`.

Exact source hashes and machine-readable outcomes are in
`exploration-manifest.json` and `exploration-verification.json`. The previous
`source-manifest.json` and `verification.json` describe the earlier local slice.
