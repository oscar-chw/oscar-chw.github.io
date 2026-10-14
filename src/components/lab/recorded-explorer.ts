import {STUDIES,recordedSelection,type Study} from '../../lib/recorded-studies';
import {h,button,chart,css} from './ui';
import {recordTable,chartCursor} from './records-editor';
import './recorded-explorer.css';
export function mountRecordedExplorer(host:HTMLElement){
  let study:Study='validation',variant='shuffled',metric=0,current=recordedSelection(study,variant);
  const studySelect=h('select',{'aria-label':'Recorded study'},...Object.entries(STUDIES).map(([id,s])=>h('option',{value:id},s.title))),assumption=h('select',{'aria-label':'Recorded assumption'}),metricSelect=h('select',{'aria-label':'Recorded metric'}),result=h('div',{});
  const fillVariants=()=>assumption.replaceChildren(...STUDIES[study].variants.map(v=>h('option',{value:v},v)));
  const fillMetrics=()=>metricSelect.replaceChildren(...current.metrics.map((m,i)=>h('option',{value:String(i)},m.name)));
  function draw(){
    current=recordedSelection(study,variant);const m=current.metrics[metric],max=Math.max(...m.values.map(x=>Math.abs(x.value)),1e-12);
    const bars=h('div',{class:'recorded-bars'},...m.values.map((x,i)=>h('div',{class:'recorded-row'},h('span',{},x.label),h('span',{class:'recorded-track','aria-hidden':'true'},h('i',{style:`--w:${Math.abs(x.value)/max*48}%;--side:${x.value<0?'-100%':'0%'};--color:var(${i?'--accent':'--muted'})`})),h('b',{class:'mono'},x.value.toPrecision(6)))));
    result.replaceChildren(h('p',{class:'recorded-insight'},current.insight),h('p',{class:'ctl-l mono'},m.name),bars,h('p',{class:'lab-note'},`Shared bar scale: −${max.toPrecision(4)} to +${max.toPrecision(4)}. The centre is zero. Values are recorded summaries.`));
    if(current.paths.length){
      const plot=chart(study==='kelly'?'Recorded drawdown quantiles for the true-edge case':'Recorded paired path accuracies');plot.draw(current.paths.map((p,i)=>({values:p.values,label:p.label,color:css(i?'--accent':'--muted')})));
      const n=current.paths[0].values.length,cursor=chartCursor(plot.el,n),index=h('input',{type:'range',min:'0',max:String(n-1),value:'0','aria-label':'Inspect recorded observation'}),inspect=h('p',{class:'tw-inspect'});
      const show=()=>{const i=Number(index.value);cursor(i);inspect.textContent=`${study==='kelly'?'Recorded quantile '+(i+1)+'%':'Recorded path '+(i+1)}: `+current.paths.map(p=>`${p.label} ${p.values[i].toFixed(6)}`).join(' · ');};index.addEventListener('input',show);show();
      result.append(plot.el,h('label',{class:'tw-scrub'},'Inspect a recorded observation',index),inspect);
    }else result.append(h('p',{class:'lab-note'},'Only summary measurements are available for this selection; no unrecorded path is invented.'));
    result.append(h('details',{class:'we-ledger'},h('summary',{},'Inspect every recorded summary'),recordTable(['metric','arm','recorded value'],current.metrics.flatMap(m=>m.values.map(x=>[m.name,x.label,x.value])))),h('details',{class:'we-ledger'},h('summary',{},'Source record and method'),h('pre',{class:'recorded-source mono'},JSON.stringify(current.raw,null,2))),h('a',{href:current.source.url},`${current.id} · pinned source ${current.source.commit} ↗`));
  }
  studySelect.addEventListener('change',()=>{study=studySelect.value as Study;variant=STUDIES[study].variants[0];metric=0;current=recordedSelection(study,variant);fillVariants();fillMetrics();draw();});
  assumption.addEventListener('change',()=>{variant=assumption.value;draw();});metricSelect.addEventListener('change',()=>{metric=Number(metricSelect.value);draw();});
  const reset=()=>{study='validation';variant='shuffled';metric=0;studySelect.value=study;current=recordedSelection(study,variant);fillVariants();fillMetrics();draw();};
  host.append(h('p',{class:'mono'},'RECORDED · calculations inspect archived results; the original experiments do not run here'),h('div',{class:'recorded-controls'},h('label',{},'Recorded study',studySelect),h('label',{},'Recorded assumption',assumption),h('label',{},'Recorded metric',metricSelect)),h('div',{class:'we-actions'},button('Export recorded comparison',()=>{const href=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)+'\n'],{type:'application/json'}));h('a',{href,download:current.id+'-comparison.json'}).click();setTimeout(()=>URL.revokeObjectURL(href),1000);}),button('Reset recorded explorer',reset)),result);
  fillVariants();fillMetrics();draw();
}
