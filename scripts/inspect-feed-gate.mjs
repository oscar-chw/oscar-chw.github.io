import {chromium,webkit} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const out='docs/real-feed-gate/renders';mkdirSync(out,{recursive:true});
const results=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 for(const width of [375,1280]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('noboot','1'));
  await page.route(/cdn\.jsdelivr\.net\/pyodide\/v[\d.]+\/full\//,r=>{
   const name=new URL(r.request().url()).pathname.split('/').pop();const ext=name.split('.').pop();
   return r.fulfill({body:readFileSync('node_modules/pyodide/'+name),contentType:({mjs:'text/javascript',js:'text/javascript',wasm:'application/wasm',json:'application/json',zip:'application/zip'})[ext]??'application/octet-stream',headers:{'access-control-allow-origin':'*'}});
  });
  await page.goto('http://localhost:4340/demos/#gatedbuild');
  const p=page.locator('[data-panel="gatedbuild"]');const input=p.getByRole('textbox',{name:'Archive JSON lines'});
  await input.waitFor();await page.screenshot({path:`${out}/${engine}-${width}-initial.png`});
  await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await p.locator('.fg-verdict').filter({hasText:'Rejected'}).waitFor();
  await page.screenshot({path:`${out}/${engine}-${width}-rejected.png`});
  await p.screenshot({path:`${out}/${engine}-${width}-full.png`});
  await input.fill((await input.inputValue()).replace('"available_ms":19','"available_ms":22'));
  await p.getByRole('button',{name:'Run all checks',exact:true}).click();
  await p.locator('.fg-verdict').filter({hasText:'Accepted'}).waitFor();
  await page.screenshot({path:`${out}/${engine}-${width}-accepted.png`});
  const bounds=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,inputs:[...document.querySelectorAll('.fg-input')].map(x=>({width:x.getBoundingClientRect().width,font:getComputedStyle(x).fontSize}))}));
  if(bounds.overflow>0||errors.length)throw new Error(JSON.stringify({engine,width,bounds,errors}));
  results.push({engine,width,...bounds,errors});await context.close();
 }
 await browser.close();
}
writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
