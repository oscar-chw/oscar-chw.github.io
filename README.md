# oscar-chw.github.io

Source of [oscar-chw.github.io](https://oscar-chw.github.io), Oscar Choi's personal site: an interactive harbour drawn from a simulated market, six project pages, and the Lab, a workspace of in-browser experiments.

## Stack

- [Astro](https://astro.build) with TypeScript. Projects are MDX content collections; the grouped pages import their parts from `src/content/projects/_*.mdx`. Text pages ship one small shared motion module and allowlisted inline scripts only.
- Interactive parts load only where they are used: the harbour (home page and `/demos/harbour/`), the Lab (`/demos/`, one lazily loaded module per experiment) and the full demos.
- Static output, deployed to GitHub Pages by `.github/workflows/deploy.yml` once CI has passed on `main`. No server and no tracking.

## The harbour

`src/components/harbour/` paints a city from a simulated market: a seeded stream of limit orders, cancels and market orders runs through a price-time-priority matching engine (`src/lib/replay.ts`, `src/lib/market.ts`), and the skyline is that market's past (36,000 order events, one building per 30 sessions). The water is a live order book: ETH/USDT from Binance's public market-data stream (`data-stream.binance.vision`, no key), straight from the browser. If the stream fails it takes one REST snapshot, and failing that the simulated market keeps trading and its own book becomes the water. The beams draw the QTS data platform's race test.

Redraws are capped at 10 fps (1 fps under reduced motion), the stream closes while the tab is hidden, and Pause stops everything that moves. `/demos/harbour/` adds a market picker for the skyline (regime-switching, calm, trending, mean-reverting, volatile, crash, and a seed) and for the water (ETH, BTC or SOL live, or simulated).

## The Lab

`/demos/` holds one or more experiments per project, plus maths and site experiments. Every experiment states where its data comes from. Two run real code: the command guard is the unmodified `guard.py` from [agent-harness](https://github.com/oscar-chw/agent-harness), executed by Pyodide (CPython in WebAssembly) on first use; the top-bar console sends shell-like commands to the same guard.

## Checks

| command | what it guards |
|---|---|
| `npx astro check` | types |
| `npm run test:unit` | matching engine and simulated market, the real guard under Pyodide (sha256-pinned), Lab maths (Black–Scholes, SSVI, BM25, races), Fourier, prose numbers |
| `npx playwright test` | every page and experiment in Chromium and WebKit, at phone to desktop sizes (`BASE_URL=https://oscar-chw.github.io` runs it against the live site) |
| `node scripts/js-budget.mjs` | JavaScript budget per page; text pages inline-only |
| `node scripts/dup-ids.mjs` | no page repeats an element id |
| `node scripts/link-check.mjs dist --external` | every internal and external link resolves |
| `npx lhci autorun` | Lighthouse ≥ 0.95 in every category (mobile profile) on `/`, the lead project page and the Lab |
| `node scripts/scan-content.mjs` | nothing from the never-publish list reaches the site |
| `node scripts/check-numbers.mjs` | every figure on the site traces to approved wording (runs locally; the source file is private) |
| `bash scripts/launch-check.sh` | the deployed site is this build, passes Lighthouse, links and smoke tests live |

## Develop

```bash
npm ci
npm run dev
```

Implemented with AI coding agents under Oscar's design and review.
