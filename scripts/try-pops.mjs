// Visual check of the pop-ups: node scripts/try-pops.mjs <base-url> <out-dir>
import { chromium } from "@playwright/test";
const [base = "http://localhost:4321", out = "."] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.addInitScript(() => localStorage.setItem("noboot", "1"));
await p.goto(base.replace(/\/$/, "") + "/about/");
await p.waitForTimeout(1500);
for (const [name, text] of [["piano", "piano"], ["card", "Pokémon TCG"], ["pixel", "gaming"]]) {
  const hob = p.locator(".hob", { hasText: text }).first();
  await hob.scrollIntoViewIfNeeded(); await hob.hover(); await p.waitForTimeout(700);
  const box = await hob.boundingBox();
  await p.screenshot({ path: `${out}/pop-${name}.png`, clip: { x: Math.max(0, box.x - 200), y: Math.max(0, box.y - 260), width: 520, height: 300 } });
}
await p.goto(base.replace(/\/$/, "") + "/projects/ai-quant-research-system/");
await p.waitForTimeout(1500);
const term = p.locator("main .def").first();
await term.scrollIntoViewIfNeeded(); await term.hover(); await p.waitForTimeout(600);
const tb = await term.boundingBox();
await p.screenshot({ path: `${out}/pop-term.png`, clip: { x: Math.max(0, tb.x - 220), y: Math.max(0, tb.y - 170), width: 600, height: 220 } });
await b.close();
