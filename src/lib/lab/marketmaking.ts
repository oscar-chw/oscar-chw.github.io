// Independent quote/fill model. Every event is supplied data or generated synthetic flow.
import {rng,gauss} from './series';
import {numericRecords,bounded} from './records';
export interface MMParams {spread:number;skew:number;steps?:number;seed?:number}
export interface FlowTick {fair:number;value:number;side:'buy'|'sell';qty:number}
export interface MMPath {fair:number[];bid:number[];ask:number[];inventory:number[];pnl:number[];fills:number}
export interface FillStep {index:number;side:string;qty:number;fillPrice:number|null;cash:number;inventory:number;pnl:number;bid:number;ask:number}
export function syntheticFlow(seed=3,steps=600):FlowTick[]{
  const r=rng(seed);let fair=100;
  return Array.from({length:steps},()=>{fair+=0.05*gauss(r);const value=fair+0.6*gauss(r),side=r()<0.5?'buy':'sell';return {fair,value,side,qty:1};});
}
export function parseFlow(text:string):FlowTick[]{
  return numericRecords(text,['fair','taker_value','side','qty']).map(({line,values:[fair,value,side,qty]})=>{
    bounded(fair,1e-6,1e6,line,'fair');bounded(value,1e-6,1e6,line,'taker_value');bounded(qty,1,10000,line,'qty',true);
    if(side!==1&&side!==-1)throw new Error(`Line ${line}: side must be 1 (taker buys) or -1 (taker sells).`);
    return {fair,value,side:side===1?'buy':'sell',qty};
  });
}
export function replayFlow(flow:FlowTick[],{spread,skew}:MMParams):MMPath&{ledger:FillStep[]}{
  if(!Number.isFinite(spread)||spread<=0||!Number.isFinite(skew)||skew<0)throw new Error('Spread must be positive and inventory skew nonnegative.');
  let inv=0,cash=0,fills=0;
  const out:MMPath&{ledger:FillStep[]}={fair:[],bid:[],ask:[],inventory:[],pnl:[],fills:0,ledger:[]};
  for(const [index,tick] of flow.entries()){
    const centre=tick.fair-skew*inv,bid=centre-spread/2,ask=centre+spread/2;
    let fillPrice:number|null=null;
    if(tick.side==='buy'&&tick.value>ask){inv-=tick.qty;cash+=ask*tick.qty;fillPrice=ask;fills++;}
    if(tick.side==='sell'&&tick.value<bid){inv+=tick.qty;cash-=bid*tick.qty;fillPrice=bid;fills++;}
    const pnl=cash+inv*tick.fair;
    out.fair.push(tick.fair);out.bid.push(bid);out.ask.push(ask);out.inventory.push(inv);out.pnl.push(pnl);
    out.ledger.push({index,side:tick.side,qty:fillPrice===null?0:tick.qty,fillPrice,cash,inventory:inv,pnl,bid,ask});
  }
  out.fills=fills;return out;
}
export function simulate({spread,skew,steps=600,seed=3}:MMParams):MMPath{return replayFlow(syntheticFlow(seed,steps),{spread,skew});}
