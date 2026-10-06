// Visual check of the harbour water ripples: node scripts/try-ripples.mjs <base-url> <out.png>
import { chromium } from "@playwright/test";
const [base = "http://localhost:4321", out = "ripples.png"] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => localStorage.setItem("noboot", "1"));
await p.goto(base.replace(/\/$/, "") + "/");
await p.waitForTimeout(2500);
const box = await p.getByTestId("harbour").boundingBox();
for (let i = 0; i < 16; i++) { await p.mouse.move(box.x + box.width * (0.55 + i * 0.01), box.y + box.height * 0.86); await p.waitForTimeout(40); }
await p.waitForTimeout(300);
console.log("ripples alive:", await p.getByTestId("harbour").getAttribute("data-ripples"));
await p.screenshot({ path: out, clip: { x: 0, y: box.y + box.height * 0.62, width: 1440, height: box.height * 0.38 } });
await b.close();
