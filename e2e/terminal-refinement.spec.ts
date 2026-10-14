import {test,expect} from '@playwright/test';

test('Linux text workflow computes a result, preserves files across pages, and downloads it',async({page})=>{
  await page.goto('/projects/qts-research-platform/');await page.keyboard.press('/');
  const d=page.getByRole('dialog',{name:'Command palette'}),q=d.locator('.pq'),out=d.locator('.po');
  const run=async(s:string)=>{await q.fill(s);await q.press('Enter');};
  await run('printf "%s\\n" "alpha,2" "beta,4" "alpha,7" > trades.csv');
  await expect(out).toContainText('Saved /home/visitor/trades.csv');
  await run('cat trades.csv | cut -d , -f 1 | sort | uniq -c');await expect(out).toContainText('2 alpha');
  await expect(d.locator('[data-command-status]')).toContainText('exit 0');
  await page.goto('/about/');await page.keyboard.press('/');
  await run('cat trades.csv');await expect(out).toContainText('beta,4');
  const download=page.waitForEvent('download');await run('download trades.csv');
  const file=await download;expect(file.suggestedFilename()).toBe('trades.csv');
  await run('rm /');await expect(out).toContainText('Is a directory');
  await expect(d.locator('[data-command-status]')).toContainText('exit 1');
  await run('cat trades.csv');await expect(out).toContainText('alpha,7');
});

test('manuals are specific, history restores a draft, and exit closes the console',async({page})=>{
  await page.goto('/');await page.keyboard.press('/');
  const d=page.getByRole('dialog',{name:'Command palette'}),q=d.locator('.pq'),out=d.locator('.po');
  await q.fill('man cut');await q.press('Enter');await expect(out).toContainText('cut -d');
  await q.fill('cat unfinished');await q.press('ArrowUp');await expect(q).toHaveValue('man cut');
  await q.press('ArrowDown');await expect(q).toHaveValue('cat unfinished');
  await q.fill('exit');await q.press('Enter');await expect(d).not.toBeVisible();
});

test('the workspace tour is actionable on a narrow phone with reduced motion',async({page})=>{
  await page.setViewportSize({width:320,height:640});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');await page.keyboard.press('/');
  const d=page.getByRole('dialog',{name:'Command palette'});
  await d.getByRole('button',{name:'workspace',exact:true}).click();
  await expect(d.locator('.po')).toContainText('Browser');
  const q=d.locator('.pq');await q.fill('help');await q.press('Enter');
  await expect(d.locator('.po')).toContainText('cut');
  const frame=await d.boundingBox(),footer=await d.locator('.console-footer').boundingBox(),prompt=await q.boundingBox();
  expect(footer!.y+footer!.height).toBeLessThanOrEqual(frame!.y+frame!.height);
  expect(prompt!.y).toBeGreaterThanOrEqual(frame!.y);
  await d.getByRole('button',{name:'Close console',exact:true}).click();await expect(d).not.toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('unavailable tab storage is reported while editing and downloading still work',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
  await page.goto('/');await page.keyboard.press('/');
  const d=page.getByRole('dialog',{name:'Command palette'}),q=d.locator('.pq');
  await q.fill('echo kept > note.txt');await q.press('Enter');
  await expect(d.locator('.po')).toContainText('Saved');
  await expect(d.locator('.workspace-state')).toContainText('saving between pages unavailable');
  await q.fill('nano note.txt');await q.press('Enter');
  await expect(d.getByRole('textbox',{name:'Virtual file contents'})).toHaveValue('kept\n');
  await d.getByRole('button',{name:'Close console'}).click();await page.keyboard.press('/');
  await expect(q).toBeEnabled();await q.fill('cat note.txt');await q.press('Enter');
  await expect(d.locator('.po')).toContainText('kept');
});
