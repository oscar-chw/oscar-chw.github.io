// Design review: full-page screenshots of the key pages in both themes and at phone width.
//   node scripts/screenshots.mjs <base-url> <out-dir>
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [base = "http://localhost:4321", out = "screenshots"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const shots = [
  ["/", "home", 1440, 900, "dark"],
  ["/", "home-light", 1440, 900, "light"],
  ["/", "home-phone", 390, 844, "dark"],
  ["/projects/", "work", 1280, 900, "dark"],
  ["/projects/point-in-time-research/", "project", 1280, 900, "dark"],
  ["/projects/qts-research-platform/", "project-phone", 390, 844, "light"],
  ["/about/", "about", 1280, 900, "light"],
  ["/demos/fourier/", "fourier", 1280, 900, "dark"],
  ["/demos/order-book/", "order-book", 1280, 900, "dark"],
  ["/demos/reconciliation/", "reconciliation", 1280, 900, "dark"],
  ["/card/", "card", 1280, 700, "dark"],
];
const browser = await chromium.launch();
for (const [path, name, width, height, theme] of shots) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
  await page.goto(base.replace(/\/$/, "") + path);
  await page.waitForTimeout(name === "fourier" ? 5000 : 2500);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: name !== "fourier" });
  await page.close();
}
await browser.close();
console.log(`screenshots: ${shots.length} written to ${out}`);
