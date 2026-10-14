import {run,filterObservations,WINDOW,Z,drifting} from '../../../lib/lab/kalman';
import {numericRecords,bounded} from '../../../lib/lab/records';
import {recordsEditor,recordTable,chartCursor} from '../records-editor';
import {h,chart,slider,readout,button,css} from '../ui';
import {Shuffle} from 'lucide';
interface Observation {mid:number;drift:boolean}
const parse=(text:string):Observation[]=>numericRecords(text,['mid','drift']).map(({line,values:[mid,drift]})=>{bounded(mid,1e-6,1e6,line,'mid');if(drift!==0&&drift!==1)throw new Error(`Line ${line}: drift must be 0 or 1.`);return {mid,drift:drift===1};});
const toCSV=(mids:number[])=>'mid,drift\n'+mids.map((m,i)=>`${m.toFixed(8)},${drifting(i)?1:0}`).join('\n')+'\n';
export function mount(stage:HTMLElement,controls:HTMLElement){
  let noise=0.6,seed=1,demo=run(noise,seed),generatedText=toCSV(demo.mid);
  const result=h('div',{}),ro=h('div',{});
  const dirty=()=>{result.replaceChildren(h('p',{class:'lab-note'},'Run the supplied observations to inspect filter state.'));ro.replaceChildren();};
  function draw(rows:Observation[]){
    const synthetic=editor.input.value===generatedText,mid=rows.map(r=>r.mid),f=filterObservations(mid,noise,synthetic?100:mid[0]);
    const price=chart('Observed mid prices and the local-linear Kalman estimate',760,240),lines=[{values:mid,color:css('--muted'),label:'observed mid',width:1},{values:f.level,color:css('--accent'),label:'Kalman estimate',width:2}];
    if(synthetic)lines.push({values:demo.fair,color:css('--ink'),label:'synthetic planted fair value',width:1.5});price.draw(lines);const cursor=chartCursor(price.el,rows.length);
    const ns='http://www.w3.org/2000/svg',strip=document.createElementNS(ns,'svg');strip.setAttribute('viewBox','0 0 760 118');strip.setAttribute('class','chart gk');strip.setAttribute('role','img');strip.setAttribute('aria-label','Drift calls compared with the supplied drift labels');
    const x=(i:number)=>40+i/Math.max(1,rows.length-1)*704;
    let bands='';for(let i=0;i<rows.length;i++){if(!rows[i].drift)continue;let end=i+1;while(end<rows.length&&rows[end].drift)end++;bands+=`<rect x="${x(i)}" y="2" width="${Math.max(2,x(end-1)-x(i))}" height="82" class="gk-drift"/>`;i=end-1;}
    const ticks=(flags:boolean[],y:number)=>flags.map((hit,i)=>hit?`<rect x="${x(i)}" y="${y}" width="2" height="20" class="${rows[i].drift?'gk-hit':'gk-false'}"/>`:'').join('');
    strip.innerHTML=bands+`<text x="36" y="40" text-anchor="end" class="lg">fixed</text>${ticks(f.fixed,24)}<text x="36" y="74" text-anchor="end" class="lg">Kalman</text>${ticks(f.kalman,58)}`;
    const score=(flags:boolean[])=>{let falseCalls=0,quiet=0,caught=0,drift=0;rows.forEach((r,i)=>{if(i<WINDOW)return;if(r.drift){drift++;if(flags[i])caught++;}else{quiet++;if(flags[i])falseCalls++;}});return {falseCalls:quiet?falseCalls/quiet:null,caught:drift?caught/drift:null};};
    const a=score(f.fixed),b=score(f.kalman),pct=(v:number|null)=>v===null?'no labelled cases':`${(v*100).toFixed(0)}%`;
    ro.replaceChildren(readout([['fixed window: false drift calls',pct(a.falseCalls)],['fixed window: drift caught',pct(a.caught)],['Kalman: false drift calls',pct(b.falseCalls)],['Kalman: drift caught',pct(b.caught)]]));
    const index=h('input',{type:'range',min:'0',max:String(rows.length-1),value:'0','aria-label':'Inspect filter step'}),inspect=h('div',{class:'tw-inspect filter-inspect','aria-live':'polite'});
    const show=()=>{const i=Number(index.value),d=f.details[i];cursor(i);inspect.replaceChildren(h('strong',{},`Observation ${i+1} · mid ${mid[i]}`),h('p',{},`Estimate ${f.level[i].toFixed(6)}; slope ${d.slope.toFixed(6)}; slope uncertainty ${d.slopeStd.toFixed(6)}.`),h('p',{},`Innovation ${d.innovation.toFixed(6)} × level gain ${d.gain.toFixed(6)} corrects the prediction. Kalman drift call: ${f.kalman[i]?'yes':'no'}; it needs a slope beyond ${Z} model standard errors after warm-up.`));};index.addEventListener('input',show);show();
    result.replaceChildren(h('p',{class:'lab-note'},synthetic?'Synthetic market with a planted drift. The shaded interval is known here because the generator created it.':'Visitor observations: drift flags are supplied labels, not independently known truth. The noise slider changes the assumed measurement error without replacing your observations.'),price.el,strip,h('label',{class:'tw-scrub'},'Inspect a filter update',index),inspect,h('p',{class:'lab-note'},'A fixed-window slope and a local-linear Kalman model make different noise assumptions. Neither is universally better; inspect missed and false calls in this case.'),h('details',{class:'we-ledger'},h('summary',{},'Full filter state'),recordTable(['step','mid','estimate','slope','slope uncertainty','drift call'],f.details.map((d,i)=>[i,mid[i],f.level[i].toFixed(6),d.slope.toFixed(6),d.slopeStd.toFixed(6),String(f.kalman[i])]),'filter-ledger')));
    return {...f,observations:rows,noise,labelSource:synthetic?'synthetic planted drift':'visitor-supplied labels'};
  }
  const editor=recordsEditor({label:'Observed mids CSV',initial:generatedText,invalid:'mid,drift\n-1,0\n',runLabel:'Run filter',parse,compute:draw,dirty});stage.append(editor.el,result);
  const generate=()=>{demo=run(noise,seed);generatedText=toCSV(demo.mid);editor.setText(generatedText);editor.run();};
  controls.append(slider('price noise',0.1,1.2,0.05,noise,v=>v.toFixed(2),v=>{const synthetic=editor.input.value===generatedText;noise=v;if(synthetic)generate();else editor.run();}),h('p',{class:'lab-note'},'For the generated case, noise reshapes the observed market. For your own data, it is the filter’s assumed measurement-noise standard deviation in price units.'),button('new random market',()=>{seed++;generate();},'',Shuffle),ro);editor.run();
}
