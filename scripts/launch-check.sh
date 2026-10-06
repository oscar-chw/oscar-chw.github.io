#!/usr/bin/env bash
# Launch gate: the new site is what the live URL serves, it meets the Lighthouse
# bar there (mobile profile), every link on it resolves, and it works live in
# Chromium and WebKit.
set -euo pipefail
cd "$(dirname "$0")/.."
URL="${1:-https://oscar-chw.github.io}"
curl -fsS "$URL/" | grep -q 'data-testid="harbour"' || { echo "launch-check: $URL/ is not the new site"; exit 1; }
curl -fsS -o /dev/null "$URL/cv/Oscar_Choi_CV.pdf"
node scripts/smoke.mjs "$URL" --require-live      # Chromium and WebKit, live simulated market, no console errors
LHCI_URL_BASE="$URL" npx lhci autorun
npm run build >/dev/null
node scripts/link-check.mjs dist --external
echo "launch-check: OK"
