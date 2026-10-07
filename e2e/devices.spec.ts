import { test, expect } from "@playwright/test";
import { offsite } from "./site";

// Every page at phone, tablet and desktop sizes: nothing makes the page scroll sideways and no script
// throws. Named failures this caught on 2026-10-06: closed pop-ups that still took up layout space near
// the right edge, a Lab grid column that could not shrink below a long command, and a teaser row
// wider than a 320px phone.
const PAGES = ["/", "/projects/", "/projects/ai-quant-research-system/", "/projects/competitions/", "/projects/supporting-work/",
  "/projects/qts-research-platform/", "/projects/fatqat-gpu-backend/", "/projects/final-year-project/",
  "/demos/", "/demos/harbour/", "/demos/order-book/", "/demos/fourier/", "/demos/crypto-desk/", "/about/", "/cv/", "/card/"];
const SIZES = [
  { name: "small phone", width: 320, height: 640, touch: true },
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "large phone", width: 430, height: 932, touch: true },
  { name: "phone landscape", width: 812, height: 375, touch: true },
  { name: "tablet", width: 768, height: 1024, touch: true },
  { name: "laptop", width: 1024, height: 768, touch: false },
  { name: "wide desktop", width: 2560, height: 1440, touch: false },
];

for (const s of SIZES) {
  test.describe(`${s.name} ${s.width}×${s.height}`, () => {
    test.use({ viewport: { width: s.width, height: s.height }, hasTouch: s.touch });
    test("no page scrolls sideways or throws", async ({ page }) => {
      test.setTimeout(90_000);
      await page.route(offsite, (r) => r.abort());
      await page.routeWebSocket(/binance/, (ws) => ws.close());   // the live order book is tested on its own
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
      const wide: string[] = [];
      for (const p of PAGES) {
        await page.goto(p);
        await page.waitForTimeout(300);
        const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        if (sw > cw + 1) wide.push(`${p} is ${sw}px wide in a ${cw}px window`);
      }
      expect(wide).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("a tapped definition opens as a sheet inside the screen", async ({ page }) => {
    await page.goto("/projects/ai-quant-research-system/");
    const term = page.locator(".def").first();
    await term.scrollIntoViewIfNeeded();
    await term.tap();
    const pop = term.locator(".pop");
    await expect(pop).toBeVisible();
    const box = (await pop.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });
});
