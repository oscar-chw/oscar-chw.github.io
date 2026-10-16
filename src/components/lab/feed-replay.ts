import {h,button} from './ui';
import './feed-replay.css';

export interface AdmittedRow {sequence:number;event_ms:number|null;received_ms:number;available_ms:number;status:string;bid_tick:number|null;ask_tick:number|null;bid_size:number|null;ask_size:number|null}
export function feedReplay(rows:AdmittedRow[],text:string) {
  const el=h('section',{class:'fr-replay',role:'region','aria-label':'Admitted book replay'});
  if(!rows.length){el.append(h('p',{},'No admitted rows to replay.'));return el;}
  const records=text.trim().split(/\r?\n/),maxSize=Math.max(1,...rows.flatMap(r=>[r.bid_size??0,r.ask_size??0]));
  let at=0;
  const cursor=h('input',{type:'range',min:'0',max:String(rows.length-1),step:'1',value:'0','aria-label':'Admitted record'});
  const prev=button('Previous admitted record',()=>show(at-1)),next=button('Next admitted record',()=>show(at+1));
  const state=h('p',{class:'fr-state mono','data-record-state':'',role:'status'});
  const book=h('div',{class:'fr-book'}),clocks=h('div',{class:'fr-clocks','data-record-clocks':''});
  const source=h('pre',{class:'fr-source mono','data-record-source':'','data-lenis-prevent':''});
  const returned=h('pre',{class:'fr-source mono','data-lenis-prevent':''});
  const steps=h('div',{class:'fr-steps','aria-label':'Admitted record states'});
  function show(index:number) {
    at=Math.max(0,Math.min(rows.length-1,index));cursor.value=String(at);
    const r=rows[at];prev.disabled=at===0;next.disabled=at===rows.length-1;
    cursor.setAttribute('aria-valuetext',`Record ${r.sequence}, ${r.status}, available at ${r.available_ms} milliseconds`);
    state.textContent=`Record ${r.sequence} · ${at+1} of ${rows.length} · ${r.status}`;
    steps.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===at)));
    clocks.replaceChildren(...[['Venue event',r.event_ms],['Local receipt',r.received_ms],['Available to query',r.available_ms]].map(([label,v])=>h('div',{},h('span',{},String(label)),h('b',{class:'mono'},v===null?'not supplied':`${v} ms`))));
    source.textContent=`Input line ${r.sequence+2}\n${JSON.stringify(JSON.parse(records[r.sequence+1]),null,2)}`;
    returned.textContent=JSON.stringify(r,null,2);
    if(r.status!=='AVAILABLE') {
      book.replaceChildren(h('div',{class:'fr-gap'},h('b',{},`${r.status} · No usable book`),h('p',{},'The Python result supplies no quotes for this state. The previous book is not carried across the gap.')));
      return;
    }
    const side=(name:'bid'|'ask',tick:number|null,size:number|null)=>h('div',{class:`fr-side ${name}`,'data-book-side':name},
      h('span',{class:'ctl-l mono'},`Best ${name}`),
      h('strong',{class:'fr-price mono'},tick===null?'No quote':(tick/10000).toFixed(4)),
      h('span',{class:'mono'},size===null?'No size':`${(size/100).toFixed(2)} units`),
      h('div',{class:'fr-depth-track','aria-hidden':'true'},h('i',{'data-depth':name,style:`width:${(size??0)/maxSize*100}%`})));
    book.replaceChildren(side('bid',r.bid_tick,r.bid_size),side('ask',r.ask_tick,r.ask_size));
    book.append(h('p',{class:'fr-spread mono'},r.bid_tick===null||r.ask_tick===null?'A two-sided spread is unavailable.':`Spread ${((r.ask_tick-r.bid_tick)/10000).toFixed(4)}`));
  }
  steps.append(...rows.map((r,i)=>{
    const b=button(`${r.sequence} · ${r.status}`,()=>show(i));b.setAttribute('aria-label',`Show admitted record ${r.sequence}`);return b;
  }));
  cursor.addEventListener('input',()=>show(Number(cursor.value)));
  el.append(h('h3',{},'Replay the admitted book'),
    h('p',{class:'lab-note'},'Move through the actual Python return values. The bars show returned best-quote sizes on one fixed scale across this archive, not invented depth or a live exchange.'),
    steps,h('label',{class:'ctl'},h('span',{class:'ctl-l mono'},'Inspect an admitted record'),cursor),
    h('div',{class:'fr-actions'},prev,next),state,clocks,book,
    h('details',{open:''},h('summary',{},'The input behind this state'),source),
    h('details',{},h('summary',{},'This returned Python row'),returned));
  show(0);return el;
}
