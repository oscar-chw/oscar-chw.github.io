# Local Lab refinement — 16 October 2026

This candidate starts at `69cbe4906817f70a2ef2a26a7970ced30a89d18f`. That accepted
candidate remains frozen. These changes address reproduced interaction defects in
the Lab rail and option surface; they do not establish publication or independent
review acceptance.

## Changes a visitor can use

- Navigate the rail with arrows, Home and End, then press Enter without reopening
  an old selection. Folder buttons support Space/Enter, expose expanded state,
  and retain visible keyboard focus. Modified clicks keep normal browser new-tab
  behavior.
- The visible `~/lab` keyboard selector owns the labelled option groups through
  `aria-owns`. The native folder buttons are siblings outside that selection
  widget. Desktop controls have a 24px minimum height, increasing to 44px for a
  coarse pointer.
- Inspect a point on the actual computed option grid using two position sliders,
  keyboard keys, mouse hover or a touch tap. Changing model parameters preserves
  the selected grid location and updates its value. Theta and vega show their
  units. The underlying model and recorded performance claims are unchanged.
- Pause/resume rotation and restore the camera view separately from resetting the
  experiment. Enabling reduced motion stops an already running rotation.
- Scroll over the plot on a phone. Explicit Touch rotation switches the gesture
  to rotating the surface. Cancelled gestures stop dragging, and resetting the
  experiment disposes its old observers, listeners and animation.
- Read bounded axis labels on narrow screens and on the light theme.

## Evidence and controls

The baseline failed all fourteen initial new browser cases. A later regression
also demonstrated intercepted modifier-clicks in both engines. An ordinary
same-origin link was a positive control: it opened a separate tab in each engine.

The numeric probe is checked against an independent Python `math.erf` reference:
for S=150, T=2, r=0.03 and sigma=0.25, a call has value 57.65 at K=100 and 30.14
at K=140. The browser test changes the strike and checks the selected point.

Three deliberate source defects were rejected by the added checks: reading the
wrong grid point, losing pointer-cancel cleanup, and omitting disposal on reset.
Each mutation was restored before the passing run. No original assertions,
timeouts, browser matrix, retries or thresholds were changed.

A native Chromium touch diagnostic compared the old capture behavior with the
repair. A vertical gesture moved the document by 125 CSS pixels with rotation
off, while leaving the canvas unchanged. With Touch rotation on, the same gesture
rotated the surface and did not scroll the document. Physical phones and screen
reader sessions remain NOT_RUN.

The first integrated gate stopped because the isolated worktree lacked the
approved content ledger at the default sibling path. Its existing `CONTENT_MD`
setting points to the canonical ledger for the rerun. The ledger and gate were
not edited.

That run then passed 174 unit tests and 382 browser tests, but Lighthouse rejected
the new rail at accessibility 0.92: buttons were invalid children of its listbox,
and touch targets were undersized. A per-folder listbox draft was also rejected
by four unchanged keyboard checks. The final structure retains one visible
keyboard selector and valid disclosure controls. The 14 focused navigation cases
pass in both engines, and the diagnostic Lighthouse accessibility score is 1.00
with no failed audits. These intermediate failures remain in `checks/`.

The content scan also caught named project IDs concatenated in the new ownership
attribute. Neutral `lab-files-N` structural IDs preserve the relationships and
accessible group names without joining project titles in metadata. The scanner
was not changed. A byte comparison against the parent confirms all 53 original
test, check, workflow and dependency files are unchanged.

The final `plan gate website 88` passed in 246 seconds: 174 unit tests, 382
Chromium/WebKit tests, nine Lighthouse runs, type/build checks, script budgets,
claim/content scans, duplicate IDs, root and `/next/` links, and the public CV.
Lighthouse performance is 0.99–1.00, accessibility 0.98–1.00, and both best
practices and SEO are 1.00 across the nine runs. `checks/lighthouse.json` selects
the current run's manifest, separately from the retained earlier failed reports.

`node docs/refinement-20261016/capture.mjs` passed: all 24 registered demos in
Chromium and WebKit at 375 and 1280 pixels, plus six focused phone/light-theme/
short-viewport states. None of the 102 views has document overflow or a page
exception. The six focused views were visually inspected, including the bounded
axis labels and final selected rail entry.

`evidence.json` binds the passing gate log, 261 source and check files and the
102 images by SHA256. All eight source/test hashes match the coordinating chat's
separate 20-case local interaction check. This corroborates the local changes;
it does not clear the independent release review. Source models and the public
CV are preserved.

Raw log bytes are retained in `checks/raw-logs.zip`. The readable `.log` copies
remove terminal color escapes and trailing whitespace only; `evidence.json`
records both hashes so the original output remains recoverable and checkable.

## Acceptance boundary

This is an isolated local candidate. Remote CI for the frozen parent does not
certify these new changes. The independent release review, refused local gate85,
merge and deployment remain held. The private compiler remains explicitly
unavailable for public integration. Passing automated checks does not establish
all-device support or absence of every defect.
