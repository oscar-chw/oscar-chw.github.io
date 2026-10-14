# Browser dependency repair

The release candidate uses Playwright 1.64.1, including WebKit 27.2 (build 2370).
Application code, browser assertions, timeouts, retries, workers and the Chromium/WebKit
matrix are unchanged by this repair.

## Controlled Linux observation

[Diagnostic CI](https://github.com/oscar-chw/oscar-chw.github.io/actions/runs/38638529573)
compared the same frozen application and original timetable test with two browser releases.
The additional reduced filter-animation example is from the
[upstream Playwright issue](https://github.com/microsoft/playwright/issues/42637).

| Check | Playwright 1.63.0 / WebKit 26.6 | Playwright 1.64.1 / WebKit 27.2 |
| --- | --- | --- |
| Repeated filter animations | Renderer crashed after 23 cycles | Completed all 100 cycles |
| Original timetable test, repeated 20 times | 20 first-attempt passes | 20 first-attempt passes |

The old browser's protocol explicitly reports `Target.targetDestroyed` with
`crashed: true`. Its launcher exits normally afterward. This explains why a
normal launcher exit alone cannot exclude a renderer failure.

The upstream repair is [WebKit #73621](https://github.com/WebKit/WebKit/pull/73621),
included in [Playwright's browser update #42748](https://github.com/microsoft/playwright/pull/42748).
The comparison and raw-artifact hashes are retained in `comparison.json`.

Both versions passed the repeated timetable test. Therefore this experiment
establishes a defect in the previous browser dependency; it does not establish
that every historical website failure had that cause. The original failures
remain in earlier evidence. No animation was removed to obtain these results.

## Release status

The unchanged `plan gate website 84` passed in 229 seconds: 174 unit tests,
362 Chromium/WebKit tests, nine Lighthouse audits, and all original build, type,
budget, claim, number, privacy, ID, external/base-path link and CV checks. A separate
browser preflight passed 362 tests. All 96 fresh demo views passed overflow and
page-error checks; phone feed and desktop benchmark views were inspected.
`evidence.json` binds the 256 source/configuration/test files and retained logs.
Exact-revision remote CI remains a separate requirement. Independent review and publication acceptance
remain separate requirements. This document is not a release approval.
