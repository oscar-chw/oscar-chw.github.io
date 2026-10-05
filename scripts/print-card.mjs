// Renders /card/ to PDF (A4) and fails unless it is exactly one page.
//   node scripts/print-card.mjs <base-url> <out.pdf>
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const [base = "http://localhost:4321", out = "card.pdf"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(base.replace(/\/$/, "") + "/card/");
await page.pdf({ path: out, format: "A4", printBackground: true });
await browser.close();
const pages = (readFileSync(out, "latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
console.log(`print-card: ${pages} page(s) -> ${out}`);
process.exit(pages === 1 ? 0 : 1);
