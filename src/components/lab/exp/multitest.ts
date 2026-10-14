import {panel,noise,meanIC,SPLITS} from '../../../lib/lab/factors';
import {noiseSearch} from '../../../lib/lab/studies';
import {recordTable} from '../records-editor';
import {h,slider,readout,button} from '../ui';
export function mount(stage:HTMLElement,controls:HTMLElement){
  let count=8;const p=panel(11),result=h('div',{}),ro=h('div',{}),error=h('p',{class:'noise-error',role:'alert'}),seedInput=h('input',{type:'text',inputmode:'numeric',value:'500','aria-label':'candidate seed offset',class:'we-small-input mono'});
  let cache:{seed:number;rows:{seed:number;train:number}[]}|null=null,current:ReturnType<typeof noiseSearch>|null=null;
  const exportButton=button('Export search',()=>{if(!current)return;const href=URL.createObjectURL(new Blob([JSON.stringify({data:'Synthetic panel and noise candidates',marketSeed:11,result:current},null,2)+'\n'],{type:'application/json'}));h('a',{href,download:'noise-search.json'}).click();setTimeout(()=>URL.revokeObjectURL(href),1000);});
  function clear(){current=null;result.replaceChildren();ro.replaceChildren();exportButton.disabled=true;}
  seedInput.addEventListener('input',()=>{clear();error.textContent='Seed changed. Run the search again.';});
  function draw(){
    try{
      const seed=Number(seedInput.value);if(!seedInput.value.trim()||!Number.isSafeInteger(seed)||seed<1||seed>1e6)throw new Error('Candidate seed offset must be an integer from 1 to 1000000.');
      error.textContent='';seedInput.removeAttribute('aria-invalid');
      if(cache?.seed!==seed)cache={seed,rows:noiseSearch(p,seed,60).rows};
      const rows=cache.rows.slice(0,count),chosen=rows.reduce((best,r,i)=>r.train>rows[best].train?i:best,0),test=meanIC(p,noise(rows[chosen].seed),...SPLITS.test);current={rows,chosen,test};exportButton.disabled=false;
      const tr=rows.map(r=>r.train),best=rows[chosen],viz=h('div',{class:'mt'},...tr.map((v,i)=>{const px=v*2500;return h('i',{class:i===chosen?'best':'',style:`--h:${Math.max(2,Math.abs(px))}px;--y:${-px/2}px`});}));
      ro.replaceChildren(readout([['candidates searched',String(count)],['best on train',best.train.toFixed(3)],['same one on test',test.toFixed(3)]]));
      const inspect=h('div',{class:'tw-inspect noise-inspect'});
      const show=(row:{seed:number;train:number})=>inspect.replaceChildren(h('strong',{},`Candidate seed ${row.seed}`),h('p',{},`Mean training rank IC ${row.train.toFixed(6)}. ${row===best?'This is the winner chosen from the searched window. Its one test score is '+test.toFixed(6)+'.':'This candidate was not chosen; its test score is not calculated for this comparison.'}`));show(best);
      const ordered=rows.map((r,i)=>({...r,index:i})).sort((a,b)=>b.train-a.train),table=recordTable(['rank','seed','train rank IC'],ordered.map((r,i)=>[i+1,r.seed,r.train.toFixed(6)]),'noise-candidates');
      table.querySelector('thead tr')!.append(h('th',{scope:'col'},'inspect'));
      table.querySelectorAll('tbody tr').forEach((tr,i)=>{tr.setAttribute('data-chosen',String(ordered[i].index===chosen));tr.append(h('td',{},button('Inspect '+ordered[i].seed,()=>show(rows[ordered[i].index]))));});
      result.replaceChildren(h('p',{class:'lab-note'},'Each seed defines a different noise signal. The highlighted candidate wins on the searched training window; only that candidate is evaluated on the later test window.'),viz,inspect,h('p',{class:'lab-note'},'The test result is visible in this teaching audit. If you tune the seeds or search budget after looking at it, that window is no longer an untouched test. A high searched score alone does not establish predictive skill.'),h('details',{class:'we-ledger'},h('summary',{},'Inspect every searched candidate'),table));
    }catch(e){clear();seedInput.setAttribute('aria-invalid','true');error.textContent=e instanceof Error?e.message:String(e);}
  }
  stage.append(result);
  controls.append(h('label',{class:'ctl'},h('span',{class:'ctl-l mono'},'candidate seed offset'),seedInput),error,button('Run search',draw),slider('random formulas searched',1,60,1,count,String,v=>{count=v;draw();}),exportButton,ro);draw();
}
