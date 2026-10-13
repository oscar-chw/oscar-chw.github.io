import { test, expect } from "@playwright/test";

test("compensated inputs reject an empty field without changing the result, but accept explicit zero", async ({ page }) => {
  await page.goto("/demos/#compensated");
  const panel = page.locator('[data-panel="compensated"]');
  const a = panel.getByRole("textbox", { name: "a", exact: true });
  const result = panel.locator('.cp-row[data-method="exact"] .cp-num');
  const before = await result.innerText();
  await a.fill(""); await a.press("Tab");
  await expect(panel.getByRole("alert")).toContainText(/a.*number/);
  await expect(a).toHaveAttribute("aria-invalid", "true");
  await expect(result).toHaveText(before);
  await a.fill("0"); await a.press("Tab");
  await expect(panel.locator(".cp-err-msg")).toBeEmpty();
  await expect(a).not.toHaveAttribute("aria-invalid", "true");
  await expect(result).not.toHaveText(before);
});

for (const replacement of ["reset", "new inputs", "typical amplitudes"] as const) {
  test(`compensated ${replacement} clears the rejected value and its accessibility state`, async ({ page }) => {
    await page.goto("/demos/#compensated");
    const panel = page.locator('[data-panel="compensated"]');
    const a = panel.getByRole("textbox", { name: "a", exact: true });
    await a.fill("invalid"); await a.press("Tab");
    await expect(a).toHaveAttribute("aria-invalid", "true");
    await panel.getByRole(replacement === "typical amplitudes" ? "radio" : "button", { name: replacement, exact: true }).click();
    await expect(panel.locator(".cp-err-msg")).toBeEmpty();
    await expect(a).not.toHaveValue("invalid");
    await expect(a).not.toHaveAttribute("aria-invalid", "true");
  });
}

for (const width of [320, 375]) {
  test(`the ${width}px Lab status label has space below the explanation`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/demos/#compensated");
    await page.locator('[data-panel="compensated"] .cp-why').waitFor();
    const gap = await page.locator('[data-panel="compensated"] [data-stage]').evaluate((stage) => {
      const cs = getComputedStyle(stage), footer = getComputedStyle(stage, "::after");
      const lastBottom = Math.max(...[...stage.children].filter((el) => el.getBoundingClientRect().height > 0).map((el) => el.getBoundingClientRect().bottom));
      const contentBottom = stage.getBoundingClientRect().bottom - parseFloat(cs.borderBottomWidth) - parseFloat(cs.paddingBottom);
      return { available: contentBottom - lastBottom, labelHeight: parseFloat(footer.height) };
    });
    expect(gap.labelHeight).toBeGreaterThan(0);
    expect(gap.available).toBeGreaterThanOrEqual(gap.labelHeight);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
}

test("correcting one rejected input clears its invalid state while another field still needs correction", async ({ page }) => {
  await page.goto("/demos/#compensated");
  const panel = page.locator('[data-panel="compensated"]');
  const a = panel.getByRole("textbox", { name: "a", exact: true });
  const b = panel.getByRole("textbox", { name: "b", exact: true });
  await a.fill("invalid"); await a.press("Tab");
  await expect(a).toHaveAttribute("aria-invalid", "true");
  await b.fill("invalid"); await b.press("Tab");
  await a.fill("3"); await a.press("Tab");
  await expect(panel.getByRole("alert")).toContainText(/b.*number/);
  await expect(b).toHaveAttribute("aria-invalid", "true");
  await expect(a).not.toHaveAttribute("aria-invalid", "true");
});

test("switching to reduced motion keeps the latest surface when older animation frames run", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/demos/#options");
  const panel = page.locator('[data-panel="options"]'), canvas = panel.locator("canvas");
  await canvas.waitFor();
  const time = new Date("2026-10-13T00:00:00Z");
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await panel.getByRole("radio", { name: "gamma", exact: true }).dispatchEvent("click");
  await page.clock.runFor(64);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await panel.getByRole("radio", { name: "delta", exact: true }).dispatchEvent("click");
  const latest = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  await page.clock.runFor(600);
  expect(await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL())).toBe(latest);
});
