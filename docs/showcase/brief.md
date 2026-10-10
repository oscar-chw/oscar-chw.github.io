# Showcase design and interaction brief (W05, 2026-10-10)

existing: qfrmlab `docs/research/design-toolkit.md` (hierarchy, density, 14/16 px floors, quiet opaque reading surfaces, glass only
for navigation, WCAG 2.2 AA, 320 px reflow, reduced motion, non-colour status); this repo's `scripts/` (smoke, screenshots,
demo audit, check-numbers, scan-content) and `e2e/`; the `artifact-design` and `built-in-browser` skills. No new dependency:
Astro, plain CSS tokens and the existing Lab modules cover it.

## Keep

The current dark style, the glass nav pill, the harbour, the Lab shell and the evidence rules (CONTENT.md and `sources/`,
check-numbers, scan-content). No rebrand, no migration.

## One object, two densities

The site already has one coherent object: the glass pill that frames navigation, and the Lab stage. The experiment becomes the
shared object across surfaces: the same experiment module mounts in the Lab *and* on its project page, in the same frame.
Reading surfaces (case studies, write-ups) stay quiet and opaque; glass is kept for navigation and the stage frame only.

## Engineering case study (flagship project pages)

Shown in place of the decorative project graphic, in this order, each line sourced:

1. **Problem** (one sentence) and **constraints** (two or three short items).
2. **Try it**: the project's own experiment, live, with a label saying what is computed live, replayed or simulated.
3. **Result**: what the visitor just saw, in one line, tied to the measured result in the repository.
4. **Tradeoff**: what was chosen, over what, why, and what it costs.
5. **My contribution** and **evidence** links (repository, merged PR, results file).

Progressive disclosure: the first four are always visible; architecture, validation, failures and limits remain in the write-up below.

## Interaction language (every experiment)

- **Input** (left or top): labelled controls at 14 px or more, presets for the normal case and the boundary or failure case.
- **Output** (the stage): the system's state, drawn from the computation.
- **Result** (one line, `aria-live`): what changed, in words, with units.
- **Why it matters** (one line): the link to the real project.
- **Reset**: every experiment, same place, same icon; replays from its initial state.
- **Labels**: LIVE (computed in your browser now), REPLAY (measured run, replayed), SIMULATED (synthetic process). Never present a
  replay as live computation.
- Motion only to show a state change; none under `prefers-reduced-motion`.

## Flagships (from approved content; QFRMLab stays off: not public)

| Flagship | Experiment | Tradeoff it makes visible | Evidence |
|---|---|---|---|
| GPU Backend for FatQat | new: compensated vs plain complex-product arithmetic, computed live against an exact rational reference | ~1.5× GPU speed for "within 2 ulp under cancellation"; plain is opt-in because on 110 real circuits the difference averages +0.03 ± 0.03 eps | README b92e98e, merged upstream #52 |
| QTS research data platform | point-in-time reads, lost updates (existing) | versioned, as-of reads and compare-and-swap commits over simpler mutable writes | showcase repo, CONTENT.md |
| AI quant research system | the command guard (real code, Pyodide) and the gated build (existing) | a task is done only when its gate passes, at the cost of writing the gate first | agentic-quant-research, agent-harness |

## Acceptance

Existing CI-equal gate unchanged (Lighthouse ≥ 0.95 on home and a project page, links, Chrome and Safari e2e). New e2e checks:
the FatQat experiment computes a correct exact value, the compensated result stays within 2 ulp on the cancellation preset while
plain loses digits, reset restores the initial state, and every experiment exposes a reset. Inventory rerun at both widths
with no meaningful text under 14 px in the Lab and the case studies, and a visible focus ring on every Tab stop checked.
