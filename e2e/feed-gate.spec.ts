import { test, expect } from '@playwright/test';
import { localPyodide } from './pyodide';

test('feed gate executes Python on the edited bytes, explains rejection and exports the corrected result', async ({page}) => {
  await localPyodide(page);
  await page.goto('/demos/#gatedbuild');
  const p = page.locator('[data-panel="gatedbuild"]');
  const input = p.getByRole('textbox', {name:'Archive JSON lines'});
  await expect(input).toHaveValue(/"available_ms":19/);
  await expect(p.locator('.fg-verdict')).toContainText('Not run');
  await p.getByRole('button', {name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-verdict')).toContainText('Rejected');
  await expect(p.locator('.fg-result')).toContainText('received <= available');
  await expect(p.locator('.fg-explain')).toContainText('21');
  await expect(p.locator('.fg-explain')).toContainText('19');
  // The selection stays on the broken example: the bytes, not the preset flag, decide.
  await input.fill((await input.inputValue()).replace('"available_ms":19', '"available_ms":22'));
  await expect(p.locator('.fg-verdict')).toContainText('Not run');
  await expect(p.getByRole('button', {name:'Download run receipt'})).toBeDisabled();
  await p.getByRole('button', {name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-verdict')).toContainText('Accepted');
  await expect(p.locator('.fg-output tbody tr')).toHaveCount(2);
  await expect(p.locator('.fg-output tbody tr').last()).toContainText('1.00');
  await expect(p.locator('.fg-output tbody tr').last()).toContainText('22');
  const download = page.waitForEvent('download');
  await p.getByRole('button', {name:'Download run receipt'}).click();
  const file = await download; const stream = await file.createReadStream();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(chunk);
  const receipt = JSON.parse(Buffer.concat(chunks).toString());
  expect(receipt.result.accepted).toBe(true);
  expect(receipt.result.rows[1].bid_size).toBe(100);
  expect(receipt.input).toContain('"available_ms":22');
  expect(receipt.source.commit).toBe('f8c48256e12b96523807ba8f59c04b798517e04e');
  await p.getByRole('button', {name:'start over',exact:true}).click();
  await expect(input).toHaveValue(/"available_ms":19/);
  await expect(p.locator('.fg-verdict')).toContainText('Not run');
  await expect(p.getByRole('radio',{name:'available before receipt — has a bug',exact:true})).toHaveAttribute('aria-checked','true');
});

test('empty and malformed input cannot leave an accepted result; source and controls fit a phone', async ({page}) => {
  await page.setViewportSize({width:375,height:844});
  await page.goto('/demos/#gatedbuild');
  const p=page.locator('[data-panel="gatedbuild"]'), input=p.getByRole('textbox',{name:'Archive JSON lines'});
  await input.fill(''); await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-result')).toContainText('empty');
  await input.fill('{broken'); await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-result')).toContainText('Line 1');
  await expect(p.getByRole('button',{name:'Download run receipt'})).toBeDisabled();
  await expect(p.getByRole('link',{name:'Pinned Python source',exact:true})).toHaveAttribute('href', /f8c48256.*admission.py/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
  const box=await input.boundingBox();expect(box!.width).toBeGreaterThan(250);
});

test('unavailable runtime is an execution error, never a passing gate', async ({page}) => {
  await page.route(/cdn.jsdelivr.net/,r=>r.abort());
  await page.goto('/demos/#gatedbuild');
  const p=page.locator('[data-panel="gatedbuild"]');
  await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-verdict')).toContainText('Unavailable');
  await expect(p.locator('.fg-result')).toContainText('Python');
  await expect(p.locator('.gb-t.done')).toHaveCount(2);
  await expect(p.getByRole('button',{name:'Download run receipt'})).toBeDisabled();
  await page.unroute(/cdn.jsdelivr.net/);
  await localPyodide(page);
  await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-verdict')).toContainText('Rejected by admit');
  await expect(p.locator('.fg-result')).toContainText('received <= available');
});
