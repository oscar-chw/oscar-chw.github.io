import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('edited feed input replaces the old fixture explanation before execution',async({page})=>{
  await page.goto('/demos/#gatedbuild');const p=page.locator('[data-panel="gatedbuild"]');
  await expect(p.locator('.fg-kicker')).toContainText('cannot arrive');
  const text=readFileSync('public/lab/feed-gate/correct.jsonl','utf8').replace('"size":"3"','"size":"5.5"');
  await p.getByRole('textbox',{name:'Archive JSON lines'}).fill(text);
  await expect(p.locator('.fg-kicker')).toHaveText('Your edited archive.');
  await expect(p.locator('.fg-workspace')).not.toContainText('marked available at 19');
  await p.getByRole('button',{name:'start over',exact:true}).click();
  await expect(p.locator('.fg-kicker')).toContainText('cannot arrive');
});

test('custom arithmetic is distinguished from the starting family used by the sweep',async({page})=>{
  await page.goto('/demos/#compensated');const p=page.locator('[data-panel="compensated"]');
  await p.getByRole('textbox',{name:'a',exact:true}).fill('1.75');
  await expect(p.locator('[data-arithmetic-input-state]')).toContainText('Custom operands');
  await p.getByRole('button',{name:'Run these inputs',exact:true}).click();
  await expect(p.locator('[data-arithmetic-input-state]')).toContainText('current execution');
  await expect(p.locator('[data-controls]')).toContainText('separate generated cases');
  await p.getByRole('button',{name:'reset',exact:true}).click();
  await expect(p.locator('[data-arithmetic-input-state]')).toContainText('Starting example');
});
