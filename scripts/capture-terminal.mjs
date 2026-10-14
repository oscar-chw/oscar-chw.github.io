import {chromium,webkit} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='docs/all-demo-audit/terminal-renders';mkdirSync(dir,{recursive:true});
const results=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 for(const width of [320,375,1280]){
  const page=await browser.newPage({viewport:{width,height:800},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('noboot','1'));
  await page.goto('http://localhost:4340/projects/qts-research-platform/');await page.keyboard.press('/');
  const d=page.getByRole('dialog',{name:'Command palette'}),q=d.locator('.pq');
  await d.getByRole('button',{name:'workspace',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.po')?.textContent.includes('visitor@oscar'));
  await page.screenshot({path:`${dir}/${engine}-${width}-workspace.png`});
  await q.fill('cat /lab/versions.csv | cut -d , -f 1 | sort | uniq -c');await q.press('Enter');
  await page.waitForFunction(()=>document.querySelector('[data-command-status]')?.textContent.includes('exit 0'));
  await page.screenshot({path:`${dir}/${engine}-${width}-pipeline.png`});
  const state=await d.evaluate(el=>{const r=el.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth-innerWidth,x:r.x,right:r.right,bottom:r.bottom,height:innerHeight};});
  assert.equal(errors.length,0);assert(state.overflow<=0&&state.x>=0&&state.right<=width&&state.bottom<=state.height);
  results.push({engine,width,errors,...state});await page.close();
 }
 await browser.close();
}
writeFileSync(`${dir}/renders.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
