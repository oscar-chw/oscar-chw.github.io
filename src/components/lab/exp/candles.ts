import {parseCandles,auditCandles,CANDLE_TEMPLATE,formatLogReturn as pct,type CandleRecord} from '../../../lib/lab/timing';
import {returns} from '../../../lib/lab/series';
import {recordsEditor,recordTable,chartCursor} from '../records-editor';
import {h,chart,segmented,button,readout,css} from '../ui';
import {Shuffle} from 'lucide';
const csv=(rows:CandleRecord[])=>'open_min,close_min,available_min,return_pct\n'+rows.map(r=>`${r.open},${r.close},${r.available},${r.returnPct}`).join('\n')+'\n';

export function mount(stage:HTMLElement,controls:HTMLElement){
  let seed=1;
  const result=h('div',{}),ro=h('div',{});
  function dirty(){result.replaceChildren(h('p',{class:'lab-note'},'No audit for the current input. Run the availability check.'));ro.replaceChildren();}
  function draw(rows:CandleRecord[]){
    const out=auditCandles(rows);
    const plot=chart('Calculated sign-rule log-return outcome and market path');
    plot.draw([{values:out.market,color:css('--muted'),label:'market',width:1.5},{values:out.equity,color:css(out.leaks?'--down':'--accent'),label:'rule using declared availability',width:2}]);
    const cursor=chartCursor(plot.el,rows.length);
    ro.replaceChildren(readout([['rule',pct(out.equity.at(-1)!)],['audit',out.leaks?`${out.leaks} of ${out.decisions} reads used a close not yet known`:`0 of ${out.decisions} reads ahead of time`]]));
    const inspect=h('div',{class:'tw-inspect','aria-live':'polite'}),index=h('input',{type:'range',min:'0',max:String(rows.length-1),value:'0',step:'1','aria-label':'Inspect candle decision'});
    const show=()=>{
      const d=out.ledger[Number(index.value)];inspect.classList.toggle('bad',d.leak);
      cursor(Number(index.value));
      inspect.replaceChildren(h('strong',{},`Decision at ${d.decisionTime} minutes · input line ${d.line}`),
        h('p',{},d.usedLine===null?'No close has been declared available. The rule stays flat.':`Read input line ${d.usedLine}: declared available at ${d.declaredAvailable}, but the candle close is only known at ${d.knownAt}.`),
        h('p',{},d.leak?`This read is ahead of time. Inspect available_min on line ${d.usedLine}; it must not claim the closing return existed before the candle ended. Correct the source record and rerun.`:'This decision uses no future candle close. Declared availability may still be wrong; the audit cannot authenticate your timestamps.'));
    };index.addEventListener('input',show);show();
    result.replaceChildren(plot.el,h('label',{class:'tw-scrub'},'Inspect the availability proof',index),inspect,
      h('p',{class:'lab-note'},'The rule reads the latest candle whose declared availability is at or before its decision time. The audit separately compares that read with the candle end. Returns illustrate the cost of bad timing; this is not an executable trading backtest.'),
      h('details',{class:'we-ledger'},h('summary',{},`Full availability ledger · ${rows.length} records`),recordTable(['decision minute','source line','declared available','close known at','audit'],out.ledger.map(d=>[d.decisionTime,d.usedLine,d.declaredAvailable,d.knownAt,d.leak?'FUTURE READ':d.usedLine===null?'NO DATA':'KNOWN']),'tw-ledger')));
    return out;
  }
  const editor=recordsEditor({label:'Candle records CSV',initial:CANDLE_TEMPLATE,invalid:'open_min,close_min,available_min,return_pct\n0,5,unknown,1\n',runLabel:'Run availability audit',parse:parseCandles,compute:draw,dirty});
  stage.append(editor.el,result);
  controls.append(segmented('stamp each candle at its',['close','open'],'close',v=>{
    try{const rows=parseCandles(editor.input.value);editor.setText(csv(rows.map(r=>({...r,available:v==='close'?r.close:r.open}))));}catch{ /* run() names the malformed input without replacing it */ }
    editor.run();
  }),h('p',{class:'lab-note'},'Stamp presets rewrite the visible availability column. For real supplied data, preserve the actual availability time instead of guessing it from candle end.'),
  button('new random market',()=>{seed++;const rows=returns(seed,120).map((v,i)=>({line:i+2,open:i*5,close:i*5+5,available:i*5+5,returnPct:Number((Math.expm1(v)*100).toFixed(6))}));editor.setText(csv(rows));editor.run();},'',Shuffle),ro);
  editor.run();
}
