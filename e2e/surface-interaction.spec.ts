import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';

const pixels = async (page: Page) => createHash('sha256').update(await page.locator('.s3d').evaluate((c: HTMLCanvasElement) => c.toDataURL())).digest('hex');
const settle = (page: Page) => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

test('surface rotation has a pause and resume control with observable effects', async ({ page }) => {
  await page.goto('/demos/#options');
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: 'Pause rotation', exact: true }).click();
  await settle(page); const paused = await pixels(page);
  await page.waitForTimeout(250);
  expect(await pixels(page)).toBe(paused);
  await page.getByRole('button', { name: 'Resume rotation', exact: true }).click();
  await expect.poll(() => pixels(page)).not.toBe(paused);
});

test('enabling reduced motion stops a surface that is already rotating', async ({ page }) => {
  await page.goto('/demos/#options');
  await expect(page.locator('.s3d')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await settle(page); const stopped = await pixels(page);
  await page.waitForTimeout(250);
  expect(await pixels(page)).toBe(stopped);
});

test('keyboard probe reports computed surface values and follows model edits and reset', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demos/#options');
  const panel = page.locator('[data-panel="options"]');
  const result = panel.locator('[data-surface-readout]');
  await expect(result).toBeVisible(); const initial = await result.textContent();
  await panel.getByRole('slider', { name: 'Inspect x position', exact: true }).focus(); await page.keyboard.press('End');
  await panel.getByRole('slider', { name: 'Inspect y position', exact: true }).focus(); await page.keyboard.press('End');
  await expect(result).toContainText('stock price 150');
  await expect(result).toContainText('years to expiry 2.00y');
  // Independent normal-CDF reference from Python math.erf, S=150,T=2,r=.03,sigma=.25.
  await expect(result).toContainText('call price 57.65');
  await panel.getByRole('slider', { name: 'strike', exact: true }).focus(); await page.keyboard.press('End');
  await expect(result).toContainText('call price 30.14');
  await panel.getByRole('radio', { name: 'theta', exact: true }).click();
  await expect(result).toContainText('theta / day');
  await panel.getByRole('radio', { name: 'vega', exact: true }).click();
  await expect(result).toContainText('vega / 1 vol point');
  await panel.getByRole('button', { name: 'reset', exact: true }).click();
  await expect(result).toHaveText(initial!);
});

test('phone surface reserves dragging for explicit touch rotation and fits its value readout', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demos/#options');
  const canvas = page.locator('.s3d');
  await expect(canvas).toBeVisible();
  expect(await canvas.evaluate(c => getComputedStyle(c).touchAction)).toContain('pan-y');
  const toggle = page.getByRole('button', { name: 'Touch rotation', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click(); await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await canvas.evaluate(c => getComputedStyle(c).touchAction)).toBe('none');
  await toggle.click();
  expect(await canvas.evaluate(c => getComputedStyle(c).touchAction)).toContain('pan-y');
  await page.getByRole('radio', { name: 'implied vol', exact: true }).click();
  await expect(page.locator('[data-surface-readout]')).toContainText('implied vol');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test('a cancelled pointer gesture cannot continue rotating the surface', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demos/#options');
  const canvas = page.locator('.s3d');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  try {
    const before = await pixels(page);
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 10);
    expect(await pixels(page)).not.toBe(before);
    await canvas.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
    await settle(page); const cancelled = await pixels(page);
    // The empty plot margin has no point to highlight; only a stale drag could change its pose.
    await page.mouse.move(box.x + 2, box.y + 2);
    expect(await pixels(page)).toBe(cancelled);
  } finally { await page.mouse.up(); }
});

test('reset disposes the detached surface instead of painting it on later motion changes', async ({ page }) => {
  await page.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args: Parameters<typeof clear>) {
      this.canvas.dataset.paintCount = String(Number(this.canvas.dataset.paintCount ?? '0') + 1);
      return clear.apply(this, args);
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demos/#options');
  const canvas = page.locator('.s3d'); await expect(canvas).toBeVisible();
  const previous = (await canvas.elementHandle())!;
  await page.locator('[data-panel="options"]').getByRole('button', { name: 'reset', exact: true }).click();
  expect(await previous.evaluate(c => c.isConnected)).toBe(false);
  const oldCount = await previous.getAttribute('data-paint-count');
  const currentCount = await canvas.getAttribute('data-paint-count');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => canvas.getAttribute('data-paint-count')).not.toBe(currentCount);
  expect(await previous.getAttribute('data-paint-count')).toBe(oldCount);
});
