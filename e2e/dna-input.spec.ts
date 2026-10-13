import { test, expect } from '@playwright/test';

for (const width of [375, 1280]) test(`DNA Lab preserves clean multilingual text and clears an empty workspace at ${width}px`, async ({page}) => {
  await page.setViewportSize({ width, height: 812 });
  await page.goto('/demos/#dna');
  const panel = page.locator('[data-panel="dna"]');
  await panel.locator('input[type="range"]').nth(0).fill('0');
  const message = panel.getByRole('textbox', {name:'Message to store in DNA'});
  await message.fill('香港🦉');
  const field = await message.boundingBox(), bar = await page.locator('.bar').boundingBox();
  expect(field!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height);
  await expect(panel.locator('.dna-back')).toHaveText('香港🦉');
  await expect(panel.locator('.ro dd').first()).toHaveText('3 of 3');
  await expect(panel.locator('.dna .b')).toHaveCount(40);
  await message.fill('');
  await expect(panel.locator('.dna .b')).toHaveCount(0);
  await expect(panel.locator('.dna-back')).toContainText(/enter a message/i);
  await expect(panel.locator('.ro dd').first()).toHaveText('0 of 0');
  await message.fill('DNA');
  await expect(panel.locator('.dna-back')).toHaveText('DNA');
});
