import {chromium,webkit,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {localPyodide} from '../e2e/pyodide.ts';
const dir='docs/all-demo-audit/dna-principle-renders';mkdirSync(dir,{recursive:true});const results=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 for(const width of [320,375,1280]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('noboot','1'));await localPyodide(page);
  await page.goto('http://localhost:4340/demos/#dna');
  const tool=page.locator('.dna-recovery');await page.getByRole('textbox',{name:'File recovery text'}).fill('a'.repeat(1024)+'b'.repeat(40));
  await page.getByRole('button',{name:'Encode file',exact:true}).click();await expect(tool.getByRole('status')).toContainText('Encoded',{timeout:30000});
  await tool.getByRole('checkbox',{name:'Keep data fragment 0',exact:true}).uncheck();await tool.getByRole('button',{name:'Recover file',exact:true}).click();
  await expect(tool.locator('.dna-equation')).toContainText('03 XOR 62 = 61');
  const shot=`${dir}/${engine}-${width}-reconstruction.png`;await tool.locator('.dna-principle').screenshot({path:shot});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);expect(overflow).toBe(0);expect(errors).toEqual([]);
  results.push({engine,width,shot,errors,overflow});await page.close();
 }
 await browser.close();
}
writeFileSync(`${dir}/renders.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
