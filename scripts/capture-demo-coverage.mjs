import {chromium,webkit} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {EXPERIMENTS} from '../src/data/lab.ts';
const out=process.env.CAPTURE_DIR??'docs/all-demo-audit/baseline';
const base=process.env.BASE_URL??'http://localhost:4340';
const selected=process.env.DEMO_IDS?.split(',');
const experiments=selected?EXPERIMENTS.filter(e=>selected.includes(e.id)):EXPERIMENTS;
if(selected&&experiments.length!==selected.length)throw new Error('Unknown or duplicate demo ID');
mkdirSync(out,{recursive:true});
const results=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 for(const width of [375,1280]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('noboot','1'));
  for(const exp of experiments){
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try {
   await page.goto(base+(exp.href??`/demos/#${exp.id}`));
   const panel=exp.kind==='inline'?page.locator(`[data-panel="${exp.id}"]`):page.locator('main');
   await panel.waitFor();
   if(exp.kind==='inline')await panel.locator('[data-stage]:not([data-load-state="loading"])').waitFor();
   await page.evaluate(()=>document.fonts.ready);
   const entry=await page.evaluate(()=>{
    const head=document.querySelector('[data-panel]:not([hidden]) h2')??document.querySelector('main h1'),bar=document.querySelector('.bar');
    const a=head?.getBoundingClientRect(),b=bar?.getBoundingClientRect();
    return {headingTop:a?.top??null,headingBottom:a?.bottom??null,barBottom:b?.bottom??null};
   });
   await page.screenshot({path:`${out}/${engine}-${width}-${exp.id}-viewport.png`});
   const shot=`${out}/${engine}-${width}-${exp.id}.png`;
   await panel.screenshot({path:shot});
   const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,build:document.querySelector('meta[name="build"]')?.getAttribute('content')}));
   results.push({id:exp.id,engine,width,shot,entry,errors,...state});
   writeFileSync(`${out}/renders.json`,JSON.stringify(results,null,2)+'\n');
   } catch(error) {
    writeFileSync(`${out}/failure.json`,JSON.stringify({id:exp.id,engine,width,errors,message:String(error),completedViews:results.length},null,2)+'\n');
    await browser.close();throw error;
   } finally {if(!page.isClosed())await page.close();}
  }
  await context.close();
  console.log(`${engine}/${width}: ${experiments.length} initial views captured`);
 }
 await browser.close();
}
writeFileSync(`${out}/renders.json`,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({views:results.length,issues:results.filter(r=>r.errors.length||r.overflow>0)}));
