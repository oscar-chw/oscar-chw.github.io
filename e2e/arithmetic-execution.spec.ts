import {test,expect} from '@playwright/test';

test('the workbench begins with editable controls visually and in keyboard order',async({page})=>{
  await page.goto('/demos/#compensated');const p=page.locator('[data-panel="compensated"]');
  await p.getByRole('button',{name:'Run these inputs',exact:true}).waitFor();
  await p.locator('.eh a').last().focus();await page.keyboard.press('Tab');
  await expect(p.getByRole('radio',{name:'nearly cancelling',exact:true})).toBeFocused();
  const controls=await p.locator('[data-controls]').boundingBox(),graph=await p.locator('[data-execution-view]').boundingBox();
  expect(controls!.y+controls!.height).toBeLessThan(graph!.y);
});

test('visitor operands drive the visible operation graph, binary inspector and downloadable execution',async({page})=>{
  await page.goto('/demos/#compensated');
  const p=page.locator('[data-panel="compensated"]');
  for(const [i,n] of ['1.25','3.5','0.75','5.25'].entries())await p.getByRole('textbox',{name:'abcd'[i],exact:true}).fill(n);
  await p.getByRole('button',{name:'Run these inputs',exact:true}).click();
  await expect(p.locator('[data-operation]')).toHaveCount(7);
  await expect(p.locator('[data-operation="ab"] [data-value]')).toHaveText('4.3750000000000000');
  await expect(p.locator('[data-operation="plain"] [data-value]')).toHaveText('0.43750000000000000');
  for(const [i,n] of ['1.0000000000000002','0.9999999999999998','1','1'].entries())await p.getByRole('textbox',{name:'abcd'[i],exact:true}).fill(n);
  await p.getByRole('button',{name:'Run these inputs',exact:true}).click();
  await p.locator('[data-operation="fused"]').click();
  await expect(p.locator('[data-trace-inspector]')).toContainText('-4.9303806576313238e-32');
  await expect(p.locator('[data-trace-bits]')).toContainText('1000');
  const saved=page.waitForEvent('download');await p.getByRole('button',{name:'Download arithmetic trace'}).click();
  const file=await saved,stream=await file.createReadStream(),chunks:Buffer[]=[];
  for await(const c of stream!)chunks.push(c);
  const trace=JSON.parse(Buffer.concat(chunks).toString());
  expect(trace.inputs).toEqual([1.0000000000000002,.9999999999999998,1,1]);
  expect(trace.referenceExact).toBe('-1 × 2^-104');
  expect(trace.steps.find((s:{id:string})=>s.id==='plain').value).toBe(0);
  expect(trace.steps.find((s:{id:string})=>s.id==='compensated').value).toBe(-(2**-104));
});

test('a draft or invalid operand cannot retain a current execution or old sweep; repair/reset work on a phone',async({page})=>{
  await page.setViewportSize({width:320,height:740});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/demos/#compensated');const p=page.locator('[data-panel="compensated"]');
  await p.getByRole('button',{name:'run 2,000 cases'}).click();await expect(p.getByTestId('cp-sweep')).not.toBeEmpty();
  const a=p.getByRole('textbox',{name:'a',exact:true});await a.fill('bad');
  await expect(p.locator('[data-execution-view]')).toBeHidden();
  await expect(p.getByRole('button',{name:'Download arithmetic trace'})).toBeDisabled();
  await expect(p.getByTestId('cp-sweep')).toBeEmpty();
  await p.getByRole('button',{name:'Run these inputs',exact:true}).click();
  await expect(p.getByRole('alert')).toContainText('a must be a number');
  await a.fill('0');await p.getByRole('button',{name:'Run these inputs',exact:true}).click();
  await expect(p.locator('[data-execution-view]')).toBeVisible();
  await p.getByRole('button',{name:'reset',exact:true}).click();
  await expect(a).not.toHaveValue('0');await expect(p.locator('[data-operation]')).toHaveCount(7);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});
