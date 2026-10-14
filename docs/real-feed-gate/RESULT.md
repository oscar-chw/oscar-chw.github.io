# Checked local candidate — 14 October 2026

Preview: `http://localhost:4340/demos/#gatedbuild` and the engineering section of
`http://localhost:4340/projects/ai-quant-research-system/`.

The old success toggle is replaced by an actual invocation of the public
`replay.admission.admit` Python function. Its unmodified source, licence and tests
are pinned to `f8c48256e12b96523807ba8f59c04b798517e04e`. The input records are an
explicit synthetic fixture; this is neither a production incident nor a claim
that an AI reviewer, pytest process, exchange session or GPU benchmark ran.

## Try it

1. Run all checks on the starting archive. The function rejects record 1 because
   available=19 ms precedes received=21 ms. Its exact exception is visible.
2. In the raw archive, change `"available_ms":19` to `"available_ms":22`.
   The prior result becomes stale immediately; no accepted result is retained.
3. Rerun. The actual returned rows show the bid aggregate changing from 3 to 1,
   not 4. Inspect the raw Python result or download the exact input and receipt.
4. Paste another archive, change a price or clock, or restore the starting
   example. The selected example never decides whether the check passes.

The first run downloads Python/WebAssembly. A load failure produces an
unavailable state, not a verdict; retry after recovery is tested. Source and
upstream-test links are directly visible. Phone results include a readable book
summary; individual execution steps are secondary and collapsed on phones.

## Verification

- `python3 scripts/check-feed-gate-source.py`: PASS. All vendored source hashes
  match; native Python refuses the bad-clock fixture and computes the independent
  hand-worked corrected book.
- New browser contract against the old UI: three failures, retained as baseline.
- `plan gate website 60 --owner website-real-feed-runtime`: PASS, 41 seconds,
  120 unit and 92 targeted Chromium/WebKit checks.
- `plan gate website 61 --owner website-real-feed-preview`: PASS, 222 seconds,
  120 unit and 282 browser checks; unchanged type/build/budget/claim/number/privacy/
  duplicate-ID/CV checks, internal/external and `/next/` links, nine Lighthouse runs.
- After that full gate, the unavailable-runtime test was strengthened to verify
  actual recovery and rerun. Both browser engines passed in 6.2 seconds; no
  production source changed. Existing assertions/timeouts remain intact.
- Mutation control: forcing the runtime adapter to return `accepted: true`
  makes the runtime tests fail. Exact source bytes were restored.
- Saved initial/rejected/corrected renders cover Chromium/WebKit at 375 and
  1280 px with reduced motion. Main inspected both result states on phone and
  desktop: no page overflow or uncaught errors, readable source/error/output and
  status below fixed navigation. `renders/results.json` records the measurements.
- Lighthouse performance: home 99/99/99, project 100/100/100, Lab 99/99/99;
  accessibility 97–100. Raw per-run scores are in `lighthouse.json`.

The first implementation gate caught an Astro template syntax error; it was
fixed in the source. Full validation then caught source-format mismatches for
3.00/1.00 in the static preview; the page now uses the source's 3/1 quantity
representation. Both failures remain recorded; no check was relaxed.

## Release state

**Local candidate only. Independent review is NOT_RUN.** The reviewer spawn was
rejected by the PreToolUse network-boundary guard as scheduling/delegating a
network/VPN mutation. No child was created and no retry or alternate delegation
was attempted. This record is ordinary project evidence, not a substitute review.
Plan nodes 62 (independent review) and 63 (publication decision) remain pending.
No push or deployment belongs to this candidate.

Physical devices, screen-reader use and production/exchange/GPU execution were
not tested. This bounded validator checks declared archive data and continuity;
it does not authenticate the supplied clocks or establish research performance.

See `brief.md`, `verification.json`, `source-manifest.json` and the saved renders.
