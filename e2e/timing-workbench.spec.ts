import {test,expect} from '@playwright/test';

test('timing workspace imports its downloadable template and refuses oversized or invalid UTF-8 files',async({page})=>{
  await page.goto('/demos/#lookahead');const p=page.locator('[data-panel="lookahead"]'),input=p.getByRole('textbox',{name:'Return records CSV'});
  const saved=page.waitForEvent('download');await p.getByRole('button',{name:'Download template',exact:true}).click();
  const stream=await (await saved).createReadStream(),chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);
  const bytes=Buffer.concat(chunks),file=p.getByLabel('Import Return records CSV');
  await file.setInputFiles({name:'my-returns.csv',mimeType:'text/csv',buffer:bytes});
  await expect(input).toHaveValue(bytes.toString());
  await p.getByRole('button',{name:'Run backtest',exact:true}).click();
  await expect(p.locator('.tw-ledger tbody tr')).toHaveCount(8);
  await file.setInputFiles({name:'large.csv',mimeType:'text/csv',buffer:Buffer.alloc(65537,65)});
  await expect(p.locator('.we-status')).toContainText('64 KB');await expect(input).toHaveValue(bytes.toString());
  await expect(p.getByRole('button',{name:'Export result',exact:true})).toBeDisabled();
  await file.setInputFiles({name:'invalid.csv',mimeType:'text/csv',buffer:Buffer.from([0xc3,0x28])});
  await expect(p.locator('.we-status')).toContainText('UTF-8');await expect(input).toHaveValue(bytes.toString());
});

test('a delayed timing file import cannot replace newer visitor input',async({page})=>{
  await page.goto('/demos/#lookahead');const p=page.locator('[data-panel="lookahead"]'),input=p.getByRole('textbox',{name:'Return records CSV'});
  const original=await input.inputValue();
  await page.evaluate(()=>{
    const state=window as unknown as {release:()=>void;read:Promise<ArrayBuffer>};
    const originalRead=File.prototype.arrayBuffer,gate=new Promise<void>(resolve=>{state.release=resolve;});
    File.prototype.arrayBuffer=function(){state.read=gate.then(()=>originalRead.call(this));return state.read;};
  });
  await p.getByLabel('Import Return records CSV').setInputFiles({name:'slow.csv',mimeType:'text/csv',buffer:Buffer.from(original)});
  await expect(p.locator('.we-status')).toContainText('Reading');
  const edited='step,return_pct\n0,4\n1,2\n';await input.fill(edited);
  await page.evaluate(async()=>{const s=window as unknown as {release:()=>void;read:Promise<ArrayBuffer>};s.release();await s.read;});
  await expect(input).toHaveValue(edited);
  await expect(p.locator('.we-status')).not.toContainText('Loaded');
});

test('lookahead runs visitor returns and exports the actual delayed decisions',async({page})=>{
  await page.goto('/demos/#lookahead');
  const p=page.locator('[data-panel="lookahead"]');
  const input=p.getByRole('textbox',{name:'Return records CSV'});
  await expect(input).toBeVisible();
  await input.fill('step,return_pct\n0,10\n1,-5\n2,2\n');
  await p.getByRole('button',{name:'Run backtest',exact:true}).click();
  await expect(p.locator('.tw-ledger tbody tr')).toHaveCount(3);
  await expect(p.locator('.tw-ledger tbody tr').nth(1)).toContainText('0');
  const saved=page.waitForEvent('download');await p.getByRole('button',{name:'Export result',exact:true}).click();
  const stream=await (await saved).createReadStream(),chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);
  const receipt=JSON.parse(Buffer.concat(chunks).toString());
  expect(receipt.input).toContain('1,-5');
  expect(receipt.result.decisions).toHaveLength(3);
  expect(receipt.result.decisions[1].signalStep).toBe(0);
  expect(receipt.result.decisions[1].honestNet).toBeCloseTo(Math.log(0.95),12);
  expect(receipt.result.decisions[2].honestPosition).toBe(-1);
  await p.getByRole('slider',{name:'Inspect decision'}).fill('2');
  await expect(p.locator('.tw-inspect')).toContainText('step 1');
});

test('timing input errors remove stale results and correct templates can be repaired and reset',async({page})=>{
  await page.setViewportSize({width:375,height:844});
  await page.goto('/demos/#lookahead');const p=page.locator('[data-panel="lookahead"]');
  const input=p.getByRole('textbox',{name:'Return records CSV'});
  await expect(input).toBeVisible();
  await p.getByRole('button',{name:'Load invalid example',exact:true}).click();
  await p.getByRole('button',{name:'Run backtest',exact:true}).click();
  await expect(p.locator('.we-status')).toContainText(/line 2.*return_pct/i);
  await expect(input).toHaveAttribute('aria-invalid','true');
  await expect(p.locator('.tw-ledger')).toHaveCount(0);
  await expect(p.getByRole('button',{name:'Export result',exact:true})).toBeDisabled();
  await p.getByRole('button',{name:'Load correct example',exact:true}).click();
  await p.getByRole('button',{name:'Run backtest',exact:true}).click();
  await expect(p.locator('.tw-ledger tbody tr')).toHaveCount(8);
  await expect(input).not.toHaveAttribute('aria-invalid','true');
  await p.getByRole('button',{name:'reset',exact:true}).click();
  await expect(p.locator('.ro dd').nth(1)).toHaveText('hidden');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});

test('candle audit reads supplied availability times and identifies the record to repair',async({page})=>{
  await page.goto('/demos/#candles');const p=page.locator('[data-panel="candles"]');
  const input=p.getByRole('textbox',{name:'Candle records CSV'});
  await expect(input).toBeVisible();
  await input.fill('open_min,close_min,available_min,return_pct\n0,5,0,10\n5,10,5,-5\n');
  await p.getByRole('button',{name:'Run availability audit',exact:true}).click();
  await expect(p.locator('.ro dd').nth(1)).toHaveText('2 of 2 reads used a close not yet known');
  await expect(p.locator('.tw-inspect')).toContainText('known at 5');
  await input.fill('open_min,close_min,available_min,return_pct\n0,5,5,10\n5,10,10,-5\n');
  await expect(p.getByRole('button',{name:'Export result',exact:true})).toBeDisabled();
  await p.getByRole('button',{name:'Run availability audit',exact:true}).click();
  await expect(p.locator('.ro dd').nth(1)).toHaveText('0 of 1 reads ahead of time');
  await expect(p.locator('.tw-ledger tbody tr')).toHaveCount(2);
  await p.getByRole('button',{name:'Load invalid example',exact:true}).click();
  await p.getByRole('button',{name:'Run availability audit',exact:true}).click();
  await expect(p.locator('.we-status')).toContainText(/line 2.*available_min/i);
});
