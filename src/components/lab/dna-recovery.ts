import {h,button} from './ui';
import './dna-recovery.css';
type Fragment={kind:'data'|'parity';index:number;record:{strand:string;byte_length:number;sha256:string}};
type Bundle={manifest:{byte_length:number;chunks:unknown[];parity:unknown[];sha256:string};fragments:Fragment[]};
type Result={ok:boolean;bundle?:Bundle;text?:string;report?:Record<string,unknown>;message?:string};
type Engine=(action:string,text:string)=>Result;
const EXAMPLE=('A small file can survive a missing fragment. 🦉\n').repeat(25);
export function mountRecovery(stage:HTMLElement,controls:HTMLElement){
  const base=document.querySelector<HTMLElement>('[data-lab]')!.dataset.base!;
  let revision=0,bundle:Bundle|undefined,result:Result|undefined,engine:Engine|undefined,loading:Promise<Engine>|undefined,attempt=0;
  const omitted=new Set<string>(),damaged=new Set<string>();
  const input=h('textarea',{class:'we-input mono','aria-label':'File recovery text','data-lenis-prevent':'',spellcheck:'false'});input.value=EXAMPLE;
  const box=h('section',{class:'dna-recovery','aria-label':'Digital file recovery'});
  const status=h('p',{role:'status',class:'dna-verdict'},'Encode your text, remove a fragment, then try to recover it.');
  const principle=h('div',{class:'dna-principle'});
  const fragments=h('div',{class:'dna-fragments'}),output=h('pre',{'data-recovered-text':'',class:'dna-restored mono','data-lenis-prevent':''});
  const report=h('pre',{'data-recovery-report':'',class:'dna-report mono','data-lenis-prevent':''});
  const reportWrap=h('details',{},h('summary',{},'Inspect the Python recovery report'),report);
  const evidence=h('details',{},h('summary',{},'Source and recovery boundary'),
    h('p',{},'The unchanged, MIT-licensed Python codec runs here in WebAssembly. It checks the manifest, each fragment, and the recovered whole file. One XOR parity fragment recovers one unavailable data fragment per group; two losses in that group must fail. Checksums detect accidental damage; they do not authenticate an author.'),
    h('p',{},'Digital file recovery using an A/C/G/T representation. No biological storage or wet-lab reliability is demonstrated. This browser text tool is limited to 8 KiB of UTF-8; the source utility also supports binary files.'),
    h('a',{href:`${base}lab/dna-codec/fragments.py`},'Read the exact Python source'),h('span',{},' · '),h('a',{href:`${base}lab/dna-codec/manifest.json`},'Source checksums'),h('span',{},' · '),h('a',{href:`${base}lab/dna-codec/LICENSE`},'MIT license'));
  const save=(name:string,text:string,type:string)=>{const href=URL.createObjectURL(new Blob([text],{type})),a=h('a',{href,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);};
  const download=button('Download recovered file',()=>{if(result?.ok)save('recovered.txt',result.text!,'text/plain;charset=utf-8');});
  const exportBundle=button('Download fragment bundle',()=>{if(bundle)save('dna-fragments.json',JSON.stringify(received(),null,2),'application/json');});
  const recover=button('Recover file',()=>void execute('recover'));
  const encode=button('Encode file',()=>void execute('encode'),'primary');
  function invalidate(encoding=false){revision++;result=undefined;output.textContent='';report.textContent='';principle.replaceChildren();download.disabled=true;if(encoding){bundle=undefined;fragments.replaceChildren();recover.disabled=true;exportBundle.disabled=true;}status.textContent=encoding?'Input changed · encode these bytes before recovery.':'Fragment selection changed · recover again to check these records.';encode.disabled=false;}
  function received(){return {...bundle!,fragments:bundle!.fragments.filter(f=>!omitted.has(`${f.kind}:${f.index}`)).map(f=>damaged.has(`${f.kind}:${f.index}`)?{...f,record:{...f.record,strand:(f.record.strand[0]==='A'?'C':'A')+f.record.strand.slice(1)}}:f)};}
  function draw(){
    fragments.replaceChildren();
    for(let group=0;group<bundle!.manifest.parity.length;group++){
      const rows=bundle!.fragments.filter(f=>f.kind==='parity'?f.index===group:Math.floor(f.index/4)===group);
      const row=h('fieldset',{class:'dna-group'},h('legend',{},`Group ${group} · one loss can be repaired with parity`));
      for(const f of rows){const id=`${f.kind}:${f.index}`,name=`${f.kind} fragment ${f.index}`;
        const keep=h('input',{type:'checkbox','aria-label':`Keep ${name}`});keep.checked=true;
        keep.addEventListener('change',()=>{keep.checked?omitted.delete(id):omitted.add(id);tile.dataset.state=keep.checked?(damaged.has(id)?'damaged':'kept'):'missing';invalidate();});
        const corrupt=h('input',{type:'checkbox','aria-label':`Damage ${name}`});
        corrupt.addEventListener('change',()=>{corrupt.checked?damaged.add(id):damaged.delete(id);tile.dataset.state=omitted.has(id)?'missing':corrupt.checked?'damaged':'kept';invalidate();});
        const tile=h('div',{class:`dna-fragment ${f.kind}`,'data-state':'kept'},h('label',{},keep,h('strong',{},name)),h('small',{},`${f.record.byte_length} bytes`),h('label',{},corrupt,'Corrupt one base'),h('code',{},f.record.strand.slice(0,20)+'…'));
        row.append(tile);
      }fragments.append(row);
    }
    if(!bundle!.manifest.chunks.length)fragments.append(h('p',{},'Empty file · no fragments required. Recovery still verifies the empty-file checksum.'));
  }
  async function load(){
    if(engine)return engine;
    loading??=(async()=>{const path=`${base}lab/dna-runtime.js${attempt++?`?retry=${attempt}`:''}`;const mod=await import(/* @vite-ignore */path);return mod.loadDNA(base);})();
    try{engine=await loading;return engine!;}catch(e){loading=undefined;throw e;}
  }
  async function execute(action:'encode'|'recover'){
    const token=++revision;result=undefined;output.textContent='';report.textContent='';principle.replaceChildren();download.disabled=true;
    const text=action==='encode'?input.value:JSON.stringify(received());
    if(action==='encode'&&new TextEncoder().encode(text).length>8192){invalidate(true);status.textContent='Use at most 8192 UTF-8 bytes; shorten the text and encode again.';return;}
    if(action==='encode'){bundle=undefined;fragments.replaceChildren();exportBundle.disabled=true;}
    encode.disabled=true;recover.disabled=true;status.textContent=engine?'Running Python…':'Loading Python and checking source hashes…';
    try{
      const run=await load();if(token!==revision||!box.isConnected)return;
      const out=run(action,text);if(token!==revision)return;
      if(!out.ok){status.textContent=out.message!;if(out.message?.includes('unrecoverable'))principle.append(h('h4',{},'Why recovery stops'),h('p',{},'One parity fragment gives one XOR equation. It cannot determine two unknown blocks in the same group. Restore either missing block and run recovery again. The decoder refuses to guess your file.'));return;}
      if(action==='encode'){
        bundle=out.bundle;omitted.clear();damaged.clear();draw();
        status.textContent=`Encoded ${bundle!.manifest.byte_length} bytes into ${bundle!.manifest.chunks.length} data fragments and ${bundle!.manifest.parity.length} parity fragments. Remove or damage a fragment below.`;
        exportBundle.disabled=false;
      }else{
        result=out;output.textContent=out.text!;report.textContent=JSON.stringify(out.report,null,2);download.disabled=false;
        status.textContent=`Verified · ${out.report!.byte_length} bytes recovered; whole-file checksum matches. Rebuilt data fragments: ${(out.report!.recovered_indices as number[]).join(', ')||'none needed'}.`;
        explain(out.report!);
      }
    }catch(e){if(token===revision)status.textContent=`Python unavailable · ${e instanceof Error?e.message:String(e)}. Retry Encode file; no recovery verdict was produced.`;}
    finally{if(token===revision){encode.disabled=false;recover.disabled=!bundle;}}
  }
  function explain(receipt:Record<string,unknown>){
    const steps=receipt.recovery_steps as {index:number;parity_index:number;used_data_indices:number[];verified_sha256:string}[];
    if(!steps.length){principle.append(h('p',{},'Every data fragment passed its checksum. Python joined them in index order and checked the whole-file digest; no parity reconstruction was needed.'));return;}
    principle.append(h('h4',{},'Inside the verified reconstruction'),h('p',{},'XOR cancels a repeated value. Combine parity with the surviving data blocks and the missing block is left. The indices below come from the actual Python recovery report; inspect any reconstructed byte. Short blocks contribute zero padding beyond their payload.'));
    const byteAt=(strand:string,offset:number)=>{const bases=strand.slice(offset*4,offset*4+4);return bases.length<4?0:[...bases].reduce((n,b)=>n*4+'ACGT'.indexOf(b),0);};
    const hex=(n:number)=>n.toString(16).padStart(2,'0').toUpperCase();
    for(const step of steps){
      const target=bundle!.fragments.find(f=>f.kind==='data'&&f.index===step.index)!;
      const known=[bundle!.fragments.find(f=>f.kind==='parity'&&f.index===step.parity_index)!,...step.used_data_indices.map(i=>bundle!.fragments.find(f=>f.kind==='data'&&f.index===i)!)];
      const slider=h('input',{type:'range',min:'0',max:String(target.record.byte_length-1),value:'0','aria-label':`Byte offset in recovered fragment ${step.index}`});
      const label=h('span',{},'Byte 0'),bits=h('ol',{class:'dna-xor mono'}),equation=h('p',{class:'dna-equation mono'});
      function show(){
        const offset=Number(slider.value),values=known.map(f=>byteAt(f.record.strand,offset)),value=values.reduce((a,b)=>a^b,0);
        label.textContent=`Byte ${offset} · fragment ${step.index}`;
        bits.replaceChildren(...known.map((f,i)=>h('li',{},h('span',{},`${f.kind==='parity'?'Parity':'Data'} ${f.index}`),h('b',{},values[i].toString(2).padStart(8,'0')),h('span',{},hex(values[i])))),h('li',{class:'dna-xor-result'},h('span',{},`Recovered ${step.index}`),h('b',{},value.toString(2).padStart(8,'0')),h('span',{},hex(value))));
        equation.textContent=values.map(hex).join(' XOR ')+' = '+hex(value);
      }
      slider.addEventListener('input',show);show();
      principle.append(h('div',{class:'dna-proof'},h('label',{},label,slider),h('p',{class:'lab-note'},'Columns: fragment · binary bits · hexadecimal (base 16).'),bits,equation,h('p',{},'Then Python checks the rebuilt fragment’s digest and the complete file’s digest before releasing any output.')));
    }
  }
  input.addEventListener('input',()=>invalidate(true));
  controls.prepend(h('div',{class:'dna-input'},h('h3',{},'A file you can recover'),h('label',{},'Your UTF-8 text',input),encode,button('Use recovery example',()=>{input.value=EXAMPLE;invalidate(true);}),h('p',{class:'lab-note'},'Processed inside your browser. The example spans multiple fragments so you can remove one and inspect how parity rebuilds it.')));
  box.append(h('h3',{},'Break the file. Rebuild the bytes.'),status,fragments,h('div',{class:'we-actions'},recover,exportBundle,download),principle,output,reportWrap,evidence);
  stage.prepend(box);recover.disabled=true;exportBundle.disabled=true;download.disabled=true;
}
