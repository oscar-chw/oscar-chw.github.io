// Smoke test of a deployed site in Chromium and WebKit, with real network (live Binance).
//   node scripts/smoke.mjs https://oscar-chw.github.io/next [--require-live]
// Fails on any console error or page error, on a harbour that never leaves "connecting…",
// or on a demo whose interactive element never appears.
import { chromium, webkit } from "@playwright/test";

const base = (process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "https://oscar-chw.github.io").replace(/\/$/, "");
const requireLive = process.argv.includes("--require-live");   // a "snapshot" badge then fails: proves the live stream works
const pages = [
  ["/", "[data-testid=book-badge]"],
  ["/projects/", "main a"],
  ["/projects/qts-research-platform/", ".figs dt"],
  ["/demos/fourier/", "[data-testid=fourier-error][data-value]:not([data-value=''])"],
  ["/demos/order-book/", "[data-testid=replay-step]"],
  ["/demos/reconciliation/", "[data-testid=series-streaming]"],
  ["/demos/harbour/", "[data-testid=book-badge]"],
  ["/about/", "main img"],
  ["/cv/", "a[download]"],
  ["/card/", "img[alt^='QR code']"],
];
let bad = 0;
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  for (const [path, sel] of pages) {
    const page = await browser.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(base + path);
    let note = "";
    try {
      await page.locator(sel).first().waitFor({ state: "attached", timeout: 15000 });
      if (sel.includes("book-badge")) {
        await page.waitForFunction(() => !/connecting/.test(document.querySelector("[data-testid=book-badge]")?.textContent ?? ""), null, { timeout: 15000 });
        note = (await page.locator("[data-testid=book-badge]").textContent()) ?? "";
        if (requireLive && !/live/.test(note)) errors.push(`badge says "${note}", not live`);
      }
    } catch { errors.push(`never saw ${sel}`); }
    const ok = res?.ok() && errors.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${engine.name().padEnd(8)} ${res?.status()} ${path} ${note} ${errors.join(" | ")}`);
    await page.close();
  }
  await browser.close();
}
if (bad) { console.error(`smoke: ${bad} failure(s)`); process.exit(1); }
console.log("smoke: OK");
