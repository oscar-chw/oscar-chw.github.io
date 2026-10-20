import {expect,test} from 'vitest';
import {parseFlow,replayFlow} from './marketmaking';
import {filterObservations} from './kalman';
import {parseCandidates,factorStudy,noiseSearch} from './studies';
import {panel} from './factors';
import {RaceMachine} from './lostupdates';
import {manualOrder} from '../replay-input';

test('supplied takers update cash and inventory at the actual quoted prices',()=>{
  const rows=parseFlow('fair,taker_value,side,qty\n100,101,1,1\n100,99,-1,1\n');
  const r=replayFlow(rows,{spread:0.4,skew:0.02});
  expect(r.inventory).toEqual([-1,0]);expect(r.ledger[0].cash).toBeCloseTo(100.2,12);expect(r.pnl[1]).toBeCloseTo(0.38,12);
  r.ledger.forEach((d,i)=>expect(r.pnl[i]).toBeCloseTo(d.cash+d.inventory*rows[i].fair,10));
  expect(replayFlow([{fair:100,value:100.2,side:'buy',qty:1}],{spread:0.4,skew:0}).fills).toBe(0);
  expect(()=>parseFlow('fair,taker_value,side,qty\n100,99,0,1')).toThrow(/side/);
});
test('the local linear filter exposes its actual innovation, gain and posterior',()=>{
  const r=filterObservations([102,102],1,100);
  expect(r.details[0].innovation).toBe(2);
  expect(r.level[0]).toBeCloseTo(100+2*1.0104/2.0104,12);
  expect(r.details[0].slope).toBeCloseTo(2*0.01/2.0104,12);
  expect(filterObservations(Array(25).fill(100),0.6).details.every(d=>d.slope===0)).toBe(true);
});
test('unopened factor study neither computes nor exposes a test statistic or test-driven scale',()=>{
  const p=panel(4),c=parseCandidates('window,direction\n2,1\n7,-1\n');
  const a=factorStudy(p,c,false),copy={rets:p.rets.map((r,i)=>i<450?[...r]:r.map(x=>x*100+1))};
  expect(a.rows.every(r=>r.test===null)).toBe(true);expect(factorStudy(copy,c,false)).toEqual(a);
  const opened=factorStudy(p,c,true);expect(opened.rows.filter(r=>r.test!==null)).toHaveLength(1);
  expect(opened.chosen).toBe(a.chosen);expect(()=>parseCandidates('window,direction\n0,1')).toThrow(/window/);
});
test('noise candidate selection uses the searched scores and reports only that winner on test',()=>{
  const r=noiseSearch(panel(11),500,60),best=Math.max(...r.rows.map(x=>x.train));
  expect(r.rows[r.chosen].train).toBe(best);expect(r.rows[r.chosen].seed).toBe(500+r.chosen);
  expect(r.rows[r.chosen].train).toBeGreaterThan(r.test);
  expect(()=>noiseSearch(panel(11),-1,1)).toThrow(/seed/);
});
test('manual writer scheduling demonstrates the lost write and real CAS retry',()=>{
  const lost=new RaceMachine(2,'last write wins');[0,1,0,1].forEach(w=>lost.step(w));
  expect(lost.value).toBe(1);expect(lost.version).toBe(2);expect(lost.steps[3].kind).toBe('lost');
  const cas=new RaceMachine(2,'compare-and-swap');[0,1,0,1].forEach(w=>cas.step(w));
  expect(cas.value).toBe(1);expect(cas.steps[3].kind).toBe('retry');
  cas.step(1);cas.step(1);expect(cas.value).toBe(2);expect(cas.retries).toBe(1);
});
test('visitor orders require finite positive integer quantities and prices',()=>{
  expect(manualOrder('limit','buy','9000','3',1000000,120)).toMatchObject({kind:'limit',price:9000,qty:3});
  expect(()=>manualOrder('limit','buy','9000','0',1,0)).toThrow(/quantity/);
  expect(()=>manualOrder('limit','buy','9.5','1',1,0)).toThrow(/price/);
  expect(manualOrder('market','sell','','2',1,0)).toMatchObject({kind:'market',qty:2});
});
