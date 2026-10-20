import {test,expect} from '@playwright/test';
import {localPyodide} from './pyodide';

test('actual Python fragment recovery restores a lost block and refuses two losses in one group',async({page})=>{
  await localPyodide(page);await page.goto('/demos/#dna');
  const tool=page.locator('.dna-recovery');
  await page.getByRole('textbox',{name:'File recovery text'}).fill('a'.repeat(1050)+'界🦉');
  await page.getByRole('button',{name:'Encode file',exact:true}).click();
  await expect(tool.getByRole('status')).toContainText('Encoded',{timeout:30_000});
  await tool.getByRole('checkbox',{name:'Keep data fragment 0',exact:true}).uncheck();
  await tool.getByRole('button',{name:'Recover file',exact:true}).click();
  await expect(tool.getByRole('status')).toContainText('Verified');
  await expect(tool.locator('[data-recovered-text]')).toHaveText('a'.repeat(1050)+'界🦉');
  await expect(tool.locator('[data-recovery-report]')).toContainText('"recovered_indices"');
  await tool.getByRole('checkbox',{name:'Keep data fragment 1',exact:true}).uncheck();
  await tool.getByRole('button',{name:'Recover file',exact:true}).click();
  await expect(tool.getByRole('status')).toContainText('unrecoverable');
  await expect(tool.getByRole('button',{name:'Download recovered file',exact:true})).toBeDisabled();
  await tool.getByRole('checkbox',{name:'Keep data fragment 1',exact:true}).check();
  await tool.getByRole('button',{name:'Recover file',exact:true}).click();
  await expect(tool.getByRole('status')).toContainText('Verified');
  await page.getByRole('textbox',{name:'File recovery text'}).fill('changed');
  await expect(tool.getByRole('button',{name:'Recover file',exact:true})).toBeDisabled();
  await expect(tool.locator('[data-recovered-text]')).toBeEmpty();
});

test('runtime load failure stays separate from a recovery verdict and can be retried',async({page})=>{
  await localPyodide(page);let fails=true;
  await page.route('**/lab/dna-codec/manifest.json',r=>fails?r.abort():r.continue());
  await page.goto('/demos/#dna');await page.getByRole('button',{name:'Encode file',exact:true}).click();
  await expect(page.locator('.dna-recovery').getByRole('status')).toContainText('unavailable');
  fails=false;await page.getByRole('button',{name:'Encode file',exact:true}).click();
  await expect(page.locator('.dna-recovery').getByRole('status')).toContainText('Encoded',{timeout:30_000});
});
