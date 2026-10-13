# Final recruiter-journey review — 14 October 2026

Scope: homepage → project evidence → working demo → public CV, plus consistency with the current public GitHub description. The verified live W05 release is `9f4ecee`; this review creates a small local candidate, not another release.

existing: reused Astro, the current Playwright setup, existing page/navigation/music checks, approved claim/privacy/budget/link checks, prior W05 rendered evidence, and the production-code/standards/write-tests-first workflow. No new framework, dependency or visual rebrand.

## Finding and focused correction

At 320 px, the live primary navigation wraps into four icon-only rows. At 375 px, CV drops onto a separate row. At 641 px, the desktop links split across rows. A recruiter can still navigate, but important destinations are needlessly hard to identify and the header consumes the phone's first screen.

The candidate keeps the glass bar and desktop design. Through 760 px, brand/utilities occupy the first row and the four labelled destinations share the second row. Music controls remain attached to their trigger with a hover bridge; a short landscape screen can scroll the panel to reach volume controls.

Independent review identified the short-screen music issue. Main-loop reproduction measured its bottom outside the viewport and reproduced the panel closing during pointer travel. Both are now explicit regressions, not a speculative redesign.

## Evidence retained

- `navigation-before.json`: live `9f4ecee` geometry at 320, 375, 640, 641, 768 and 1280 px. No horizontal overflow, but destination wrapping at the named widths.
- The first local baseline/candidate invocations hit an expired preview server (`ERR_CONNECTION_REFUSED`); these are infrastructure failures, not proof of a layout regression. The isolated preview was restarted on 4340 without touching 4332.
- Unchanged live baseline: the new 320 px readable-navigation assertion fails (label width 1 px), while the 1280 px control passes.
- A boundary control also caught wrapping at 701 px when the first candidate stopped at 700 px; 761 px passed. The final threshold covers that gap, with tests on both sides and at 768 px.
- The new landscape test first fails when the pointer crosses from the music button toward the panel. A source mutation removing the height limit separately tests the viewport-bound assertion.
- `render-after.json`: 24 home/Lab/CV views across Chromium/WebKit and 320/375/641/1280 px. No page errors or horizontal overflow. Before/after screenshots show the actual header change.
- Focused checks cover destination labels and bounds, short-screen music controls, and clicking home → Work → FatQat → live arithmetic → reset → CV download.
- Existing page checks cover navigation, search/console, theme, music and contact-card behavior. Existing claim/privacy/budget/link gates remain intact. Unchanged numerical demo logic and the entire previously passed suite are not rerun merely for activity.
- Final focused suite: 26 Chromium/WebKit checks pass. Existing page suite: 42 checks pass; the four existing music checks are repeated after the music correction. The viewport-limit source mutation fails its bound assertion; exact source bytes and the serving build were restored. Independent source review found no remaining concrete defect in this bounded diff.

Exact final command results and candidate commit are recorded in the parent website plan's node 44 and the shared website owner record.

## Content and project coverage

The current phone-free CV is the previously approved file. This candidate changes navigation presentation only; claims, project evidence and PDF bytes are unchanged.

| Public case study | Meaningful live example |
|---|---|
| [AI quant research system](https://oscar-chw.github.io/projects/ai-quant-research-system/#engineering) | [Gated build](https://oscar-chw.github.io/demos/#gatedbuild), with separate guard/retrieval/research experiments |
| [FatQat](https://oscar-chw.github.io/projects/fatqat-gpu-backend/#engineering) | [Compensated products](https://oscar-chw.github.io/demos/#compensated) and qubit sandbox |
| [QTS research platform](https://oscar-chw.github.io/projects/qts-research-platform/#engineering) | [Point-in-time reads](https://oscar-chw.github.io/demos/#point-in-time) and lost updates |
| [Joint final-year research](https://oscar-chw.github.io/projects/final-year-project/) | [Synthetic decision-gate illustration](https://oscar-chw.github.io/demos/#gate) |
| [Competitions](https://oscar-chw.github.io/projects/competitions/) | [Kalman drift gate](https://oscar-chw.github.io/demos/#imc) and legal-move masking |
| [Supporting work](https://oscar-chw.github.io/projects/supporting-work/) | [Multiple-testing trap](https://oscar-chw.github.io/demos/#multitest) |
| [Coursework](https://oscar-chw.github.io/projects/coursework/) | [DNA channel](https://oscar-chw.github.io/demos/#dna) and timetable clashes; the private compiler remains a text-only description under course rules |

The unfinished QFRMLab/quant-desk work is not presented as a completed public product.

## Cross-owner follow-up

The public GitHub profile was read at `7a12e539fa56de3ad10ffbf2524e5f0e7c2133fe`. It still uses the older end-to-end replay wording and less-qualified QTS/FatQat summaries. The GitHub owner's existing local `8195faf` correction is a separate held candidate. This review does not modify or publish sibling repositories; the coordinator owns that consistency follow-up.

No website release blocker was found in the tested recruiter journey. The navigation polish remains a candidate for the consolidated package review. Physical devices and a screen-reader session remain NOT_RUN; no every-device guarantee is made.
