import {parseFlow,replayFlow,syntheticFlow,type FlowTick} from '../../../lib/lab/marketmaking';
import {recordsEditor,recordTable,chartCursor} from '../records-editor';
import {h,chart,slider,readout,button,css} from '../ui';
import {Shuffle} from 'lucide';
const csv=(flow:FlowTick[])=>'fair,taker_value,side,qty\n'+flow.map(r=>`${r.fair},${r.value},${r.side==='buy'?1:-1},${r.qty}`).join('\n')+'\n';
const initial=csv(syntheticFlow(3,600));
const worked='fair,taker_value,side,qty\n100,101,1,1\n100,99,-1,1\n';
export function mount(stage:HTMLElement,controls:HTMLElement){
  let spread=0.4,skew=0.02,seed=3;const result=h('div',{}),ro=h('div',{});
  const dirty=()=>{result.replaceChildren(h('p',{class:'lab-note'},'Run the edited flow to compute fills and account state.'));ro.replaceChildren();};
  function draw(flow:FlowTick[]){
    const m=replayFlow(flow,{spread,skew}),quotes=chart('Model fair value and the maker bid/ask quotes'),inv=chart('Inventory over the supplied events',760,160),pnl=chart('Cash plus inventory marked at supplied fair value',760,160);
    quotes.draw([{values:m.fair,color:css('--ink'),label:'model fair value',width:1.5}],{lo:m.bid,hi:m.ask,color:css('--accent')});inv.draw([{values:m.inventory,color:css('--amber'),label:'inventory'}]);pnl.draw([{values:m.pnl,color:css('--up'),label:'cash + inventory × fair'}]);
    const cursors=[quotes,inv,pnl].map(c=>chartCursor(c.el,flow.length));
    const index=h('input',{type:'range',min:'0',max:String(flow.length-1),value:'0',step:'1','aria-label':'Inspect flow event'}),inspect=h('div',{class:'tw-inspect mm-inspect','aria-live':'polite'});
    const show=()=>{const i=Number(index.value),r=m.ledger[i],tick=flow[i];cursors.forEach(f=>f(i));inspect.replaceChildren(h('strong',{},`Event ${i+1}: taker ${tick.side} · quantity ${tick.qty}`),h('p',{},`Quote ${r.bid.toFixed(4)} / ${r.ask.toFixed(4)} around model value ${tick.fair}. Taker value ${tick.value}.`),h('p',{},r.fillPrice===null?'No fill: this taker does not prefer the offered quote.':`Filled ${r.qty} at ${r.fillPrice.toFixed(4)}. Cash ${r.cash.toFixed(4)}; inventory ${r.inventory}; marked result ${r.pnl.toFixed(4)}.`));};index.addEventListener('input',show);show();
    result.replaceChildren(quotes.el,inv.el,pnl.el,h('label',{class:'tw-scrub'},'Inspect a fill and account update',index),inspect,h('p',{class:'lab-note'},'Each row supplies a model fair value, a taker valuation, side (1 buys, -1 sells) and quantity. An accepted quote fills the whole quantity. This small model excludes fees, latency, queue position and capital constraints.'),h('details',{class:'we-ledger'},h('summary',{},'Full fill and account ledger'),recordTable(['event','taker','filled qty','fill price','cash','inventory','marked result'],m.ledger.map(r=>[r.index+1,r.side,r.qty,r.fillPrice,r.cash.toFixed(6),r.inventory,r.pnl.toFixed(6)]))));
    ro.replaceChildren(readout([['fills',String(m.fills)],['peak |inventory|',String(Math.max(...m.inventory.map(Math.abs)))],['final P&L (model units)',m.pnl.at(-1)!.toFixed(2)]]));
    return {...m,spread,skew};
  }
  const editor=recordsEditor({label:'Market flow CSV',initial,invalid:'fair,taker_value,side,qty\n100,101,0,1\n',runLabel:'Replay flow',parse:parseFlow,compute:draw,dirty});stage.append(editor.el,result);
  controls.append(slider('spread',0.05,1.5,0.05,spread,v=>v.toFixed(2),v=>{spread=v;editor.run();}),slider('inventory skew',0,0.12,0.005,skew,v=>v.toFixed(3),v=>{skew=v;editor.run();}),button('new random flow',()=>{seed++;editor.setText(csv(syntheticFlow(seed,600)));editor.run();},'',Shuffle),button('Two-fill worked example',()=>{editor.setText(worked);editor.run();}),ro);editor.run();
}
