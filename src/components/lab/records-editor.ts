import {h,button} from './ui';
import {MAX_INPUT_BYTES} from '../../lib/lab/records';
import './records-editor.css';

const save=(name:string,text:string,type:string)=>{
  const href=URL.createObjectURL(new Blob([text],{type}));
  h('a',{href,download:name}).click();setTimeout(()=>URL.revokeObjectURL(href),1000);
};
export function recordsEditor<T>(config:{label:string;initial:string;invalid:string;runLabel:string;format?:'csv'|'json';parse:(text:string)=>T;compute:(rows:T)=>unknown;dirty:()=>void}){
  let revision=0,receipt:unknown=null;
  const format=config.format??'csv',mime=format==='csv'?'text/csv':'application/json';
  const id=config.label.toLowerCase().replace(/[^a-z]+/g,'-');
  const input=h('textarea',{class:'we-input mono',id,rows:'7',spellcheck:'false','data-lenis-prevent':'','aria-describedby':id+'-status'});input.value=config.initial;
  const status=h('p',{class:'we-status',id:id+'-status',role:'status'},'Edit the example or load a local file.');
  const exportButton=button('Export result',()=>{if(receipt)save(id+'-result.json',JSON.stringify(receipt,null,2)+'\n','application/json');});exportButton.disabled=true;
  function dirty(){revision++;receipt=null;exportButton.disabled=true;input.removeAttribute('aria-invalid');status.setAttribute('role','status');status.textContent='Input changed · run again to compute a new result.';config.dirty();}
  const setText=(text:string)=>{input.value=text;dirty();};
  input.addEventListener('input',dirty);
  function run(){
    receipt=null;exportButton.disabled=true;
    try{
      const result=config.compute(config.parse(input.value));
      receipt={execution:'Computed in this browser by the independent teaching implementation',input:input.value,result};
      input.removeAttribute('aria-invalid');status.setAttribute('role','status');status.textContent='Computed from the visible input. Inspect the result or export the full record.';exportButton.disabled=false;return true;
    }catch(error){
      config.dirty();input.setAttribute('aria-invalid','true');status.setAttribute('role','alert');
      status.textContent=error instanceof Error?error.message:'Could not compute this input.';input.focus();return false;
    }
  }
  const file=h('input',{type:'file',accept:`.${format},${mime},text/plain`,'aria-label':'Import '+config.label});
  file.addEventListener('change',async()=>{
    const chosen=file.files?.[0];if(!chosen)return;
    dirty();const token=revision;status.textContent='Reading local file…';
    try{
      if(chosen.size>MAX_INPUT_BYTES)throw new Error('Use a file of at most 64 KB. The editor was not replaced.');
      const text=new TextDecoder('utf-8',{fatal:true}).decode(await chosen.arrayBuffer());
      if(token!==revision)return;
      setText(text);status.textContent='Loaded locally. Run to validate and compute the visible input.';
    }catch(error){if(token!==revision)return;status.setAttribute('role','alert');status.textContent=error instanceof TypeError?'The file must be valid UTF-8 text. The editor was not replaced.':error instanceof Error?error.message:String(error);}
    finally{file.value='';}
  });
  const el=h('section',{class:'we-editor','aria-label':config.label+' workspace'},
    h('label',{for:id,class:'ctl-l mono'},config.label),input,status,
    h('div',{class:'we-actions'},button(config.runLabel,()=>{run();},'primary'),exportButton),
    h('details',{class:'we-examples',open:''},h('summary',{},'Examples, local files and template'),
      h('div',{class:'we-actions'},button('Load correct example',()=>setText(config.initial)),button('Load invalid example',()=>setText(config.invalid)),button('Download template',()=>save(id+'-template.'+format,config.initial,mime))),
      h('label',{class:'we-import'},h('span',{},'Import local '+format.toUpperCase()),file),
      h('p',{class:'lab-note'},'Input stays in this browser. Examples are synthetic; imported timestamps and values are not independently authenticated.')));
  return {el,input,status,setText,run};
}

export function recordTable(headers:string[],rows:(string|number|null)[][],className=''){
  return h('div',{class:'we-table-wrap',role:'region',tabindex:'0','aria-label':'Computed records; scroll for all columns','data-lenis-prevent':''},
    h('table',{class:'we-table '+className},h('thead',{},h('tr',{},...headers.map(s=>h('th',{scope:'col'},s)))),h('tbody',{},...rows.map(row=>h('tr',{},...row.map(s=>h('td',{},s===null?'—':String(s))))))));
}

export function chartCursor(svg:SVGSVGElement,count:number){
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('class','we-cursor');line.setAttribute('aria-hidden','true');
  line.setAttribute('y1','6');line.setAttribute('y2',String(svg.viewBox.baseVal.height-26));svg.append(line);
  return (index:number)=>{const x=40+index/Math.max(1,count-1)*(svg.viewBox.baseVal.width-56);line.setAttribute('x1',String(x));line.setAttribute('x2',String(x));};
}
