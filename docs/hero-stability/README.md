# Hero animation stability — 14 October 2026

The first live mobile Lighthouse run on `7218b819d329` scored 92 with CLS
0.15225; later runs scored 100. The unchanged Lighthouse configuration passed
using its existing optimistic aggregation. The low run was retained and
investigated rather than discarded.

Proportional-font scramble letters could wrap onto another line and push the
actions down. The typewriter also reserved less than two lines of its inherited
line height. The hero now reserves the final name's geometry and two full typed
lines on narrow screens (one on desktop).

The random letters are decorative (`aria-hidden`), clipped inside the final
name's viewport. Cropping transient noise is intentional; the final name stays
fully visible and its accessible label remains static. This preserves the
existing typography without reserving a large permanent block for random Ws.

## Evidence

- New regression, before the fix: 8 failures, 2 positive controls. Valid scramble
  and typewriter states caused approximately 63–111 px of action movement.
- `plan gate website 57 --owner website-hero-stability`: exit 0, 30 seconds,
  including Astro check/build, unchanged JS budget, and 66 Chromium/WebKit tests.
  The new test covers 320, 375, 390, 768 and 1280 px, checking action drift and
  overflow during every sampled state.
- `LHCI_URL_BASE=http://localhost:4340 npx lhci autorun`: exit 0, nine local
  mobile-profile audits. Home performance 99/99/99, CLS 0.0000498 each; project
  performance 100/100/100; Lab 99/99/99. Accessibility 97–100. These are local
  measurements, not a claim about the next public deployment.
- Eight saved renders were inspected: Chromium and WebKit at 375 and 1280 px,
  with both settled and wide-glyph states. The final name is readable; actions
  remain in place. `render-results.json` records zero action drift in each pair.
- Independent source review found that overflow was originally checked only
  after restoring the text. The test now collects it inside the loop. The
  strengthened test and all node-57 checks passed again. The review also noted
  transient glyph cropping, accepted as the explicit decorative choice above.

No browser behaviour, claims, CV content, test timeout, existing assertion or
release workflow was relaxed. Physical devices and screen readers were not
tested in this focused pass. The live release gate is plan node 58.
