// Diagnostic: long main-thread tasks on a page under 4x CPU throttling (Lighthouse's mobile profile).
//   node scripts/long-tasks.mjs <url> [runs]
import { chromium } from "@playwright/test";

const [url = "http://localhost:4321/", runs = "3"] = process.argv.slice(2);
const browser = await chromium.launch();
for (let r = 0; r < Number(runs); r++) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    (window).__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (window).__long.push(Math.round(e.duration)))).observe({ type: "longtask", buffered: true });
  });
  await page.goto(url);
  await page.waitForTimeout(4000);
  const long = await page.evaluate(() => (window).__long);
  const tbt = long.reduce((s, d) => s + Math.max(0, d - 50), 0);
  console.log(`run ${r + 1}: long tasks [${long.join(", ")}] ms, blocking ~${tbt} ms`);
  await ctx.close();
}
await browser.close();
