# oscar-chw.github.io

Source of [oscar-chw.github.io](https://oscar-chw.github.io), Oscar Choi's personal site: an interactive harbour drawn from market data, a page per project, and four in-browser demos.

## Stack

- [Astro](https://astro.build) with TypeScript. Projects are MDX content collections. Text pages ship no JavaScript beyond a sub-1 KB theme script.
- Interactive parts load only where they are used: the harbour (home page and `/demos/harbour/`), plus the Fourier, order-book and reconciliation demos.
- Static output, deployed to GitHub Pages by `.github/workflows/deploy.yml`. No server and no tracking.

## The harbour

`src/components/harbour/` paints BTC/USDT daily closes (Binance, from 2020) as a skyline. It draws the QTS data platform's race test as beams, and puts the live Binance BTCUSDT order book on the water:

- the browser connects to `wss://stream.binance.com:9443/ws/btcusdt@depth20@100ms`;
- if that fails, it uses one REST snapshot from `data-api.binance.vision`;
- if that also fails, it uses a snapshot bundled in `src/data/book-snapshot.json`.

Redraws are capped at 10 fps (1 fps under reduced motion), and the stream stops while the tab is hidden. A badge says whether the water is live or a snapshot.

## Checks

| command | what it guards |
|---|---|
| `npx astro check` | types |
| `npm run test:unit` | order-book parsing and fallback, frame cap, Fourier maths, matching engine |
| `npx playwright test` | hero, demos and pages in Chromium and WebKit |
| `node scripts/js-budget.mjs` | ≤ 50 KB gzipped JS on non-demo pages; text pages inline-only |
| `node scripts/link-check.mjs dist --external` | every internal and external link resolves |
| `npx lhci autorun` | Lighthouse ≥ 0.95 in every category (mobile profile) on `/` and a project page |
| `node scripts/scan-content.mjs` | nothing from the never-publish list reaches the site |
| `node scripts/check-numbers.mjs` | every figure in `src/content` traces to approved wording (runs locally; the source file is private) |

## Develop

```bash
npm ci
npm run dev
```

Implemented with AI coding agents under Oscar's design and review.
