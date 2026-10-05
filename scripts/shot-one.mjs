// Screenshot one page at a viewport, optionally after scrolling: node scripts/shot-one.mjs <url> <out.png> [w] [h] [scrollY] [full]
import { chromium } from "@playwright/test";
const [u, out, w = "1440", h = "900", sy = "0", full = ""] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(u); await p.waitForTimeout(2600);
if (+sy) { await p.mouse.wheel(0, +sy); await p.waitForTimeout(1200); }
await p.mouse.move(+w * 0.62, +h * 0.3); await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: !!full });
await b.close();
