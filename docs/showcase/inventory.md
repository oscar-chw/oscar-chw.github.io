# Showcase inventory (W05, 2026-10-10)

Revision: `e0221e5` (main, live as build e0221e5d45f1). Method: `scripts/showcase-inventory.mjs` against `astro preview`, Chromium,
reduced motion on, 1280×860 and 375×812 (touch). Raw results: `inventory-before.json`; screenshots: `shots/before-*.png` (68).
WebKit was not part of this inventory run (NOT_RUN here; WebKit runs in the e2e suite).

## Site-wide findings

| Finding | Where | Severity | Verdict |
|---|---|---|---|
| No console errors, no horizontal overflow | all 17 routes and 17 inline experiments, both widths | — | sound |
| Meaningful text under 14 px | Lab file list and descriptions (12.5 px), slider labels and readout keys (11.5 px), Lab buttons and chips (12.8–13.1 px), notes (12.8–13.8 px), project-page captions | high (every demo) | fix: a type floor of 14 px for controls, labels, readouts and notes |
| No visible keyboard focus on the nav's command input | every page, desktop (third Tab stop) | high (WCAG 2.4.7) | fix: focus ring on the nav pill |
| "Clipped" elements | `sr-only` label (intended); phone nav labels collapsed to icons (intended) | — | by design; icons keep accessible names |
| Flagship project pages open with prose, then a decorative graphic | FatQat, QTS, AI quant research system | high (the brief's core point) | fix: an engineering case study with the project's own experiment in place of the decoration |

## Experiments (Lab)

| Experiment | Reset or replay | Result readout | Notes |
|---|---|---|---|
| gatedbuild, search, lookahead, marketmaking, candles, imc | yes | yes | sound |
| guard, point-in-time, lostupdates, policy, gate, multitest, dna, timetable, options | **no** | yes | fix: a shared reset |
| factors | yes ("new random market") | **no** readout block | fix: a one-line result |
| qubits | yes | **no** readout block | generic sandbox; does not show FatQat's own engineering |

Every experiment's controls responded and changed its output (audited 2026-10-07; behaviour tests cover all of them).

## Journeys

1. **Recruiter, 60 seconds:** home → "See the work" → a project page. Today the page tells (summary, figures), then shows a decorative
   graphic; the first thing to *do* is several screens away in the Lab. Gap: no way to see the engineering in the first screen.
2. **Engineer, 5 minutes:** project page → "How it works" → Lab. The Lab experiments are real, but each is framed differently
   (some have reset, some a result, some neither), and the flagship's own tradeoff (FatQat's default arithmetic) is asserted in
   prose, not demonstrated.
3. **Keyboard / phone visitor:** focus disappears on the command input; Lab labels at 11.5 px are hard to read on a phone.

## Priorities

1. A shared engineering case-study block for flagships, with the project's own live experiment (FatQat first).
2. FatQat's flagship experiment: the compensated-versus-plain arithmetic, computed live against an exact reference.
3. One interaction frame for every Lab experiment: input, output, result, why it matters, reset.
4. The 14 px floor and the focus ring.
