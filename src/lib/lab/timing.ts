import {numericRecords,bounded} from './records';
import {cumulative} from './series';
export const RETURN_TEMPLATE='step,return_pct\n0,1\n1,-2\n2,0.5\n3,1.5\n4,-0.7\n5,0\n6,2\n7,-1\n';
export const CANDLE_TEMPLATE='open_min,close_min,available_min,return_pct\n0,5,5,1\n5,10,10,-2\n10,15,15,0.5\n15,20,20,1.5\n20,25,25,-0.7\n25,30,30,0\n30,35,35,2\n35,40,40,-1\n';
export interface ReturnRecord {line:number;step:number;returnPct:number}
export interface CandleRecord {line:number;open:number;close:number;available:number;returnPct:number}
export function formatLogReturn(value:number):string{
  const percent=Math.expm1(value)*100;
  // Valid log outcomes can exceed the representable percentage range. Keep their actual unit.
  return Number.isFinite(percent)?`${percent.toFixed(1)}%`:`${value.toFixed(1)} log units (percentage out of range)`;
}
export function parseReturns(text:string):ReturnRecord[]{
  const rows=numericRecords(text,['step','return_pct']).map(({line,values:[step,returnPct]})=>({line,step:bounded(step,0,1e6,line,'step',true),returnPct:bounded(returnPct,-99,100,line,'return_pct')}));
  rows.forEach((r,i)=>{if(i&&r.step<=rows[i-1].step)throw new Error(`Line ${r.line}: step must increase; duplicate or out-of-order record.`);});
  return rows;
}
export function parseCandles(text:string):CandleRecord[]{
  const rows=numericRecords(text,['open_min','close_min','available_min','return_pct']).map(({line,values:[open,close,available,returnPct]})=>{
    for(const [name,value] of [['open_min',open],['close_min',close],['available_min',available]] as const)bounded(value,0,1e6,line,name);
    if(close<=open)throw new Error(`Line ${line}: close_min must be after open_min.`);
    return {line,open,close,available,returnPct:bounded(returnPct,-99,100,line,'return_pct')};
  });
  rows.forEach((r,i)=>{if(i&&r.open<rows[i-1].close)throw new Error(`Line ${r.line}: candle overlaps or precedes the previous candle.`);});
  return rows;
}
export function runReturns(rows:ReturnRecord[],delay=1,costBps=0){
  if(!Number.isInteger(delay)||delay<1||delay>20)throw new Error('Signal delay must be an integer from 1 to 20 records.');
  if(!Number.isFinite(costBps)||costBps<0||costBps>100)throw new Error('Turnover cost must be from 0 to 100 basis points.');
  let previous=0,previousLeaky=0;
  const decisions=rows.map((r,i)=>{
    const source=rows[i-delay],honestPosition=source?Math.sign(source.returnPct):0,leakyPosition=Math.sign(r.returnPct),market=Math.log1p(r.returnPct/100);
    const honestCost=Math.abs(honestPosition-previous)*costBps/10000,leakyCost=Math.abs(leakyPosition-previousLeaky)*costBps/10000;
    previous=honestPosition;previousLeaky=leakyPosition;
    return {line:r.line,step:r.step,signalStep:source?.step??null,signalReturn:source?.returnPct??null,honestPosition,leakyPosition,market,honestCost,leakyCost,honestNet:honestPosition*market-honestCost,leakyNet:leakyPosition*market-leakyCost};
  });
  return {decisions,honest:cumulative(decisions.map(d=>d.honestNet)),leaky:cumulative(decisions.map(d=>d.leakyNet)),market:cumulative(decisions.map(d=>d.market)),delay,costBps,model:'Unit sign exposure to log returns; linear turnover cost in log-return units. Not an executable trading strategy.'};
}
export function auditCandles(rows:CandleRecord[]){
  const ledger=rows.map(r=>{
    // The queried value is selected from declared availability. Actual close time is an independent audit clock.
    const used=rows.findLast(c=>c.available<=r.open),position=used?Math.sign(used.returnPct):0;
    return {line:r.line,decisionTime:r.open,usedLine:used?.line??null,declaredAvailable:used?.available??null,knownAt:used?.close??null,position,leak:Boolean(used&&used.close>r.open),net:position*Math.log1p(r.returnPct/100)};
  });
  return {ledger,decisions:ledger.filter(r=>r.usedLine!==null).length,leaks:ledger.filter(r=>r.leak).length,equity:cumulative(ledger.map(r=>r.net)),market:cumulative(rows.map(r=>Math.log1p(r.returnPct/100))),model:'Synthetic sign exposure to log returns; declared clocks are unauthenticated and execution costs are excluded.'};
}
