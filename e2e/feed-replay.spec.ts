import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {localPyodide} from './pyodide';
const custom=()=>{
  const r=readFileSync('public/lab/feed-gate/correct.jsonl','utf8').trim().split('\n').map(s=>JSON.parse(s));
  r[1].message.bids[0].size='7.25';r[1].message.asks[0].size='2.5';
  r[2].message.price_changes[0].size='1.75';
  r.push({record_id:2,kind:'gap',received_ms:31,available_ms:33,reason:'disconnect'});
  return r.map(s=>JSON.stringify(s)).join('\n')+'\n';
};

test('custom archive sizes drive an inspectable Python book replay and gaps never show invented liquidity',async({page})=>{
  await localPyodide(page);await page.goto('/demos/#gatedbuild');
  const p=page.locator('[data-panel="gatedbuild"]');
  await p.getByRole('textbox',{name:'Archive JSON lines'}).fill(custom());
  await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-verdict')).toContainText('Accepted');
  const replay=p.getByRole('region',{name:'Admitted book replay'});
  await expect(replay).toBeVisible();
  await expect(replay.locator('[data-book-side="bid"]')).toContainText('7.25');
  const first=await replay.locator('[data-depth="bid"]').boundingBox();
  await replay.getByRole('button',{name:'Next admitted record'}).click();
  await expect(replay.locator('[data-book-side="bid"]')).toContainText('1.75');
  const next=await replay.locator('[data-depth="bid"]').boundingBox();
  expect(next!.width/first!.width).toBeCloseTo(1.75/7.25,2);
  await expect(replay.locator('[data-record-source]')).toContainText('1.75');
  await expect(replay.locator('[data-record-clocks]')).toContainText('22');
  await replay.getByRole('slider',{name:'Admitted record'}).focus();await page.keyboard.press('End');
  await expect(replay.locator('[data-record-state]')).toContainText('GAP');
  await expect(replay.locator('[data-book-side="bid"]')).toHaveCount(0);
  await expect(replay).toContainText('No usable book');
  await replay.getByRole('button',{name:'Previous admitted record'}).click();
  await expect(replay.locator('[data-book-side="bid"]')).toContainText('1.75');
});

test('editing, rejection and reset remove the old replay; a repaired non-preset input recreates it',async({page})=>{
  await localPyodide(page);await page.setViewportSize({width:375,height:812});
  await page.goto('/demos/#gatedbuild');const p=page.locator('[data-panel="gatedbuild"]');
  const input=p.getByRole('textbox',{name:'Archive JSON lines'});
  await input.fill(custom());await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.getByRole('region',{name:'Admitted book replay'})).toBeVisible();
  await input.fill(custom().replace('"available_ms":22','"available_ms":19'));
  await expect(p.getByRole('region',{name:'Admitted book replay'})).toHaveCount(0);
  await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-verdict')).toContainText('Rejected');
  await expect(p.getByRole('region',{name:'Admitted book replay'})).toHaveCount(0);
  await input.fill(custom());await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.getByRole('region',{name:'Admitted book replay'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
  await p.getByRole('button',{name:'start over',exact:true}).click();
  await expect(p.getByRole('region',{name:'Admitted book replay'})).toHaveCount(0);
});

test('an unsupported gap reason is rejected without a usable replay and exports its failure receipt',async({page})=>{
  await localPyodide(page);await page.goto('/demos/#gatedbuild');
  const p=page.locator('[data-panel="gatedbuild"]');
  await p.getByRole('textbox',{name:'Archive JSON lines'}).fill(custom().replace('"reason":"disconnect"','"reason":"visitor disconnect"'));
  await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-verdict')).toContainText('Rejected');
  await expect(p.locator('.fg-result')).toContainText('declared gap reason required');
  await expect(p.getByRole('region',{name:'Admitted book replay'})).toHaveCount(0);
  const download=page.waitForEvent('download');
  await p.getByRole('button',{name:'Download run receipt'}).click();
  const file=await download,stream=await file.createReadStream(),chunks:Buffer[]=[];
  for await(const chunk of stream!)chunks.push(chunk);
  const receipt=JSON.parse(Buffer.concat(chunks).toString());
  expect(receipt.result.accepted).toBe(false);
  expect(receipt.result.errorType).toBe('ValueError');
  expect(receipt.result.message).toBe('declared gap reason required');
  expect(receipt.result.rows).toBeUndefined();
  expect(receipt.input).toBe(custom().replace('"reason":"disconnect"','"reason":"visitor disconnect"'));
});
