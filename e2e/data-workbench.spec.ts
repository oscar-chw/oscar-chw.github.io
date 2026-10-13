import { test, expect } from "@playwright/test";

test("workbench runs edited data, traces revisions, rejects invalid input and exports the result", async ({ page }) => {
  await page.goto('/demos/#data-workbench');
  const panel = page.locator('[data-panel="data-workbench"]');
  const editor = panel.getByRole('textbox', { name: 'Version records CSV' });
  await editor.fill('key,value,known\nprice,10,1\nprice,12.5,4\nvolume,100,2');
  await panel.getByRole('button', { name: 'Run query', exact: true }).click();
  const cutoff = panel.getByRole('slider', { name: 'Query cutoff', exact: true });
  await cutoff.fill('1'); await cutoff.dispatchEvent('input');
  const price = panel.locator('tbody tr').filter({ hasText: 'price' });
  await expect(price).toContainText('10');
  await expect(price).toContainText('line 2');
  await panel.getByRole('button', { name: 'price: 12.5, available at 4', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'price: 12.5, available at 4', exact: true })).toBeFocused();
  await expect(cutoff).toHaveValue('4');
  await expect(price).toContainText('12.5');
  await expect(price).toContainText('line 3');
  const [download] = await Promise.all([page.waitForEvent('download'), panel.getByRole('button', { name: 'Export result', exact: true }).click()]);
  const stream = await download.createReadStream(); const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const result = JSON.parse(Buffer.concat(chunks).toString());
  expect(result.cutoff).toBe(4);
  expect(result.fields.find((f: {key:string}) => f.key === 'price').selected.value).toBe(12.5);
  await editor.fill('key,value,known\nprice,nope,4');
  await panel.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText(/line 2.*finite/i);
  await expect(panel.getByRole('button', { name: 'Export result', exact: true })).toBeDisabled();
  await panel.getByRole('button', { name: 'Reset workspace', exact: true }).click();
  await expect(panel.getByRole('alert')).toBeHidden();
  await expect(editor).toHaveValue(/close \(Mon\)/);
});

test("workbench imports a local file and remains usable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demos/#data-workbench');
  const panel = page.locator('[data-panel="data-workbench"]');
  await expect.poll(async () => {
    const path = await panel.locator('.path').boundingBox(), bar = await page.locator('.bar').boundingBox();
    return path && bar ? path.y - (bar.y + bar.height) : -1;
  }).toBeGreaterThanOrEqual(8);
  const first = await panel.getByRole('button', { name: 'volume (Mon): 1200, available at 1', exact: true }).boundingBox();
  const second = await panel.getByRole('button', { name: 'volume (Mon): 1350, available at 2', exact: true }).boundingBox();
  expect(first && second && (first.x + first.width <= second.x || second.x + second.width <= first.x || first.y + first.height <= second.y || second.y + second.height <= first.y)).toBe(true);
  await panel.getByLabel('Import CSV').setInputFiles({ name:'my-data.csv', mimeType:'text/csv', buffer:Buffer.from('key,value,known\ncustom,42,0\ncustom,55,2') });
  await panel.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(panel.locator('tbody')).toContainText('custom');
  await expect(panel.getByText(/stays in this browser/i).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await panel.getByRole('textbox', { name:'Version records CSV' }).focus();
  await expect(panel.getByRole('textbox', { name:'Version records CSV' })).toBeFocused();
});
