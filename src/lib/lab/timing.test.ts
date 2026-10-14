import {expect,test} from 'vitest';
import {parseReturns,parseCandles,runReturns,auditCandles,RETURN_TEMPLATE,CANDLE_TEMPLATE} from './timing';

test('visitor returns produce independently calculated positions, costs and cumulative log outcomes',()=>{
  const rows=parseReturns('step,return_pct\n0,10\n1,-5\n2,2\n');
  const result=runReturns(rows,1,10);
  expect(result.decisions.map(d=>d.honestPosition)).toEqual([0,1,-1]);
  expect(result.decisions.map(d=>d.signalStep)).toEqual([null,0,1]);
  expect(result.honest[2]).toBeCloseTo(Math.log(0.95)-Math.log(1.02)-0.003,12);
  expect(result.decisions[1].honestCost).toBeCloseTo(0.001,12);
  expect(result.decisions[2].honestCost).toBeCloseTo(0.002,12);
  expect(result.leaky[2]).toBeCloseTo(Math.log(1.1)-Math.log(0.95)+Math.log(1.02)-0.005,12);
  expect(runReturns(rows,2,0).decisions.map(d=>d.signalStep)).toEqual([null,null,0]);
});
test('future returns cannot change past honest decisions',()=>{
  const a=parseReturns(RETURN_TEMPLATE),b=a.map(r=>({...r}));b[5].returnPct=95;
  expect(runReturns(a,1,0).decisions.slice(0,5)).toEqual(runReturns(b,1,0).decisions.slice(0,5));
});
test('candle audit uses declared availability but compares it to actual close time',()=>{
  const rows=parseCandles('open_min,close_min,available_min,return_pct\n0,5,0,10\n5,10,5,-5\n');
  const bad=auditCandles(rows);
  expect(bad.leaks).toBe(2);expect(bad.decisions).toBe(2);
  expect(bad.ledger[0]).toMatchObject({decisionTime:0,usedLine:2,knownAt:5,leak:true});
  const good=auditCandles(rows.map(r=>({...r,available:r.close})));
  expect(good.leaks).toBe(0);expect(good.decisions).toBe(1);
  expect(good.ledger[1]).toMatchObject({usedLine:2,knownAt:5,leak:false});
  expect(good.equity[1]).toBeCloseTo(Math.log(0.95),12);
});
test('late records stay unavailable and do not silently become observed at close',()=>{
  const rows=parseCandles(CANDLE_TEMPLATE).map(r=>({...r,available:1000}));
  const out=auditCandles(rows);expect(out.decisions).toBe(0);
  expect(out.ledger.every(r=>r.usedLine===null&&r.position===0)).toBe(true);
});
test.each(['step,return_pct\n0,\n','step,return_pct\n0,Infinity\n','step,return_pct\n0,-100\n','step,return_pct\n0,1\n0,2\n','step,return_pct\n1,1\n0,2\n'])(
  'malformed, invalid and unordered returns are refused: %s',text=>expect(()=>parseReturns(text)).toThrow(/line|record/i));
test('candle columns, clocks and bounds are checked without hiding malformed records',()=>{
  expect(()=>parseCandles('open_min,close_min,available_min,return_pct\n0,5,bad,1')).toThrow(/Line 2: available_min/);
  expect(()=>parseCandles('open_min,close_min,available_min,return_pct\n5,5,5,1')).toThrow(/close_min/);
  expect(()=>parseReturns('step,return_pct\n'+Array.from({length:601},(_,i)=>`${i},1`).join('\n'))).toThrow(/600/);
  expect(()=>parseReturns(' '.repeat(65537))).toThrow(/64 KB/);
  expect(()=>runReturns(parseReturns(RETURN_TEMPLATE),0,0)).toThrow(/delay/);
  expect(()=>runReturns(parseReturns(RETURN_TEMPLATE),1,-1)).toThrow(/cost/);
});
