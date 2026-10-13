import { test, expect } from '@playwright/test';

test('browser terminal writes and queries scratch files with familiar commands', async ({ page }) => {
  await page.goto('/projects/qts-research-platform/');
  await page.keyboard.press('/');
  const d=page.getByRole('dialog',{name:'Command palette'}), q=d.locator('.pq'), out=d.locator('.po');
  const run=async (s:string)=>{await q.fill(s); await q.press('Enter');};
  await run('pwd'); await expect(out).toContainText('/home/visitor');
  await run('mkdir research');
  await run('echo "My experiment" > research/notes.txt');
  await run('cat research/notes.txt'); await expect(out).toContainText('My experiment');
  await run('cat /lab/versions.csv | head -n 3 | wc -l'); await expect(out).toContainText(/\b3\b/);
  await run('rm /'); await expect(out).toContainText('Is a directory');
  await run('cat research/notes.txt'); await expect(out).toContainText('My experiment');
  await q.fill('cat research/no'); await q.press('Tab'); await expect(q).toHaveValue('cat research/notes.txt');
  await q.press('Control+c'); await expect(q).toHaveValue('');
  await run('help'); await expect(out).toContainText('browser');
  await run('nano research/notes.txt');
  const editor=d.getByRole('textbox',{name:'Virtual file contents'});
  await expect(editor).toHaveValue('My experiment\n');
  await editor.fill('An actual editable workspace\n');
  await d.getByRole('button',{name:'Save file',exact:true}).click();
  await run('cat research/notes.txt'); await expect(out).toContainText('An actual editable workspace');
  await run("echo -e 'key,value,known\\ncustom,42,0\\ncustom,55,2' > custom.csv");
  await expect(out).toContainText('Saved /home/visitor/custom.csv');
  await run('open data-workbench custom.csv');
  await expect(page).toHaveURL(/\/demos\/#data-workbench$/);
  await expect(page.getByRole('textbox',{name:'Version records CSV'})).toHaveValue(/custom,55,2/);
  await expect(page.locator('[data-panel="data-workbench"] tbody')).toContainText('custom');
});

test('terminal stays usable on a phone and treats file text as text', async ({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('/'); await page.keyboard.press('/');
  const d=page.getByRole('dialog',{name:'Command palette'}), q=d.locator('.pq');
  await q.fill('echo "<img src=x onerror=alert(1)>" > note.txt'); await q.press('Enter');
  await q.fill('cat note.txt'); await q.press('Enter');
  await expect(d.locator('.po')).toContainText('<img src=x onerror=alert(1)>');
  await expect(d.locator('.po img')).toHaveCount(0);
  const box=await d.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(375);
  expect(box!.y+box!.height).toBeLessThanOrEqual(667);
});

test('opening another Lab experiment dismisses the console on the same page', async ({page})=>{
  await page.goto('/demos/#data-workbench');
  await page.keyboard.press('/');
  const d=page.getByRole('dialog',{name:'Command palette'}),q=d.locator('.pq');
  await q.fill('open point-in-time');await q.press('Enter');
  await expect(page).toHaveURL(/#point-in-time$/);
  await expect(d).not.toBeVisible();
  await expect(page.locator('[data-panel="point-in-time"]')).toBeVisible();
});
