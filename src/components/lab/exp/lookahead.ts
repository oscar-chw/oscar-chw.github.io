import {parseReturns,runReturns,RETURN_TEMPLATE,formatLogReturn as pct,type ReturnRecord} from '../../../lib/lab/timing';
import {returns} from '../../../lib/lab/series';
import {recordsEditor,recordTable,chartCursor} from '../records-editor';
import {h,chart,segmented,button,readout,slider,css} from '../ui';
import {Shuffle} from 'lucide';

export function mount(stage:HTMLElement,controls:HTMLElement){
  let seed=1,peek='no',delay=1,cost=0;
  const result=h('div',{}),ro=h('div',{});
  function dirty(){result.replaceChildren(h('p',{class:'lab-note'},'No result for the current input. Run the backtest.'));ro.replaceChildren();}
  function draw(rows:ReturnRecord[]){
    const b=runReturns(rows,delay,cost);
    const plot=chart('Calculated cumulative log-return outcomes for delayed, peeking and market paths');
    const series=[{values:b.market,color:css('--muted'),label:'market',width:1.5},{values:b.honest,color:css('--accent'),label:'signal from earlier records'}];
    if(peek==='yes')series.push({values:b.leaky,color:css('--down'),label:'signal uses its own future outcome',width:2.5});
    plot.draw(series);
    const cursor=chartCursor(plot.el,rows.length);
    ro.replaceChildren(readout([['honest',pct(b.honest.at(-1)!)],['leaky',peek==='yes'?pct(b.leaky.at(-1)!):'hidden'],['market',pct(b.market.at(-1)!)]]));
    const inspect=h('div',{class:'tw-inspect','aria-live':'polite'}),index=h('input',{type:'range',min:'0',max:String(rows.length-1),value:'0',step:'1','aria-label':'Inspect decision'});
    const show=()=>{
      const i=Number(index.value),d=b.decisions[i];
      cursor(i);
      inspect.replaceChildren(h('strong',{},`Decision at step ${d.step} · input line ${d.line}`),
        h('p',{},d.signalStep===null?'No earlier signal exists yet. Stay flat.':`Read step ${d.signalStep}: return ${d.signalReturn}%. Its sign sets exposure to ${d.honestPosition} before step ${d.step} is observed.`),
        h('p',{},`Outcome ${rows[i].returnPct}%; turnover cost ${d.honestCost.toFixed(6)} log units; net log return ${d.honestNet.toFixed(6)}.`),
        h('p',{},peek==='yes'?`The peeking path uses step ${d.step}'s own return to choose exposure ${d.leakyPosition}. That value was not known when the position had to be chosen.`:'Reveal the peeking path to inspect why its apparently better result uses future information.'));
    };
    index.addEventListener('input',show);show();
    result.replaceChildren(plot.el,h('label',{class:'tw-scrub'},'Inspect an individual decision',index),inspect,
      h('p',{class:'lab-note'},'Model: signed exposure to log returns, with a linear turnover-cost deduction in log units. Short-side outcomes are an illustration, not a cash-account backtest or evidence of a profitable strategy.'),
      h('details',{class:'we-ledger'},h('summary',{},`Full decision ledger · ${rows.length} records`),recordTable(['step','signal step','exposure','log return','cost','net log return'],b.decisions.map(d=>[d.step,d.signalStep,d.honestPosition,d.market.toFixed(6),d.honestCost.toFixed(6),d.honestNet.toFixed(6)]),'tw-ledger')));
    return b;
  }
  const editor=recordsEditor({label:'Return records CSV',initial:RETURN_TEMPLATE,invalid:'step,return_pct\n0,not-a-number\n',runLabel:'Run backtest',parse:parseReturns,compute:draw,dirty});
  stage.append(editor.el,result);
  controls.append(segmented("let the rule see today's return?",['no','yes'],peek,v=>{peek=v;editor.run();}),
    slider('signal delay (records)',1,20,1,delay,String,v=>{delay=v;editor.run();}),
    slider('turnover cost (basis points)',0,100,1,cost,String,v=>{cost=v;editor.run();}),
    button('new random market',()=>{seed++;editor.setText('step,return_pct\n'+returns(seed,120).map((v,i)=>`${i},${(Math.expm1(v)*100).toFixed(6)}`).join('\n')+'\n');editor.run();},'',Shuffle),ro);
  editor.run();
}
