import { test, expect } from "@playwright/test";

// Every demo page states its data source ([data-testid=data-source]) and has instructions.
const DEMOS = [
  ["/demos/fourier/", /photo|path/i],
  ["/demos/order-book/", /synthetic/i],
  ["/demos/reconciliation/", /synthetic/i],
  ["/demos/harbour/", /binance/i],
] as const;

test("the demos index links all four demos", async ({ page }) => {
  await page.goto("/demos/");
  for (const [href] of DEMOS) await expect(page.locator(`main a[href$="${href}"]`).first()).toBeVisible();
});

for (const [path, source] of DEMOS) {
  test(`${path} states its data source and has instructions`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByTestId("data-source")).toContainText(source);
    await expect(page.getByTestId("instructions")).toBeVisible();
  });
}

test("fourier: more circles draw the portrait more accurately", async ({ page }) => {
  await page.goto("/demos/fourier/");
  const slider = page.getByTestId("fourier-circles");
  const err = page.getByTestId("fourier-error");
  await slider.fill("10");
  await expect(err).toHaveAttribute("data-value", /\d/);
  const coarse = Number(await err.getAttribute("data-value"));
  await slider.fill("400");
  await expect(err).not.toHaveAttribute("data-value", String(coarse));
  const fine = Number(await err.getAttribute("data-value"));
  expect(fine).toBeLessThan(coarse);
});

test("fourier: a path drawn by hand is redrawn by circles", async ({ page }) => {
  await page.goto("/demos/fourier/");
  await page.getByTestId("fourier-draw").click();
  const canvas = page.getByTestId("fourier-canvas");
  const b = (await canvas.boundingBox())!;
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3);
  await page.mouse.down();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    await page.mouse.move(b.x + b.width * (0.5 + 0.2 * Math.cos(a)), b.y + b.height * (0.5 + 0.2 * Math.sin(a)));
  }
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-state", "playing");
  await expect(page.getByTestId("fourier-error")).toHaveAttribute("data-source", "drawn");
});

test("order-book replay: play advances the tape and the book stays uncrossed", async ({ page }) => {
  await page.goto("/demos/order-book/");
  const step = page.getByTestId("replay-step");
  const s0 = Number(await step.textContent());
  await page.getByTestId("replay-play").click();
  await expect.poll(async () => Number(await step.textContent()), { timeout: 5000 }).toBeGreaterThan(s0);
  const bid = Number(await page.getByTestId("best-bid").textContent());
  const ask = Number(await page.getByTestId("best-ask").textContent());
  expect(bid).toBeLessThan(ask);
});

test("reconciliation: both series are drawn from the measured file", async ({ page }) => {
  await page.goto("/demos/reconciliation/");
  await expect(page.getByTestId("series-inmemory")).toBeVisible();
  await expect(page.getByTestId("series-streaming")).toBeVisible();
  await page.getByTestId("recon-play").click();
  await expect.poll(async () => Number(await page.getByTestId("recon-progress").getAttribute("data-value")), { timeout: 8000 }).toBeGreaterThan(0);
});

test("harbour demo page renders the interactive harbour", async ({ page }) => {
  await page.goto("/demos/harbour/");
  await expect(page.getByTestId("harbour").locator("canvas")).toBeVisible();
});

test("fourier: the drawing animation can be paused", async ({ page }) => {
  await page.goto("/demos/fourier/");
  const canvas = page.getByTestId("fourier-canvas");
  await expect(canvas).toHaveAttribute("data-state", "playing");
  await page.getByTestId("fourier-pause").click();
  await expect(page.getByTestId("fourier-pause")).toHaveAttribute("aria-pressed", "true");
  const a = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(600);
  expect(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(a);
  await page.getByTestId("fourier-pause").click();
  await page.waitForTimeout(600);
  expect(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(a);
});
