import { test, expect, type Page } from "@playwright/test";
import { offsite } from "./site";

// Contract for the harbour hero (src/components/harbour):
//   [data-testid=harbour]     focusable wrapper; data-book-mid = current mid, data-frames = book redraws
//   [data-testid=book-badge]  "live · seed N" | "paused"
//   [data-testid=harbour-tip] read-out shown on hover or keyboard focus
// The market is simulated in the page, so every test runs with all other origins blocked.
async function blockNetwork(page: Page) {
  await page.route(offsite, (r) => r.abort());
}
test.beforeEach(async ({ page }) => { await blockNetwork(page); });

// the city is built (market simulated, skyline painted) and the read-outs answer
const ready = (page: Page) => expect(page.getByTestId("harbour")).toHaveAttribute("data-ready", "1", { timeout: 8000 });

async function frames(page: Page) {
  return Number(await page.getByTestId("harbour").getAttribute("data-frames"));
}

test("the simulated market trades with no network: badge live, mid moves, redraws stay at or under 10 fps", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("book-badge")).toHaveText("live · seed 42", { timeout: 8000 });
  const mid0 = await page.getByTestId("harbour").getAttribute("data-book-mid");
  const f0 = await frames(page);
  await page.waitForTimeout(2000);
  const f1 = await frames(page);
  expect(f1 - f0).toBeGreaterThan(5);        // it does redraw
  expect(f1 - f0).toBeLessThanOrEqual(22);   // 10 fps over 2 s, with one frame of slack at each end
  expect(await page.getByTestId("harbour").getAttribute("data-book-mid")).not.toBe(mid0);
  await expect(page.locator("[data-ticker-mid]").first()).toHaveText(/^\d+\.\d\d$/);
});

test("pauses redraws while the tab is hidden", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("book-badge")).toHaveText(/live/i, { timeout: 8000 });
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(300);
  const f0 = await frames(page), mid = await page.getByTestId("harbour").getAttribute("data-book-mid");
  await page.waitForTimeout(1500);
  expect(await frames(page)).toBe(f0);
  expect(await page.getByTestId("harbour").getAttribute("data-book-mid")).toBe(mid);
  await expect(page.getByTestId("book-badge")).toHaveText(/paused/i);
});

test("the market can be paused and resumed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("book-badge")).toHaveText(/live/i, { timeout: 8000 });
  await page.getByTestId("book-pause").click();
  await expect(page.getByTestId("book-badge")).toHaveText(/paused/i);
  await expect(page.getByTestId("book-pause")).toHaveAttribute("aria-pressed", "true");
  const f0 = await frames(page);
  await page.waitForTimeout(1200);
  expect(await frames(page)).toBe(f0);
  await page.getByTestId("book-pause").click();
  await expect(page.getByTestId("book-badge")).toHaveText(/live/i);
  await expect.poll(() => frames(page)).toBeGreaterThan(f0);
});

test("reduced motion: book redraws at most once a second", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await blockNetwork(page);
  await page.goto("/");
  await expect(page.getByTestId("book-badge")).toHaveText(/live/i, { timeout: 8000 });
  const f0 = await frames(page);
  await page.waitForTimeout(3000);
  expect((await frames(page)) - f0).toBeLessThanOrEqual(4);
  await ctx.close();
});

test("the demo's market picker rebuilds the city for another regime and seed", async ({ page }) => {
  await page.goto("/demos/harbour/");
  const h = page.getByTestId("harbour"), tip = page.getByTestId("harbour-tip");
  await expect(h).toHaveAttribute("data-ready", "1", { timeout: 8000 });
  const read = async () => { await h.focus(); await page.keyboard.press("Escape"); await page.keyboard.press("ArrowRight"); return tip.textContent(); };
  const switching = await read();
  await page.getByText("Trending", { exact: true }).click();
  await expect(h).toHaveAttribute("data-ready", "1", { timeout: 8000 });
  const trending = await read();
  expect(switching).toMatch(/^Sessions 1 to 30/);
  expect(trending).toMatch(/^Sessions 1 to 30/);
  expect(trending).not.toBe(switching);
  await page.getByLabel("seed").fill("7"); await page.getByLabel("seed").press("Enter");
  await expect(page.getByTestId("book-badge")).toHaveText("live · seed 7", { timeout: 8000 });
});

test("hovering the blueprint towers after t = now explains look-ahead bias", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const box = (await page.getByTestId("harbour").boundingBox())!;
  // Blueprint towers sit right of t = now (x = 1210 of 1584) and above the waterline (y = 286 of 396).
  await page.mouse.move(box.x + box.width * (1300 / 1584), box.y + box.height * (200 / 396));
  await expect(page.getByTestId("harbour-tip")).toBeVisible();
  await expect(page.getByTestId("harbour-tip")).toContainText(/look-ahead/i);
});

test("keyboard users can step through the read-outs", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.getByTestId("harbour").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("harbour-tip")).toBeVisible();
  const first = await page.getByTestId("harbour-tip").textContent();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("harbour-tip")).not.toHaveText(first ?? "");
});

test("Tab moves from the harbour into the read-out's link", async ({ page, browserName }) => {
  await page.goto("/");
  await ready(page);
  await page.getByTestId("harbour").focus();
  const tip = page.getByTestId("harbour-tip");
  for (let i = 0; i < 40 && !/race test/i.test((await tip.textContent()) ?? ""); i++) await page.keyboard.press("ArrowRight");
  await expect(tip).toContainText(/race test/i);
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(tip.getByRole("link")).toBeFocused();
  await expect(tip).toBeVisible();
});

test("a page opened in a hidden tab says paused, then goes live when shown", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __hidden: boolean }).__hidden = true;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => (window as unknown as { __hidden: boolean }).__hidden });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => ((window as unknown as { __hidden: boolean }).__hidden ? "hidden" : "visible") });
  });
  await page.goto("/");
  await expect(page.getByTestId("book-badge")).toHaveText(/paused/i, { timeout: 8000 });
  await page.waitForTimeout(800);
  await expect(page.getByTestId("book-badge")).toHaveText(/paused/i);          // stays paused: no trading while hidden
  await page.evaluate(() => { (window as unknown as { __hidden: boolean }).__hidden = false; document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.getByTestId("book-badge")).toHaveText(/live/i, { timeout: 8000 });
});

test.describe("boot sequence", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("plays once per visit and any key skips it", async ({ page }) => {
    await page.goto("/");
    const boot = page.locator("[data-boot]");
    await expect(boot).toBeVisible();
    await expect(boot).toContainText("700B+ rows");
    await page.keyboard.press("Space");
    await expect(boot).toBeHidden({ timeout: 3000 });
    await page.reload();
    await page.waitForTimeout(400);
    await expect(boot).toBeHidden();
  });
});

test("crosshair shows the price and session under the pointer", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const box = (await page.getByTestId("harbour").boundingBox())!;
  await page.mouse.move(box.x + box.width * (600 / 1584), box.y + box.height * (200 / 396));
  await expect(page.locator(".xp")).toBeVisible();
  await expect(page.locator(".xp")).toHaveText(/^\d+\.\d\d$/);
  await expect(page.locator(".xd")).toHaveText(/^session \d+$/);
});

test("the Konami code starts the Symphony of Lights", async ({ page }) => {
  await page.goto("/");
  for (const k of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]) await page.keyboard.press(k);
  await expect(page.locator("html")).toHaveClass(/lights/);
  // the way many people remember it, A then B, toggles it back off
  for (const k of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "a", "b"]) await page.keyboard.press(k);
  await expect(page.locator("html")).not.toHaveClass(/lights/);
});
