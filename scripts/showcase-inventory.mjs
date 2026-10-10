// Showcase inventory (W05, 2026-10-10): every route and every Lab experiment at desktop and phone width.
// Records what a reviewer needs to prioritise seams: console errors, horizontal overflow, meaningful text
// under 14px, clipped labels, visible keyboard focus, and for each experiment whether it has a reset and a
// result readout. Screenshots go to docs/showcase/shots/<tag>-<route>-<width>.png; findings to JSON.
// Usage: BASE=http://localhost:4340 TAG=before node scripts/showcase-inventory.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:4340", TAG = process.env.TAG ?? "before";
const OUT = "docs/showcase/shots";
mkdirSync(OUT, { recursive: true });
const sitemap = readFileSync("dist/sitemap-0.xml", "utf8");
const routes = [...sitemap.matchAll(/<loc>[^<]*?\.io(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
const lab = readFileSync("src/data/lab.ts", "utf8");
const inline = [...lab.matchAll(/\{ id: "([a-z-]+)",[^}]*?kind: "inline"/g)].map((m) => m[1]);
const VIEWS = [["desktop", 1280, 860], ["phone", 375, 812]];
const slug = (r) => (r === "/" ? "home" : r.replace(/^\/|\/$/g, "").replace(/[/#]/g, "_"));

// Visible text under 14px, clipped text boxes, and whether Tab shows a focus ring: measured in the page.
const measure = () => {
  const small = [], clipped = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || el.closest("svg, canvas, [aria-hidden=true], .ticker, script, style")) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);
    if (!own) continue;
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
    if (fs < 14 && cs.visibility !== "hidden" && cs.opacity !== "0") small.push(`${fs}px ${el.tagName.toLowerCase()}.${[...el.classList].join(".")}: ${el.textContent.trim().slice(0, 40)}`);
    if ((cs.overflow.includes("hidden") || cs.textOverflow === "ellipsis") && (el.scrollWidth > el.clientWidth + 2)) clipped.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")}: ${el.textContent.trim().slice(0, 40)}`);
  }
  return { overflow: document.documentElement.scrollWidth - innerWidth, small: [...new Set(small)], clipped: [...new Set(clipped)] };
};

const browser = await chromium.launch();
const report = { base: BASE, tag: TAG, when: new Date().toISOString(), routes: {}, experiments: {} };
for (const [view, w, h] of VIEWS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: view === "phone", hasTouch: view === "phone", reducedMotion: "reduce" });
  for (const route of [...routes, ...inline.map((id) => `/demos/#${id}`)]) {
    const page = await ctx.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
    page.on("console", (m) => { if (m.type() === "error" && !/youtube|favicon|net::ERR/.test(m.text())) errors.push(m.text().slice(0, 160)); });
    await page.goto(BASE + route, { waitUntil: "load" }).catch((e) => errors.push("goto: " + e.message));
    await page.waitForTimeout(1200);
    const id = route.startsWith("/demos/#") ? route.slice(8) : null;
    if (id) await page.locator(`[data-panel="${id}"]`).scrollIntoViewIfNeeded().catch(() => {});
    const m = await page.evaluate(measure);
    // keyboard: does the third Tab stop show a visible focus indicator?
    await page.keyboard.press("Tab"); await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
    m.focusVisible = await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; const cs = getComputedStyle(a); return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== "none"; });
    const shot = `${OUT}/${TAG}-${slug(route)}-${view}.png`;
    if (id) await page.locator(`[data-panel="${id}"]`).screenshot({ path: shot }).catch(() => page.screenshot({ path: shot }));
    else await page.screenshot({ path: shot });
    const rec = { ...m, errors, shot };
    if (id) {
      const p = page.locator(`[data-panel="${id}"]`);
      rec.controls = await p.locator("button:visible, input:visible, select:visible").count();
      rec.reset = await p.locator("button").filter({ hasText: /reset|start over|replay|new random|clear/i }).count() > 0;
      rec.readout = await p.locator(".ro, [aria-live], output").count() > 0;
      (report.experiments[id] ??= {})[view] = rec;
    } else (report.routes[route] ??= {})[view] = rec;
    await page.close();
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`docs/showcase/inventory-${TAG}.json`, JSON.stringify(report, null, 1));
const all = [...Object.entries(report.routes), ...Object.entries(report.experiments)];
console.log(`${TAG}: ${Object.keys(report.routes).length} routes, ${Object.keys(report.experiments).length} experiments, ${all.length * 2} views`);
for (const [k, v] of all) for (const [view, r] of Object.entries(v)) {
  const flags = [r.errors.length && `errors:${r.errors.length}`, r.overflow > 0 && `overflow:${r.overflow}px`, r.small.length && `small:${r.small.length}`, r.clipped.length && `clipped:${r.clipped.length}`, r.focusVisible === false && "no-focus-ring", r.reset === false && "no-reset", r.readout === false && "no-readout"].filter(Boolean);
  if (flags.length) console.log(`${k} [${view}] ${flags.join(" ")}`);
}
