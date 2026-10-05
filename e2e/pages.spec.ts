import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Keep page tests independent of Binance being reachable.
  await page.routeWebSocket(/stream\.binance\.com/, (ws) => ws.close());
  await page.route(/data-api\.binance\.vision/, (r) => r.abort());
});

test("primary navigation reaches every section", async ({ page }) => {
  await page.goto("/");
  for (const [name, path] of [["Work", "/projects/"], ["Demos", "/demos/"], ["About", "/about/"], ["CV", "/cv/"]]) {
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("all eleven project pages exist and follow the problem → limits structure", async ({ page }) => {
  await page.goto("/projects/");
  const links = page.locator('main a[href*="/projects/"]');
  const hrefs = [...new Set(await links.evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).pathname)))].filter((h) => h !== "/projects/");
  expect(hrefs.length).toBe(11);
  for (const h of hrefs) {
    await page.goto(h);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /problem/i })).toBeVisible();
  }
});

test("theme toggle switches and persists across pages", async ({ page }) => {
  await page.goto("/about/");
  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");
  await page.getByRole("button", { name: /theme/i }).click();
  const after = await html.getAttribute("data-theme");
  expect(after).not.toBe(before);
  await page.goto("/projects/");
  await expect(html).toHaveAttribute("data-theme", after!);
});

test("skip link is the first tab stop and focus is visible", async ({ page, browserName }) => {
  await page.goto("/about/");
  // Safari only tabs to links with Option held.
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const skip = page.getByRole("link", { name: /skip to content/i });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
});

test("about shows the photo and the confirmed minor", async ({ page }) => {
  await page.goto("/about/");
  await expect(page.getByRole("img", { name: /oscar/i })).toBeVisible();
  await expect(page.locator("main")).toContainText("Minor in Data Analytics and Informatics");
});

test("cv page offers the phone-free PDF", async ({ page }) => {
  await page.goto("/cv/");
  const link = page.getByRole("link", { name: /download/i });
  await expect(link).toHaveAttribute("href", /Oscar_Choi_CV\.pdf$/);
  const res = await page.request.get((await link.getAttribute("href"))!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("pdf");
});

test("card has both QR codes and prints on one page", async ({ page }) => {
  await page.goto("/card/");
  await expect(page.getByRole("img", { name: /QR.*oscar-chw\.github\.io/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /QR.*linkedin/i })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
});

test("unknown paths get the 404 page", async ({ page }) => {
  const res = await page.goto("/no-such-page/");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("link", { name: /home/i }).first()).toBeVisible();
});
