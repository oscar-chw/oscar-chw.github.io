import { test, expect } from '@playwright/test';
import { localPyodide } from './pyodide';

test('runtime boot overlaps source downloads but corrupted source never reaches Python', async ({page}) => {
  await localPyodide(page);
  let release!:()=>void;
  const held=new Promise<void>(resolve=>{release=resolve;});
  let runtimeRequested=false;
  page.on('request',r=>{if(r.url().includes('/pyodide.mjs'))runtimeRequested=true;});
  await page.route('**/lab/feed-gate/replay/book.py',async r=>{
    await held;await r.fulfill({body:'changed source bytes',contentType:'text/plain'});
  });
  await page.goto('/demos/#gatedbuild');
  const p=page.locator('[data-panel="gatedbuild"]');
  try {
    await p.getByRole('button',{name:'Run all checks',exact:true}).click();
    await expect.poll(()=>runtimeRequested).toBe(true);
    await expect(p.locator('.fg-verdict')).toContainText('Preparing Python');
    await expect(p.getByRole('button',{name:'Download run receipt'})).toBeDisabled();
  } finally {release();}
  await expect(p.locator('.fg-verdict')).toContainText('Unavailable');
  await expect(p.locator('.fg-result')).toContainText('checksum mismatch');
  await expect(p.locator('.fg-output tbody tr')).toHaveCount(0);
  await expect(p.getByRole('button',{name:'Download run receipt'})).toBeDisabled();
});

test('exploration cases run on editable input and a downloaded correct template can be imported',async({page})=>{
  await localPyodide(page);await page.goto('/demos/#gatedbuild');
  const p=page.locator('[data-panel="gatedbuild"]'),input=p.getByRole('textbox',{name:'Archive JSON lines'});
  await p.getByRole('radio',{name:'Off-grid price',exact:true}).click();
  await expect(input).toHaveValue(/0\.49001/);
  await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-verdict')).toContainText('Rejected');
  await expect(p.locator('.fg-result')).toContainText(/price|grid/);
  await input.fill((await input.inputValue()).replace('0.49001','0.49'));
  await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-verdict')).toContainText('Accepted');
  await p.getByRole('radio',{name:'Recording gap',exact:true}).click();
  await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-output tbody')).toContainText('GAP');
  await expect(p.locator('.fg-book')).toContainText('No usable book');
  const saved=page.waitForEvent('download');
  await p.getByRole('button',{name:'Download correct template',exact:true}).click();
  const download=await saved,stream=await download.createReadStream(),chunks:Buffer[]=[];
  for await(const c of stream!)chunks.push(c);
  const bytes=Buffer.concat(chunks);expect(bytes.toString()).toContain('"available_ms":22');
  await p.getByLabel('Import archive file').setInputFiles({name:'my-archive.jsonl',mimeType:'application/json',buffer:bytes});
  await expect(input).toHaveValue(bytes.toString());
  await expect(p.locator('.fg-verdict')).toContainText('Not run');
  await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-verdict')).toContainText('Accepted');
  await expect(p.locator('.fg-output tbody tr')).toHaveCount(2);
  await p.getByRole('button',{name:'start over',exact:true}).click();
  await expect(input).toHaveValue(/"available_ms":19/);
});

test('an oversized local import invalidates the old result without replacing the visible input',async({page})=>{
  await localPyodide(page);
  await page.goto('/demos/#gatedbuild');
  const p=page.locator('[data-panel="gatedbuild"]'),input=p.getByRole('textbox',{name:'Archive JSON lines'});
  await p.getByRole('radio',{name:'received before available — correct',exact:true}).click();
  await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await expect(p.locator('.fg-verdict')).toContainText('Accepted');
  const before=await input.inputValue();
  await p.getByLabel('Import archive file').setInputFiles({name:'too-big.jsonl',mimeType:'application/json',buffer:Buffer.alloc(65537,65)});
  await expect(p.locator('.fg-import-status')).toContainText('64 KB');
  await expect(input).toHaveValue(before);
  await expect(p.getByRole('button',{name:'Download run receipt'})).toBeDisabled();
  await expect(p.locator('.fg-verdict')).toContainText('Not run');
  await p.getByLabel('Import archive file').setInputFiles({name:'invalid-utf8.jsonl',mimeType:'application/json',buffer:Buffer.from([0xc3,0x28])});
  await expect(p.locator('.fg-import-status')).toContainText('UTF-8');
  await expect(input).toHaveValue(before);
});

test('a local file that finishes reading late cannot overwrite a newer edit',async({page})=>{
  await page.goto('/demos/#gatedbuild');
  const p=page.locator('[data-panel="gatedbuild"]'),input=p.getByRole('textbox',{name:'Archive JSON lines'});
  const original=await input.inputValue();
  await page.evaluate(()=>{
    const state=window as unknown as {releaseImport:()=>void;pendingImport:Promise<ArrayBuffer>};
    const read=File.prototype.arrayBuffer;
    const gate=new Promise<void>(resolve=>{state.releaseImport=resolve;});
    File.prototype.arrayBuffer=function(){state.pendingImport=gate.then(()=>read.call(this));return state.pendingImport;};
  });
  await p.getByLabel('Import archive file').setInputFiles({name:'slow.jsonl',mimeType:'application/json',buffer:Buffer.from(original)});
  await expect(p.locator('.fg-import-status')).toContainText('Reading');
  const edited=original.replace('"available_ms":19','"available_ms":23');await input.fill(edited);
  await page.evaluate(async()=>{
    const state=window as unknown as {releaseImport:()=>void;pendingImport:Promise<ArrayBuffer>};
    state.releaseImport();await state.pendingImport;
  });
  await expect(input).toHaveValue(edited);
  await expect(p.locator('.fg-verdict')).toContainText('Not run');
  await expect(p.locator('.fg-import-status')).not.toContainText('Loaded');
});

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
