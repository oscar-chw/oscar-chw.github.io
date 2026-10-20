# Flagship execution: local checks passed, release held

The 20 October standing instruction clears demonstrably faulty check-only holds.
The previous feed-fixture hold is resolved. This is local verification of source
revision `3bd7322707d533d3e88ce579b2189a44deb37202`, not publication approval.

## Corrections and controls

- The accepted replay fixture now uses the Python contract's `disconnect` reason.
  Its custom quantities, clocks and original assertions are unchanged. The former
  `visitor disconnect` value remains a negative case: Python raises `ValueError`,
  the browser rejects it, and no usable book is shown.
- Rejected runs intentionally export their exact failure receipt. The added
  negative test originally expected that download to be disabled. The existing
  feed brief requires exporting the input, source and returned result; the test
  now verifies `accepted=false`, the exception, no rows and the exact invalid input.
- The old stepwise integration test stalled downloading the CDN WASM before
  reaching archive admission. It now uses the existing same-version local
  Pyodide helper, with every assertion and the standard timeout preserved.
  Runtime-unavailable, corrupt-source and retry tests still run.
- Responsive capture now accepts `BASE_URL` while retaining its old default.
  The fresh views use the active candidate, not the frozen older preview.

The original failures, subsequent failed assumptions and CDN traces are preserved
in the project review directory. The raw command logs are also in
[`checks/raw-logs.zip`](checks/raw-logs.zip). No application code or pinned Python
validator changed in these corrections.

## Results

- `plan gate website 95`: PASS; the standing user instruction clears the check hold.
- `plan gate website 91`: PASS, 36 seconds; 20 Chromium/WebKit feed cases.
- `CONTENT_MD=<approved ledger> plan gate website 92`: PASS, 316 seconds;
  177 unit tests, 402 browser tests, nine Lighthouse audits and the original
  build, script budget, claims, numbers, privacy, IDs, links, base-path and CV checks.
- `plan gate website 93`: PASS; all 24 registered demos have fresh Chromium/WebKit
  captures at 375 and 1280 pixels. All 96 views report no overflow or page exception.
- Twelve further custom-input views cover actual arithmetic, admitted feed states
  and recorded blueprint comparisons. Main inspected desktop arithmetic and phone
  feed renders. The checks and views bind 271 source files in
  [`evidence.json`](evidence.json).

For repeatable verification the browser checks and focused captures execute real
Python using the installed, pinned Pyodide assets. These results do not certify
public CDN first-load latency. The earlier timeout is retained, not recast as a pass.
Physical-device and screen-reader testing remain not run.

## Release boundary

Fresh read-only observation found the public Lab still serving `14591ed867c5`.
The rejected independent reviewer, refused release-check command and publication
holds remain separate and unchanged. No reviewer retry, alternate review route,
push, PR update, merge or deployment was performed. Remote CI for this successor
has not run. The private compiler remains unavailable for public integration.
