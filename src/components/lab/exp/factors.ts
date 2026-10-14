import {panel,SPLITS} from '../../../lib/lab/factors';
import {ranks,spearman} from '../../../lib/lab/series';
import {parseCandidates,factorStudy,candidateSignal,CANDIDATE_TEMPLATE,type Candidate} from '../../../lib/lab/studies';
import {recordsEditor,recordTable} from '../records-editor';
import {h,button,segmented,selectSegment} from '../ui';
import {Shuffle} from 'lucide';
export function mount(stage:HTMLElement,controls:HTMLElement){
  let seed=4,reveal='hidden',signature='';const result=h('div',{});
  const revealControl=segmented('test window',['hidden','open the chosen one'],reveal,v=>{reveal=v;editor.run();});
  const dirty=()=>{reveal='hidden';selectSegment(revealControl,reveal);result.replaceChildren(h('p',{class:'lab-note'},'Score the current candidates before inspecting validation or test.'));};
  function draw(candidates:Candidate[]){
    const key=JSON.stringify([seed,candidates]);if(key!==signature){reveal='hidden';selectSegment(revealControl,reveal);signature=key;}
    const p=panel(seed),study=factorStudy(p,candidates,reveal!=='hidden'),pick=study.rows[study.chosen],max=Math.max(1e-6,...study.rows.flatMap(r=>[Math.abs(r.train),Math.abs(r.validation),Math.abs(r.test??0)]));
    const bar=(v:number|null,cls:string)=>h('span',{class:`icb ${cls}${v===null?' sealed':''}`,style:`--w:${Math.abs(v??0)/max*50}%;--s:${(v??0)<0?-1:1}`},h('b',{class:'mono'},v===null?'sealed':v.toFixed(3)));
    const grid=h('div',{class:'ics'},h('div',{class:'ic-head mono'},h('span',{},'candidate'),h('span',{},'train'),h('span',{},'validation'),h('span',{},'test')),...study.rows.map((r,i)=>h('div',{class:`ic-row${i===study.chosen?' pick':''}`},h('span',{class:'mono'},r.name+(i===study.chosen?' ← chosen on validation':'')),bar(r.train,'tr'),bar(r.validation,'va'),bar(r.test,'te'))));
    const summary=h('p',{class:'lab-result','aria-live':'polite'},reveal==='hidden'?`Chosen on validation: ${pick.name}. Its test score stays sealed until you open it; test values do not affect the scale or choice.`:`Chosen on validation: ${pick.name}; its one test score is ${pick.test!.toFixed(3)}. Other candidates remain sealed.`);
    const pairs=h('div',{}),index=h('input',{type:'range',min:'60',max:reveal==='hidden'?'448':'598',value:'60',step:'1','aria-label':'Inspect scoring day'});
    const inspect=()=>{const day=Number(index.value),signal=candidateSignal(candidates[study.chosen]),x=p.rets[day].map((_,asset)=>signal(p,day,asset)),y=p.rets[day+1],rx=ranks(x),ry=ranks(y);pairs.replaceChildren(h('p',{class:'lab-note'},`${pick.name}: signal through day ${day} versus returns on day ${day+1}. Daily rank IC ${spearman(x,y).toFixed(6)}. Inspect every asset below.`),h('details',{class:'we-ledger'},h('summary',{},'Asset-level signal and outcome pairs'),recordTable(['asset','signal','signal rank','next return','return rank'],x.map((v,i)=>[i,v.toFixed(6),rx[i],y[i].toFixed(6),ry[i]]),'factor-pairs')));};index.addEventListener('input',inspect);inspect();
    result.replaceChildren(grid,summary,h('label',{class:'tw-scrub'},'Inspect the chosen candidate’s daily calculation',index),pairs,h('p',{class:'lab-note'},'Train and validation use fixed earlier windows. A new candidate set or market reseals the test. This is an educational interface, not access control or a claim of predictive performance.'));
    return {...study,candidates,seed,splits:SPLITS};
  }
  const editor=recordsEditor({label:'Candidate windows CSV',initial:CANDIDATE_TEMPLATE,invalid:'window,direction\n0,1\n',runLabel:'Score candidates',parse:parseCandidates,compute:draw,dirty});stage.append(editor.el,result);
  controls.append(h('p',{class:'lab-note'},'Window is the number of past observations. Direction 1 is momentum; -1 reverses it. Selection uses validation rank IC, never the unopened test.'),revealControl,button('new random market',()=>{seed++;editor.run();},'',Shuffle));editor.run();
}
