import { test, expect, type Page } from "@playwright/test";

// Contract for the harbour hero (src/components/harbour):
//   [data-testid=harbour]     focusable wrapper; data-book-mid = current mid, data-frames = book redraws
//   [data-testid=book-badge]  "live" | "snapshot …"
//   [data-testid=harbour-tip] read-out shown on hover or keyboard focus
const WS = /stream\.binance\.com/;
const REST = /data-api\.binance\.vision/;

const depth = (mid: number) => ({
  lastUpdateId: 1,
  bids: Array.from({ length: 20 }, (_, i) => [(mid - 0.5 - i).toFixed(2), "1.000"]),
  asks: Array.from({ length: 20 }, (_, i) => [(mid + 0.5 + i).toFixed(2), "1.000"]),
});

async function blockNetwork(page: Page) {
  await page.routeWebSocket(WS, (ws) => ws.close());
  await page.route(REST, (r) => r.abort());
}

async function frames(page: Page) {
  return Number(await page.getByTestId("harbour").getAttribute("data-frames"));
}

test("falls back to the bundled snapshot when Binance is unreachable", async ({ page }) => {
  await blockNetwork(page);
  await page.goto("/");
  await expect(page.getByTestId("harbour").locator("canvas")).toBeVisible();
  await expect(page.getByTestId("book-badge")).toHaveText(/snapshot/i, { timeout: 8000 });
  await expect(page.getByTestId("book-badge")).toContainText("5 Oct");
});

test("uses the REST snapshot when the WebSocket fails", async ({ page }) => {
  await page.routeWebSocket(WS, (ws) => ws.close());
  await page.route(REST, (r) => r.fulfill({ json: depth(50000) }));
  await page.goto("/");
  await expect(page.getByTestId("book-badge")).toHaveText(/snapshot/i, { timeout: 8000 });
  await expect(page.getByTestId("harbour")).toHaveAttribute("data-book-mid", "50000.00");
});

test("live stream: badge says live, mid follows, redraws stay at or under 10 fps", async ({ page }) => {
  let mid = 60000;
  await page.routeWebSocket(WS, (ws) => {
    const t = setInterval(() => { try { ws.send(JSON.stringify(depth(mid++))); } catch { clearInterval(t); } }, 20);
  });
  await page.goto("/");
  await expect(page.getByTestId("book-badge")).toHaveText(/^\s*live/i, { timeout: 8000 });
  const f0 = await frames(page);
  await page.waitForTimeout(2000);
  const f1 = await frames(page);
  expect(f1 - f0).toBeGreaterThan(5);        // it does redraw
  expect(f1 - f0).toBeLessThanOrEqual(22);   // 10 fps over 2 s, with one frame of slack at each end
  expect(Number(await page.getByTestId("harbour").getAttribute("data-book-mid"))).toBeGreaterThan(60000);
});

test("pauses redraws while the tab is hidden", async ({ page }) => {
  await page.routeWebSocket(WS, (ws) => {
    let m = 60000;
    const t = setInterval(() => { try { ws.send(JSON.stringify(depth(m++))); } catch { clearInterval(t); } }, 20);
  });
  await page.goto("/");
  await expect(page.getByTestId("book-badge")).toHaveText(/live/i, { timeout: 8000 });
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(300);
  const f0 = await frames(page);
  await page.waitForTimeout(1500);
  expect(await frames(page)).toBe(f0);
});

test("reduced motion: book redraws at most once a second", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.routeWebSocket(WS, (ws) => {
    let m = 60000;
    const t = setInterval(() => { try { ws.send(JSON.stringify(depth(m++))); } catch { clearInterval(t); } }, 20);
  });
  await page.goto("/");
  await expect(page.getByTestId("book-badge")).toHaveText(/live/i, { timeout: 8000 });
  const f0 = await frames(page);
  await page.waitForTimeout(3000);
  expect((await frames(page)) - f0).toBeLessThanOrEqual(4);
  await ctx.close();
});

test("hovering the blueprint towers after t = now explains look-ahead bias", async ({ page }) => {
  await blockNetwork(page);
  await page.goto("/");
  const box = (await page.getByTestId("harbour").boundingBox())!;
  // Blueprint towers sit right of t = now (x = 1210 of 1584) and above the waterline (y = 286 of 396).
  await page.mouse.move(box.x + box.width * (1300 / 1584), box.y + box.height * (200 / 396));
  await expect(page.getByTestId("harbour-tip")).toBeVisible();
  await expect(page.getByTestId("harbour-tip")).toContainText(/look-ahead/i);
});

test("keyboard users can step through the read-outs", async ({ page }) => {
  await blockNetwork(page);
  await page.goto("/");
  await page.getByTestId("harbour").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("harbour-tip")).toBeVisible();
  const first = await page.getByTestId("harbour-tip").textContent();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("harbour-tip")).not.toHaveText(first ?? "");
});
