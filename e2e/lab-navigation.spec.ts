import { test, expect } from '@playwright/test';

test('rail arrow selection and Enter activation refer to the same experiment', async ({ page }) => {
  await page.goto('/demos/#gatedbuild');
  await page.locator('[data-exp="gatedbuild"] a').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-panel="guard"]')).toBeVisible();
  expect(await page.evaluate(() => {
    const focused = document.activeElement;
    return focused === document.querySelector('.tree [role=listbox]') || !!document.querySelector('[data-exp="guard"]')?.contains(focused);
  })).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#guard$/);
  await expect(page.locator('[data-panel="guard"]')).toBeVisible();
});

test('folder disclosures can be toggled with a keyboard and announce their state', async ({ page }) => {
  await page.goto('/demos/#gatedbuild');
  const folder = page.getByRole('button', { name: 'qts-platform/', exact: true });
  await expect(folder).toBeVisible();
  const expanded = await folder.getAttribute('aria-expanded');
  expect(['true', 'false']).toContain(expanded);
  await folder.focus(); await page.keyboard.press('Space');
  await expect(folder).toHaveAttribute('aria-expanded', expanded === 'true' ? 'false' : 'true');
  await page.keyboard.press('Enter');
  await expect(folder).toHaveAttribute('aria-expanded', expanded!);
  await expect(page).toHaveURL(/#gatedbuild$/);
});

test('Home and End reveal the selected rail entry in a short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 540 });
  await page.goto('/demos/#gatedbuild');
  await page.locator('.tree [role=listbox]').focus();
  await page.keyboard.press('End');
  await expect(page.locator('[data-exp="harbour"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-exp="harbour"] a')).toBeInViewport();
  await page.keyboard.press('Home');
  await expect(page.locator('[data-exp="gatedbuild"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-exp="gatedbuild"] a')).toBeInViewport();
});

test('modified rail clicks open a new tab without replacing the current experiment', async ({ page }) => {
  await page.goto('/demos/#gatedbuild');
  const folder = page.getByRole('button', { name: 'maths/', exact: true });
  if (await folder.getAttribute('aria-expanded') === 'false') await folder.click();
  await page.locator('[data-exp="options"] a').click({ modifiers: ['ControlOrMeta'] });
  await expect(page).toHaveURL(/#gatedbuild$/);
  await expect.poll(() => page.context().pages().length).toBe(2);
  const opened = page.context().pages().find(p => p !== page)!;
  await expect(opened).toHaveURL(/\/demos\/#options$/);
  await expect(opened.locator('[data-panel="options"]')).toBeVisible();
  await opened.close();
});
