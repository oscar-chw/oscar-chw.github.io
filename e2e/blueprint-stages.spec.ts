import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('stage selection opens the corresponding recorded experiment and computes the paired difference',async({page})=>{
  await page.goto('/demos/crypto-desk/');
  const study=page.getByLabel('Recorded study',{exact:true});
  await page.getByRole('tab',{name:'06 portfolio'}).click();
  await expect(study).toHaveValue('kelly');
  await expect(page.locator('[data-stage-evidence]')).toContainText('EXP-06-1');
  await page.getByLabel('Recorded assumption',{exact:true}).selectOption('overestimated');
  await page.getByLabel('Recorded metric',{exact:true}).selectOption('1');
  const source=JSON.parse(readFileSync('sources/crypto-desk-blueprint/EXP-06-1-2d82aed.json','utf8'));
  const difference=source.treatment.overestimated.max_dd_p95-source.control.overestimated.max_dd_p95;
  await expect(page.locator('[data-recorded-calculation]')).toContainText(difference.toPrecision(6));
  await expect(page.locator('[data-recorded-calculation]')).toContainText('half Kelly − full Kelly');
  await page.getByRole('tab',{name:'04 pricing'}).click();
  await expect(study).toHaveValue('funding');
  await expect(page.locator('[data-stage-evidence]')).toContainText('EXP-04-1');
  await page.getByRole('tab',{name:'08 validation'}).click();
  await expect(study).toHaveValue('validation');
  const saved=page.waitForEvent('download');await page.getByRole('button',{name:'Export recorded comparison'}).click();
  const stream=await (await saved).createReadStream(),chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);
  expect(JSON.parse(Buffer.concat(chunks).toString()).id).toBe('EXP-08-1');
});

test('unmeasured stages never borrow unrelated experiment evidence and cross-selection clears the stage claim',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/demos/crypto-desk/');
  const study=page.getByLabel('Recorded study',{exact:true});
  await page.getByRole('tab',{name:'06 portfolio'}).click();await expect(study).toHaveValue('kelly');
  await page.getByRole('tab',{name:'07 execution'}).click();
  await expect(page.locator('[data-stage-evidence]')).toContainText('No saved experiment');
  await expect(page.locator('[data-stage-evidence]')).not.toContainText('EXP-06-1');
  await page.getByRole('tab',{name:'06 portfolio'}).click();
  await study.selectOption('funding');
  await expect(page.getByRole('tab',{name:'04 pricing'})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('[data-stage-evidence]')).toContainText('EXP-04-1');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});
