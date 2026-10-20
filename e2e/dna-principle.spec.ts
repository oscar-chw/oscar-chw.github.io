import {test,expect} from '@playwright/test';
import {localPyodide} from './pyodide';
test('verified DNA recovery exposes the actual parity equation and a byte inspector',async({page})=>{
 await localPyodide(page);await page.goto('/demos/#dna');
 const tool=page.locator('.dna-recovery');
 await page.getByRole('textbox',{name:'File recovery text'}).fill('a'.repeat(1024)+'b'.repeat(40));
 await page.getByRole('button',{name:'Encode file',exact:true}).click();await expect(tool.getByRole('status')).toContainText('Encoded',{timeout:30_000});
 await tool.getByRole('checkbox',{name:'Keep data fragment 0',exact:true}).uncheck();
 await tool.getByRole('button',{name:'Recover file',exact:true}).click();await expect(tool.getByRole('status')).toContainText('Verified');
 await expect(tool.locator('.dna-equation')).toContainText('03 XOR 62 = 61');
 const offset=tool.getByRole('slider',{name:'Byte offset in recovered fragment 0'});await offset.fill('40');await offset.dispatchEvent('input');
 await expect(tool.locator('.dna-equation')).toContainText('61 XOR 00 = 61');
 await tool.getByRole('checkbox',{name:'Keep data fragment 1',exact:true}).uncheck();
 await tool.getByRole('button',{name:'Recover file',exact:true}).click();await expect(tool.getByRole('status')).toContainText('unrecoverable');
 await expect(tool.locator('.dna-principle')).toContainText('two unknown blocks');
 await expect(tool.locator('.dna-equation')).toHaveCount(0);
});
