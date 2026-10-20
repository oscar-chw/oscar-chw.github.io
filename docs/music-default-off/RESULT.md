# Music requires an explicit Play action

## Request and release authority

Oscar's direct messages in the coordinating chat on 15 October 2026 (Asia/Taipei)
require music off by default and code review, tests and CI before his website review.
The original messages are `01a13b8e-739a-77f3-a0a9-3ab5bb281f1a` and
`01a13b8e-7400-7d50-98ac-4313a7b25990`. His subsequent answer
`01a13b91-f65d-7111-b1d5-22292c20a0a1` authorises a review branch and PR, with no
direct main push, and exactly one read-only reviewer retry. Any new rejection is
binding. No merge or deployment before his review.

The preceding local candidate `dba5131c45ff38c16d8dcca516ff06b69c719dc5` and its
passing checks remain historical evidence; they do not certify this successor.
The existing public release is `14591ed867c511581142d130f7bb2918ee4c290e`.

## Behavior and check scope

- Ignore a previously saved `music=on`; every fresh page starts off.
- Keep the selected track and volume. Changing either while off does not play.
- Only the Play button requests playback, including keyboard activation.
- General clicks, keypresses and visibility changes do not resume music.
- Navigation, reload and a cached-page return require another Play action.
- Cancelling while the player module loads invalidates the pending request.
- Tab visibility does not recreate or stop an already explicitly opened player.

The old test expected automatic resume after a general keypress. That requirement
was explicitly superseded; its assertions now require silence and then an explicit
Play action. The existing toggle, credited visible player, volume, track, player
movement, closing and responsive control checks are retained. No timeout, retry or
acceptance threshold is relaxed.

Six new Chromium regressions failed on the previous implementation before source
edits (`evidence/baseline.log`). Browser checks intercept YouTube requests: they
verify loading intent, visible player lifecycle and settings, not audible playback
or YouTube availability. Visibility and cache-lifecycle probes dispatch browser
events; they are not physical-device background-audio measurements.

## Deployment policy

The manual deployment trigger is removed. The build job evaluates completed,
successful CI from a same-repository push to main and checks out that run's exact
head SHA. PRs, forks, other workflows, incomplete or failed runs, and missing SHAs
are refused. A successful PR CI run uploads its checked `dist/` directory under an
artifact name containing the actual checkout SHA; production remains unchanged.

Thirteen policy checks parse the actual workflow YAML and evaluate its job
condition using GitHub's expression implementation. The baseline produced ten
contract failures with three controls passing; the repaired workflow passes all
thirteen. The initial test-helper constructor mistake is retained separately and
was corrected without changing assertions. References: [workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
and [GitHub expression library](https://github.com/actions/languageservices/tree/main/expressions).

## Verification

Final local gate76 **PASS, exit0/332s**:174 unit tests,362 Chromium/WebKit tests,
nine Lighthouse runs, type/build/budget/content/claim/number/duplicate-ID/link
checks (including /next/) and CV. Exact256 source pins and command output are in
`evidence/successor.json` and `evidence/full-gate.log`; original bytes are retained
in gzip. Independent review and exact-head PR CI remain pending. The earlier rejected reviewer launch is
retained in the canonical website plan; it is not counted as review.


Preflight: affected gate75 PASS (161 unit,80 browser); workflow gate77 PASS (13
policy tests and type check). The first full browser attempt had357 passes and one
WebKit initial local-page navigation timeout before assertions. The unchanged
isolated case passed; a complete unchanged rerun passed358. Final music checks
pass14, including an additional module-load failure case. No timeouts/retries were
changed. The successor full gate76 remains required.

Fresh music renders cover320/1280 in Chromium/WebKit, with zero page errors or
horizontal overflow. The capture initially seeded localStorage in the intercepted
opaque YouTube iframe; restricting the fixture to the top-level site corrected
that instrumentation error, preserving all assertions. Existing96 demo-layout
renders belong to dba5131 and are explicitly inherited because layout is unchanged;
all runtime demo journeys were rerun. Audible/physical-device testing is NOT_RUN.


The first full gate76 stopped with359 browser passes and one5s Python-loading
assertion failure. Trace review found sequential source retrieval delaying runtime
startup. The loader now overlaps independent pinned-file fetches and trusted runtime
boot, then binds Python only after every checksum succeeds. All original assertions
remain. Its seven runtime units and14 browser cases pass. A held-source corruption
case fails against the old serial loader; with the successor it observes concurrent
startup and still refuses corrupt bytes without output/export. The first new test
used an incorrect phrase for the existing unavailable state; that instrument error
and its correction are retained. No timeout, assertion boundary or worker count was
relaxed. The subsequent full gate76 passed as recorded above.
