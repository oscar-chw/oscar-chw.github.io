import { chromium, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { EXPERIMENTS } from '../../src/data/lab.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const relative = 'docs/refinement-20261016/renders';
const base = 'http://localhost:4321';
await mkdir(resolve(root, relative), { recursive: true });
const rows = [], focused = [];
for (const [engine, type] of Object.entries({ chromium, webkit })) {
  const browser = await type.launch();
  try {
    for (const width of [375, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(() => { localStorage.setItem('noboot', '1'); localStorage.setItem('theme', 'dark'); });
      try {
        for (const experiment of EXPERIMENTS) {
          const page = await context.newPage(), errors = [];
          page.on('pageerror', e => errors.push(e.message));
          try {
            const path = experiment.kind === 'page' ? experiment.href : `/demos/#${experiment.id}`;
            await page.goto(base + path);
            if (experiment.kind === 'inline') await page.locator(`[data-panel="${experiment.id}"] [data-load-state="ready"]`).waitFor();
            await page.evaluate(() => document.fonts.ready);
            await page.waitForTimeout(1200);
            const shot = `${relative}/${engine}-${width}-${experiment.id}.png`;
            await page.screenshot({ path: resolve(root, shot), fullPage: true });
            const dimensions = await page.evaluate(() => ({
              overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
              build: document.querySelector('meta[name="build"]')?.content,
            }));
            const row = { id: experiment.id, engine, width, shot, errors, ...dimensions };
            rows.push(row);
            await writeFile(resolve(root, relative, 'renders.json'), JSON.stringify(rows, null, 2) + '\n');
            assert.deepEqual(errors, [], `${engine}/${width}/${experiment.id} page errors`);
            assert.equal(row.overflow, 0, `${engine}/${width}/${experiment.id} overflow`);
            console.log(`${engine}/${width}/${experiment.id}: rendered without overflow or page errors`);
          } finally { await page.close(); }
        }
      } finally { await context.close(); }
    }
    for (const [width, height, theme, id] of [[320, 740, 'dark', 'options'], [1280, 900, 'light', 'options'], [1024, 540, 'dark', 'gatedbuild']]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.addInitScript(theme => { localStorage.setItem('noboot', '1'); localStorage.setItem('theme', theme); }, theme);
      try {
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(`${base}/demos/#${id}`);
        await page.locator(`[data-panel="${id}"] [data-load-state="ready"]`).waitFor();
        await page.evaluate(() => document.fonts.ready);
        if (id === 'gatedbuild') {
          await page.locator('.tree [role="listbox"]').focus();
          await page.keyboard.press('End');
          assert.equal(await page.locator('[data-exp="harbour"]').getAttribute('aria-selected'), 'true');
        }
        const shot = `${relative}/${engine}-${width}-${theme}-${id}-focused.png`;
        await page.screenshot({ path: resolve(root, shot), fullPage: true });
        const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
        assert.equal(overflow, 0); assert.deepEqual(errors, []);
        focused.push({ engine, width, height, theme, id, shot, overflow, errors });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
await writeFile(resolve(root, relative, 'focused.json'), JSON.stringify(focused, null, 2) + '\n');
assert.equal(rows.length, EXPERIMENTS.length * 4);
assert.equal(focused.length, 6);
console.log(`PASS ${rows.length} fresh views and ${focused.length} focused views`);
