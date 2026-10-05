// Screenshot one page at a viewport, optionally after scrolling: node scripts/shot-one.mjs <url> <out.png> [w] [h] [scrollY] [full] [waitMs] [hoverX,hoverY]
import { chromium } from "@playwright/test";
const [u, out, w = "1440", h = "900", sy = "0", full = "", wait = "2600", hover = ""] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(u); await p.waitForTimeout(+wait);
if (+sy) { await p.mouse.wheel(0, +sy); await p.waitForTimeout(1200); }
const [hx, hy] = hover ? hover.split(",").map(Number) : [+w * 0.62, +h * 0.3];
for (let k = 1; k <= 5; k++) { await p.mouse.move(hx - 10 + k * 2, hy); await p.waitForTimeout(60); }
await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: !!full });
await b.close();
