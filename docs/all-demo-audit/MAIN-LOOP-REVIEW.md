# Main-loop review and limitations

This is the implementing owner's review, not independent release acceptance.
The pre-existing independent-review operation was guard-rejected. It was not
retried, rerouted or replaced with a self-authored independent acceptance file.

## Reviewed boundaries

- Browser shell parses bounded commands; no eval, host execution, privilege change
  or shell substitution. Supported text utilities compute from actual input.
  Source files stay read-only, scratch writes are bounded, persisted snapshots are
  validated transactionally, and storage failures remain visible.
- Visitor content enters text nodes, textareas and JSON downloads. It is not
  interpolated into executable HTML. File imports reject invalid UTF-8/oversize
  input and stale asynchronous reads cannot overwrite newer input.
- Timing models state their simplifying assumptions. Factor test output stays
  hidden until selected on validation; changing input reseals it. Noise-search
  repeated testing is explicitly disclosed instead of described as untouched test.
- Actual racing-writer state and market fills/cash are inspectable. Known input
  cases provide hand-computed oracles; the CAS mutation was caught.
- Recorded benchmark/study controls select published or checked source records;
  they never claim a new GPU experiment. Original sample/IQR/baseline limits stay.
- The DNA utility vendors unchanged MIT Python with revision and byte hashes.
  Browser bounds precede Python; failure cannot release recovered output. The
  visualization derives XOR bytes from the exact indices in the Python report.
  Private compiler code is absent; public integration remains unavailable.
- Render inspection corrected an over-tall phone shortcut group, an offscreen
  terminal footer, and misplaced schedule feedback. A repeated benchmark-details
  class and redundant DNA live-status output were repaired after regressions
  exposed them. No original assertion or timeout was loosened.

## Evidence boundaries

The final receipt pins actual source and retained execution logs. Browser engine
and viewport checks are not physical-device testing. VoiceOver/NVDA and physical
phone sessions remain NOT_RUN. Final subjective visual approval, independent
review and publication are separate from automated local verification. The public
release is not replaced by any local preview or dirty-tree build stamp.
