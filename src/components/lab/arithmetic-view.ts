import {h,button} from './ui';
import type {ArithmeticTrace} from '../../lib/lab/kahan-trace';
import './arithmetic-view.css';

const value=(n:number)=>Object.is(n,-0)?'-0':n===0?'0':n.toPrecision(17);
export function arithmeticView() {
  const el=h('section',{class:'cp-execution','data-execution-view':'','aria-label':'Arithmetic execution paths'});
  const lanes=h('div',{class:'cp-lanes'});
  const inspector=h('div',{class:'cp-inspector','data-trace-inspector':'',role:'status'});
  const reference=h('p',{class:'cp-reference mono'});
  let trace:ArithmeticTrace,selected='ab';
  const inspect=(id:string)=>{
    selected=id;const s=trace.steps.find(s=>s.id===id)!;
    lanes.querySelectorAll('[data-operation]').forEach(n=>n.setAttribute('aria-pressed',String(n.getAttribute('data-operation')===id)));
    inspector.replaceChildren(h('p',{class:'ctl-l mono'},`Inside ${s.label.toLowerCase()}`),
      h('p',{},s.why),h('p',{class:'cp-inspect-value mono'},`${s.formula} = ${value(s.value)}`),
      ...(s.discarded===undefined?[]:[h('p',{},'Product residual discarded at this rounding: ',h('b',{class:'mono'},value(s.discarded)),'.')]),
      h('p',{class:'lab-note'},'Actual IEEE-754 bits of this stored result · sign, exponent, fraction'),
      h('div',{class:'cp-bit-grid mono','data-trace-bits':'','aria-label':`Binary64 representation: ${s.bits}`},
        ...s.bits.match(/.{8}/g)!.map((byte,i)=>h('span',{'aria-hidden':'true',class:i<2?'cp-bit-head':''},byte))),
      h('p',{class:'lab-note'},'Select an operation above to inspect its value and representation. The trace uses your current operands.'));
  };
  el.append(h('h3',{},'Follow the arithmetic'),h('p',{class:'lab-note'},'Two execution paths, the same operands. Each node contains a value computed from your input; select a node to look inside.'),lanes,reference,inspector);
  return {el,set(next:ArithmeticTrace){
    trace=next;el.hidden=false;
    lanes.replaceChildren(...(['plain','compensated'] as const).map(path=>h('section',{class:`cp-lane ${path}`,'aria-label':`${path} execution path`},
      h('h4',{},path==='plain'?'Round, round, subtract':'Keep the rounding residual'),
      ...trace.steps.filter(s=>s.path===path).map((s,i)=>{
        const node=button('',()=>inspect(s.id),'cp-op');node.dataset.operation=s.id;
        node.setAttribute('aria-label',`${path}: ${s.label}`);
        node.append(h('span',{class:'cp-step mono'},String(i+1).padStart(2,'0')),h('span',{class:'cp-op-body'},h('b',{},s.label),h('span',{class:'mono'},s.formula),h('strong',{class:'mono','data-value':''},value(s.value))));
        return node;
      }))));
    reference.textContent=`Exact reference for these binary inputs: ${trace.referenceExact}`;
    inspect(selected);
  }};
}
