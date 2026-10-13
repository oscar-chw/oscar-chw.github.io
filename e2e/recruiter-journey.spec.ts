import { test, expect } from "@playwright/test";

test("music controls stay reachable on a short landscape screen", async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto("/");
  const music = page.getByRole("button", { name: "Play background music", exact: true });
  const panel = page.getByRole("group", { name: "Background music", exact: true });
  await music.hover();
  const button = (await music.boundingBox())!;
  await page.mouse.move(button.x + button.width / 2, button.y + button.height + 6);
  await expect(panel).toBeVisible();
  const bounds = (await panel.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(320);
  const volume = panel.getByRole("slider", { name: "Music volume", exact: true });
  await volume.focus();
  await expect(volume).toBeInViewport();
  const value = Number(await volume.inputValue());
  await volume.press("ArrowLeft");
  await expect(volume).toHaveValue(String(value - 1));
});

// Narrow visitors must be able to identify all destinations without the CV wrapping away.
for (const width of [320, 375, 640, 641, 700, 701, 760, 761, 768, 1280]) {
  test(`primary destinations stay readable and together at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const nav = page.getByRole("navigation", { name: "Primary" });
    const boxes = [];
    for (const name of ["Work", "Demos", "About", "CV"]) {
      const link = nav.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      const rect = await link.boundingBox();
      const label = await link.locator(".lbl").boundingBox();
      expect(rect).not.toBeNull(); expect(label).not.toBeNull();
      expect(label!.width, `${name} has readable text`).toBeGreaterThanOrEqual(12);
      expect(label!.height).toBeGreaterThanOrEqual(14);
      expect(rect!.width).toBeGreaterThanOrEqual(24);
      expect(rect!.height).toBeGreaterThanOrEqual(24);
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
      boxes.push(rect!);
    }
    expect(Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y)), "all destinations share one row").toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}

for (const width of [320, 1280]) {
  test(`recruiter reaches evidence, runs the demo and downloads the CV at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Work", exact: true }).click();
    await page.getByRole("link", { name: /GPU Backend for FatQat/ }).first().click();
    await expect(page.getByRole("heading", { name: "GPU Backend for FatQat", exact: true })).toBeVisible();
    await page.locator('a[href$="/demos/#compensated"]').click();
    await expect(page.getByTestId("cp-result")).toBeVisible();
    const first = await page.getByTestId("cp-result").innerText();
    await page.getByRole("radio", { name: "typical amplitudes", exact: true }).check();
    await expect(page.getByTestId("cp-result")).not.toHaveText(first);
    await page.getByRole("button", { name: "reset", exact: true }).click();
    await expect(page.getByTestId("cp-result")).toHaveText(first);
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "CV", exact: true }).click();
    await expect(page.getByRole("heading", { name: "CV", exact: true })).toBeVisible();
    const downloading = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download the CV (PDF)", exact: true }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("Oscar_Choi_CV.pdf");
    expect(await download.failure()).toBeNull();
  });
}
