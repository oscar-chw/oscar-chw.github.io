// Visual check of "use your own photo": node scripts/try-upload.mjs <base-url> <image> <out.png>
import { chromium } from "@playwright/test";
const [base, img, out] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(base.replace(/\/$/, "") + "/demos/fourier/");
await p.waitForTimeout(1500);
await p.getByTestId("fourier-upload").setInputFiles(img);
await p.waitForTimeout(15000);
await p.getByTestId("fourier-canvas").screenshot({ path: out });
await b.close();
