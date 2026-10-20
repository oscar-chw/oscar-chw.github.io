import { chain, ready, runGate, claimDone } from '../../../lib/lab/gatedbuild';
import { h, segmented, selectSegment, button } from '../ui';
import { Play, Download, RotateCcw } from 'lucide';
import {FEED_EXAMPLES, BROKEN_CLOCK, CORRECT_TEMPLATE} from '../../../lib/feed-examples';
import {feedReplay,type AdmittedRow} from '../feed-replay';

type Row = AdmittedRow;
type Result = {accepted:boolean; message?:string; errorType?:string; input_sha256:string; rows?:Row[]; report?:{records:number; source_sha256:string; exchange_completeness_verified:boolean}};
type Engine = {run:(s:string)=>Result; source:{commit:string; files:Record<string,{sha256:string;url:string}>}};
const SOURCE='https://github.com/oscar-chw/agentic-quant-research/blob/f8c48256e12b96523807ba8f59c04b798517e04e/platform/packages/marketdata/';
const TITLES=['Read these bytes','Parse the records','Verify and load Python','Run archive admission','Check the output receipt'];
const GATES=['non-empty · bounded input','each line is a JSON object','pinned source checksums match','replay.admission.admit(input)','returned row count and input digest agree'];
const fresh=()=>chain().map((t,i)=>({...t,title:TITLES[i],gate:GATES[i]}));

export function mount(stage:HTMLElement,controls:HTMLElement) {
  stage.dataset.computation='not-run';
  let tasks=fresh(), revision=0, busy=false, engine:Engine|undefined, result:Result|null=null;
  let loader:{loadFeed:(base:string)=>Promise<Engine>}|undefined, loadAttempt=0;
  const history:{input:string;result:Result}[]=[];
  const base=document.querySelector<HTMLElement>('[data-lab]')!.dataset.base!;
  const input=h('textarea',{class:'fg-input mono','aria-label':'Archive JSON lines',spellcheck:'false','data-lenis-prevent':''});input.value=BROKEN_CLOCK.input;
  const title=h('p',{class:'fg-kicker mono'},BROKEN_CLOCK.title), hint=h('p',{},BROKEN_CLOCK.hint);
  const inputState=h('p',{class:'fg-input-state mono'},'Starting fixture · editable input');
  const importStatus=h('p',{class:'fg-import-status',role:'status'});
  const verdict=h('p',{class:'fg-verdict',role:'status'},'Not run · inspect the timestamp, then run the checks.');
  const output=h('div',{class:'fg-result'}), explanation=h('p',{class:'fg-explain'});
  const list=h('ol',{class:'gb mono'}), msg=h('p',{class:'gb-msg mono',role:'status'},'No checks have run.');
  const clock=h('div',{class:'fg-clock','aria-label':'Selected record clocks'});
  const archive=h('details',{class:'fg-history'},h('summary',{},'Previous runs in this visit'));
  const historyBody=h('div',{});archive.append(historyBody);
  const download=button('Download run receipt',()=>{
    if(!result||!engine)return;
    const receipt={execution:'Python/WebAssembly in this browser',data:'Visitor-supplied archive; starter fixtures are synthetic and clocks are not authenticated',source:engine.source,input:input.value,result};
    const href=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)+'\n'],{type:'application/json'}));
    const a=h('a',{href,download:'feed-admission-receipt.json'});a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  },'',Download);

  function read() {
    const text=input.value;
    if(!text.trim())throw new Error('The archive is empty. Add the header and records, or start over.');
    if(new TextEncoder().encode(text).length>64*1024)throw new Error('Use at most 64 KB of input.');
    if(text.split(/\r?\n/).filter(s=>s.trim()).length>201)throw new Error('Use at most 200 records plus the header.');
    return text;
  }
  function parse(text:string):Record<string,any>[] {
    return text.trim().split(/\r?\n/).map((line,i)=>{
      try {const row=JSON.parse(line);if(!row||typeof row!=='object'||Array.isArray(row))throw new Error();return row;}
      catch {throw new Error(`Line ${i+1}: expected a JSON object. The Python check has not run.`);}
    });
  }
  function drawClocks() {
    try {
      const rows=parse(input.value), row=rows.find(r=>typeof r.received_ms==='number'&&r.available_ms<r.received_ms)??rows.at(-1)!;
      clock.replaceChildren(...[['event at venue',row.message?.timestamp??'—'],['received locally',row.received_ms??'—'],['available to query',row.available_ms??'—']].map(([label,value],i)=>h('div',i===2&&row.available_ms<row.received_ms?{'data-invalid':'true'}:{},h('span',{},String(label)),h('b',{class:'mono'},`${value} ms`))));
    } catch {clock.replaceChildren(h('p',{},'Clock comparison appears when the input is valid JSON.'));}
  }
  function draw() {
    const active=document.activeElement?.getAttribute('data-gate'), r=ready(tasks);
    list.replaceChildren(...tasks.map(t=>{
      const state=t.state==='done'?'done':r.includes(t.id)?'ready':'blocked';
      const run=button('run gate',()=>void execute(t.id),'',Play);run.dataset.gate=String(t.id);run.disabled=busy||state!=='ready';
      return h('li',{class:`gb-t ${state}`},h('span',{class:'gb-n'},String(t.id).padStart(2,'0')),
        h('span',{class:'gb-b'},h('b',{},t.title),h('span',{class:'gb-g'},t.gate),...t.evidence.map(e=>h('span',{class:'gb-e'},e))),h('span',{class:'gb-s'},state),run);
    }));
    if(active)list.querySelector<HTMLButtonElement>(`[data-gate="${active}"]`)?.focus();
    runAll.disabled=busy;download.disabled=busy||!result;
    archive.hidden=!history.length;
    historyBody.replaceChildren(...history.slice(-3).reverse().map(run=>h('div',{},h('b',{},run.result.accepted?'Accepted by admit':'Rejected by admit'),h('p',{},run.result.message??'The returned archive passed the admission checks.'),h('pre',{class:'mono'},run.input))));
  }
  function invalidate(reset=false) {
    const completed=new Set(tasks.filter(t=>t.state==='done').map(t=>t.id));
    revision++;busy=false;result=null;tasks=fresh();
    // Input edits rerun cheap preparation, never retain the old Python verdict.
    if(!reset)try {
      read();if(completed.has(1))tasks=runGate(tasks,1,true,'').tasks;
      parse(input.value);if(completed.has(2))tasks=runGate(tasks,2,true,'').tasks;
      if(completed.has(3)&&engine)tasks=runGate(tasks,3,true,'').tasks;
    } catch { /* The visible run reports this preparation error; no result is retained. */ }
    verdict.textContent='Not run · input changed; run the checks on these bytes.';
    output.replaceChildren();explanation.textContent='';msg.textContent='No current Python result. Previous runs remain below.';
    stage.dataset.computation='not-run';drawClocks();draw();
  }
  function renderResult(out:Result,text:string) {
    result=out;history.push({input:text,result:out});if(history.length>3)history.shift();
    stage.dataset.computation='python';
    const unavailable=out.rows?.filter(r=>r.status!=='AVAILABLE').length??0;
    verdict.textContent=out.accepted?(unavailable?`Accepted by admit · ${unavailable} unavailable record${unavailable===1?'':'s'}; inspect their states`:'Accepted by admit · inspect the returned rows'):'Rejected by admit · no book rows returned';
    output.replaceChildren();
    if(!out.accepted) {
      output.append(h('pre',{class:'fg-error mono'},`${out.errorType}: ${out.message}`));
      const rows=parse(text), bad=rows.find(r=>typeof r.received_ms==='number'&&r.available_ms<r.received_ms);
      explanation.textContent=bad?`Record ${bad.record_id} claims it was available at ${bad.available_ms} ms, before it arrived at ${bad.received_ms} ms. A historical query could read data too early. Correct the source timestamp, then rerun; changing a badge cannot repair the record.`
        :out.message?.includes('grid')?'A price or size cannot be represented on the validator’s exact grid. Inspect the decimal strings in the input. In the off-grid example, changing 0.49001 to 0.49 repairs the price; the rerun, not the example selector, decides the result.'
        :'The Python validator refused these bytes. Inspect its exact reason and the raw input; nothing was silently skipped.';
    } else {
      output.append(feedReplay(out.rows??[],text));
      explanation.textContent=unavailable?'The declared archive is valid, but unavailable rows are preserved. A disconnect cannot be filled with a guessed book. Check each row’s state before using it in research; acceptance does not mean every interval has data.':'These rows were computed by the pinned Python code. An update replaces the size at its price; it does not add another order. Acceptance validates this archive format and its declared clocks, not the truth of those clocks or a trading strategy.';
      const last=out.rows?.at(-1);
      if(last)output.append(h('p',{class:'fg-book mono'},last.status==='AVAILABLE'
        ? `Record ${last.sequence} · available at ${last.available_ms} ms: bid ${((last.bid_tick??0)/10000).toFixed(2)} × ${((last.bid_size??0)/100).toFixed(2)}; ask ${((last.ask_tick??0)/10000).toFixed(2)} × ${((last.ask_size??0)/100).toFixed(2)}.`
        : `Record ${last.sequence} is ${last.status}. No usable book is supplied for that record.`));
      const table=h('table',{class:'fg-output'},h('thead',{},h('tr',{},...['Record','Available ms','State','Bid','Bid size','Ask'].map(s=>h('th',{scope:'col'},s)))));
      const display=(n:number|null|undefined,scale:number)=>n==null?'—':(n/scale).toFixed(2);
      table.append(h('tbody',{},...(out.rows??[]).map(r=>h('tr',{},...[
        String(r.sequence),String(r.available_ms),r.status,display(r.bid_tick,10000),display(r.bid_size,100),display(r.ask_tick,10000)
      ].map(s=>h('td',{class:'mono'},s))))));
      output.append(h('div',{class:'fg-scroll','data-lenis-prevent':''},table));
    }
    output.append(h('details',{},h('summary',{},'Exact Python return value'),h('pre',{class:'fg-json mono','data-lenis-prevent':''},JSON.stringify(out,null,2))));
  }
  async function perform(id:number,token:number) {
    const text=input.value;
    try {
      if(id===1)read();
      if(id===2)parse(read());
      if(id===3) {
        msg.textContent='Loading Python/WebAssembly and verifying the public source checksums…';
        verdict.textContent='Preparing Python · the first run downloads the runtime. Your input stays here.';
        loader??=await import(/* @vite-ignore */ `${base.replace(/\/$/,'')}/lab/feed-runtime.js${loadAttempt++?`?retry=${loadAttempt}`:''}`);
        engine=await loader!.loadFeed(base);if(token!==revision)return false;
      }
      let pass=true,note='';
      if(id===4) {
        result=null;output.replaceChildren();explanation.textContent='';
        const out=engine!.run(text);renderResult(out,text);pass=out.accepted;
        note=`${out.errorType}: ${out.message}`;
      }
      if(id===5) {
        pass=!!result?.accepted&&result.report?.records===result.rows?.length&&result.report?.source_sha256===result.input_sha256;
        note='The returned row count or source digest does not match the result.';
      }
      tasks=runGate(tasks,id,pass,note).tasks;
      msg.textContent=pass?`${TITLES[id-1]} passed on this input.`:`Check ${id} refused this input. Later steps remain blocked.`;
      return pass;
    } catch(error) {
      if(token!==revision)return false;
      const detail=error instanceof Error?error.message:String(error);
      tasks=runGate(tasks,id,false,detail).tasks;
      result=null;
      verdict.textContent=id>=3?'Unavailable · Python execution did not complete':'Input error · no accepted result';
      output.replaceChildren(h('p',{role:'alert'},id>=3?`Python could not complete this run. ${detail} Use Run all checks to retry.`:detail));
      msg.textContent=`Check ${id} did not pass.`;
      stage.dataset.computation='not-run';
      return false;
    }
  }
  async function execute(only?:number) {
    if(busy)return;
    const token=revision;busy=true;draw();
    try {
      if(only) {if(ready(tasks).includes(only))await perform(only,token);}
      else {
        // A new all-checks run recomputes input preparation as well as the Python result.
        tasks=fresh();result=null;output.replaceChildren();explanation.textContent='';
        verdict.textContent='Running checks on the visible input…';
        for(let id=1;id<=5;id++) {if(token!==revision||!await perform(id,token))break;draw();}
      }
    } finally {if(token===revision){busy=false;draw();if(!only)verdict.scrollIntoView({block:'start',behavior:'instant'});}}
  }
  const runAll=button('Run all checks',()=>void execute(),'primary',Play);
  input.addEventListener('input',()=>{inputState.textContent='Edited input · run checks on these bytes';title.textContent='Your edited archive.';hint.textContent='The starting example is only a template. Run admission on these visible bytes, inspect the returned states and repair any error reported by Python.';importStatus.textContent='';invalidate();});
  const file=h('input',{type:'file',accept:'.jsonl,.ndjson,.json,text/plain,application/json','aria-label':'Import archive file'});
  file.addEventListener('change',async()=>{
    const chosen=file.files?.[0];if(!chosen)return;
    invalidate();const token=revision;importStatus.textContent='Reading local file…';
    try {
      if(chosen.size>64*1024)throw new Error('Use a file of at most 64 KB. The visible input was not replaced.');
      const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await chosen.arrayBuffer());
      if(token!==revision)return;
      input.value=text;invalidate();inputState.textContent=`Local input: ${chosen.name} · not yet checked`;
      importStatus.textContent='Loaded locally; run the Python check to validate it.';
      title.textContent='Inspect and validate your own archive.';hint.textContent='The imported bytes are visible below. The same validator runs on this input; the starting-example selector is not a verdict.';
    } catch(error) {
      if(token!==revision)return;
      importStatus.textContent=error instanceof TypeError?'Import failed: the file must be valid UTF-8 text. The visible input was not replaced.':error instanceof Error?error.message:String(error);
    } finally {file.value='';}
  });
  const template=button('Download correct template',()=>{
    const href=URL.createObjectURL(new Blob([CORRECT_TEMPLATE],{type:'application/x-ndjson'}));
    h('a',{href,download:'feed-archive-template.jsonl'}).click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  },'',Download);
  const why=h('details',{class:'fg-contract'},h('summary',{},'What actually runs?'),
    h('p',{},'The published replay.admission.admit function runs as Python/WebAssembly in this browser. It reads every JSON line, validates clock order and reconstructs book states. No pytest process, AI reviewer, exchange connection or GPU job is being claimed.'));
  const trace=h('details',{class:'fg-trace',...(matchMedia('(min-width: 801px)').matches?{open:''}:{})},h('summary',{},'Inspect individual checks'),list,msg,
    h('p',{class:'lab-note'},'Negative control: claiming completion cannot change any of the computed evidence.'),
    button('agent: "the next task is done"',()=>{const id=ready(tasks)[0];msg.textContent=id?claimDone(tasks,id).error:'All checks already have results; this button never runs a check.';}));
  stage.append(h('div',{class:'fg-workspace'},title,hint,
    clock,inputState,h('label',{},h('span',{class:'ctl-l mono'},'Editable archive · JSON lines'),input),
    verdict,explanation,output,h('p',{class:'fg-source'},h('a',{href:SOURCE+'replay/admission.py'},'Pinned Python source'),' · ',h('a',{href:SOURCE+'tests/test_admission.py'},'Upstream test cases')),why,trace,archive));
  controls.append(runAll,download,template,h('label',{class:'fg-import'},h('span',{},'Import archive file'),file),importStatus,
    h('p',{class:'lab-note'},'Python loads on first run. Inputs stay in this browser. The downloadable receipt contains your exact input and the actual result.'),
    segmented('Starting example · edit records below', FEED_EXAMPLES.map(e=>e.name),BROKEN_CLOCK.name,v=>{
      const example=FEED_EXAMPLES.find(e=>e.name===v)!;
      input.value=example.input;title.textContent=example.title;hint.textContent=example.hint;
      inputState.textContent='Starting fixture · editable input';importStatus.textContent='';invalidate();
    }),
    button('start over',()=>{input.value=BROKEN_CLOCK.input;title.textContent=BROKEN_CLOCK.title;hint.textContent=BROKEN_CLOCK.hint;inputState.textContent='Starting fixture · editable input';importStatus.textContent='';file.value='';history.length=0;selectSegment(controls,BROKEN_CLOCK.name);invalidate(true);},'',RotateCcw));
  drawClocks();draw();
}
