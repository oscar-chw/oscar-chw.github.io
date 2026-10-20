import { test, expect, type Page } from "@playwright/test";

const youtube = /https:\/\/(www\.)?youtube(-nocookie)?\.com\//;
const music = (page: Page) => page.locator("[data-music-toggle]");
async function ready(page: Page) {
  // The cursor is created by the same module as the music controls; do not judge inert HTML.
  await expect(page.locator(".cur-dot")).toHaveCount(1);
}
async function off(page: Page) {
  await expect(music(page)).toHaveAttribute("aria-pressed", "false");
  await expect(music(page)).toHaveAttribute("aria-label", "Play background music");
  await expect(page.locator(".ytmini")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-music", "");
}
async function visibility(page: Page, hidden: boolean) {
  await page.evaluate((value) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => value });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => value ? "hidden" : "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

test.beforeEach(async ({ page }) => {
  await page.route(youtube, (route) => route.abort());
  await page.addInitScript(() => {
    if (window.top !== window) return;
    if (!sessionStorage.getItem("music-intent-seeded")) {
      localStorage.setItem("music", "on");
      localStorage.setItem("music-track", "rosalina");
      localStorage.setItem("music-vol", "0.27");
      sessionStorage.setItem("music-intent-seeded", "1");
    }
  });
});

test("legacy music-on state stays silent after unrelated clicks and keys", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => { if (youtube.test(request.url())) requests.push(request.url()); });
  await page.goto("/about/"); await ready(page);
  await off(page);
  await page.locator("main h1").click();
  await page.keyboard.press("Shift");
  await page.waitForTimeout(600);
  await off(page);
  expect(requests).toEqual([]);
  await music(page).hover();
  await expect(page.getByRole("radio", { name: /Rosalina/ })).toBeChecked();
  await expect(page.getByLabel("Music volume")).toHaveValue("27");
});

test("track and volume preferences persist without starting playback", async ({ page }) => {
  await page.goto("/about/"); await ready(page);
  await music(page).hover();
  await page.getByRole("radio", { name: /unlasting/ }).check();
  await page.getByLabel("Music volume").fill("34");
  await off(page);
  await page.reload(); await ready(page);
  await music(page).hover();
  await expect(page.getByRole("radio", { name: /unlasting/ })).toBeChecked();
  await expect(page.getByLabel("Music volume")).toHaveValue("34");
  await off(page);
  await music(page).click();
  await expect(page.locator(".ytmini iframe")).toHaveAttribute("src", /\/Nh7JtKYhK-Q\?/);
  await expect(music(page)).toHaveAttribute("aria-pressed", "true");
});

test("navigation reload and Back require a fresh explicit Play action", async ({ page }) => {
  await page.goto("/about/"); await ready(page);
  await music(page).click();
  await expect(page.locator(".ytmini")).toBeVisible();
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Work", exact: true }).click();
  await ready(page); await off(page);
  await page.keyboard.press("Shift"); await off(page);
  await music(page).click();
  await expect(page.locator(".ytmini")).toBeVisible();
  await page.reload(); await ready(page); await off(page);
  await page.goBack(); await ready(page); await off(page);
  await music(page).focus(); await page.keyboard.press("Enter");
  await expect(page.locator(".ytmini")).toBeVisible();
});

test("visibility changes neither start muted music nor recreate an explicitly playing frame", async ({ page }) => {
  await page.goto("/about/"); await ready(page);
  await visibility(page, true); await visibility(page, false);
  await off(page);
  await music(page).click();
  const frame = page.locator(".ytmini iframe");
  await expect(frame).toBeVisible();
  await frame.evaluate((element) => element.setAttribute("data-original-frame", "yes"));
  await visibility(page, true); await visibility(page, false);
  await expect(frame).toHaveAttribute("data-original-frame", "yes");
  await music(page).click(); await off(page);
  await visibility(page, true); await visibility(page, false);
  await page.keyboard.press("Shift"); await page.waitForTimeout(600);
  await off(page);
});

test("cancelling Play while its module loads prevents late playback", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let loaded!: () => void;
  const requested = new Promise<void>((resolve) => { loaded = resolve; });
  await page.route(/\/_astro\/youtube\.[^/]+\.js$/, async (route) => {
    loaded(); await held; await route.continue();
  });
  await page.goto("/about/"); await ready(page);
  // Start from an off state even on the baseline, so this tests cancellation rather than migration.
  await page.evaluate(() => localStorage.setItem("music", "off"));
  await page.reload(); await ready(page);
  try {
    await music(page).click(); await requested;
    await expect(music(page)).toHaveAttribute("aria-label", "Mute background music");
    await music(page).click(); await off(page);
  } finally { release(); }
  await page.waitForTimeout(600); await off(page);
  await music(page).focus(); await page.keyboard.press("Space");
  await expect(page.locator(".ytmini")).toBeVisible();
});

test("a page restored from the back-forward cache does not retain playback intent", async ({ page }) => {
  await page.goto("/about/"); await ready(page);
  await page.evaluate(() => localStorage.setItem("music", "off"));
  await page.reload(); await ready(page);
  await music(page).click();
  await expect(page.locator(".ytmini")).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await page.keyboard.press("Shift");
  await off(page);
});

test("a player module load failure leaves music off and explains recovery", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/\/_astro\/youtube\.[^/]+\.js$/, (route) => route.abort());
  await page.goto("/about/"); await ready(page);
  await music(page).click();
  await expect(page.locator("[data-mus-now]")).toContainText("could not load music");
  await off(page);
  await page.locator("main h1").click(); await page.keyboard.press("Shift");
  await page.waitForTimeout(600); await off(page);
  expect(errors).toEqual([]);
});
