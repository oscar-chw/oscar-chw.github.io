import {parseRiskCases,evaluateRiskCases,RISK_TEMPLATE,type RiskCases} from '../../../lib/lab/decisions';
import {recordsEditor,recordTable} from '../records-editor';
import {h,slider,button,segmented,readout} from '../ui';
import {ShieldOff} from 'lucide';

export function mount(stage:HTMLElement,controls:HTMLElement){
  let target=0.05,noGate=false,view:'calibration'|'evaluation'='evaluation';
  const result=h('div',{}),ro=h('div',{});
  const dirty=()=>{result.replaceChildren(h('p',{class:'lab-note'},'No calibration result for this input. Run the labelled cases.'));ro.replaceChildren();};
  function draw(data:RiskCases){
    const out=evaluateRiskCases(data,target,noGate),rows=data[view],stats=out[view];
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 760 200');svg.setAttribute('class','chart');svg.setAttribute('role','img');svg.setAttribute('aria-label','Supplied action risk scores and empirical gate threshold; vertical spacing is display jitter');
    const threshold=out.threshold>1?'all eligible':out.threshold.toFixed(6);
    ro.replaceChildren(readout([['threshold',threshold],['evaluation violations / all proposals',`${(out.evaluation.violationRate*100).toFixed(1)}%`],['evaluation abstained',`${(out.evaluation.abstainRate*100).toFixed(1)}%`]]));
    const selection=h('select',{'aria-label':'Inspect action'},...rows.map((r,i)=>h('option',{value:String(i)},`${view} ${i+1} · risk ${r.risk}`)));
    const inspect=h('div',{class:'tw-inspect gate-inspect','aria-live':'polite'});
    const show=()=>{
      const index=Number(selection.value),r=rows[index],acted=r.risk<out.threshold;
      inspect.classList.toggle('bad',acted&&r.breaks);
      inspect.replaceChildren(h('strong',{},`${view} action ${index+1}: ${acted?'Act':'Abstain'}`),h('p',{},`Risk ${r.risk} is ${acted?'below':'at or above'} the threshold (${threshold}). This labelled action ${r.breaks?'breaks a rule':'does not break a rule'}.`));
      svg.innerHTML=rows.map((r,i)=>`<circle cx="${20+r.risk*720}" cy="${24+i*37%145}" r="${i===index?7:4}" class="${r.breaks?'brk':'ok'}${r.risk>=out.threshold?' held':''}" ${i===index?'stroke="currentColor" stroke-width="2"':''}/>`).join('')+`<line x1="${20+Math.min(1,out.threshold)*720}" x2="${20+Math.min(1,out.threshold)*720}" y1="6" y2="182" class="tau"/>`;
    };selection.addEventListener('change',show);show();
    result.replaceChildren(h('div',{class:'gate-summary',role:'status'},
      h('p',{class:'lab-result'},`Evaluation: ${out.evaluation.violations} of ${data.evaluation.length} proposals broke a rule and were allowed through. ${out.evaluation.abstained} were abstained.`),
      h('p',{},`Calibration: ${out.calibration.violations} of ${data.calibration.length} proposals violated after gating; target ${(target*100).toFixed(0)}%. Threshold: ${threshold}.`)),
      h('p',{class:'lab-note'},'This is an empirical threshold fit, not a conformal guarantee. The target denominator is all proposals. A different evaluation sample can exceed it; only its supplied labels determine the measured result.'),svg,h('div',{class:'we-scale mono'},h('span',{},'risk 0'),h('span',{},'risk 1')),
      h('label',{class:'tw-scrub'},'Inspect an action and its decision',selection),inspect,
      h('p',{class:'lab-note'},`${view}: ${stats.acted} allowed, ${stats.violations} violating. Among allowed actions the violation fraction is ${stats.acted?(stats.violations/stats.acted*100).toFixed(1)+'%':'undefined (none allowed)'}. This differs from violations divided by all proposals.`),
      h('details',{class:'we-ledger'},h('summary',{},`All ${view} verdicts`),recordTable(['action','risk','label: rule break','gate verdict'],rows.map((r,i)=>[i+1,r.risk,String(r.breaks),r.risk<out.threshold?'ACT':'ABSTAIN']))));
    return {...out,input:data};
  }
  const editor=recordsEditor({label:'Labelled actions JSON',format:'json',initial:RISK_TEMPLATE,invalid:'{"calibration":[{"risk":2,"breaks":false}],"evaluation":[{"risk":0.2,"breaks":true}]}',runLabel:'Calibrate and evaluate',parse:parseRiskCases,compute:draw,dirty});
  stage.append(editor.el,result);
  controls.append(slider('target: rule breaks at most',0,0.2,0.01,target,v=>`${(v*100).toFixed(0)}%`,v=>{target=v;noGate=false;editor.run();}),
    h('p',{class:'lab-note'},'Target applies to the calibration sample, as violations divided by all its proposals. It is not a promised evaluation rate.'),
    segmented('inspect dataset',['calibration','evaluation'],view,v=>{view=v as typeof view;editor.run();}),
    button('no gate (act on everything)',()=>{noGate=true;editor.run();},'',ShieldOff),ro);
  editor.run();
}
