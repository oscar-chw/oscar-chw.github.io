import {expect,test} from 'vitest';
import {parseMoves,scoreMoves,parseRiskCases,evaluateRiskCases} from './decisions';
import {calibrate} from './gate';
import {parseSection,clash} from './timetable';

test('custom move probabilities have the independently calculated masked denominator',()=>{
  const rows=parseMoves(JSON.stringify([{action:'a',score:2,legal:true},{action:'b',score:100,legal:false},{action:'c',score:0,legal:true}]));
  const r=scoreMoves(rows,1);
  expect(r.moves[0].probability).toBeCloseTo(1/(1+Math.exp(-2)),12);
  expect(r.moves[1].probability).toBe(0);expect(r.totalProbability).toBeCloseTo(1,12);expect(r.best).toBe('a');
  const blocked=scoreMoves(rows.map(r=>({...r,legal:false})),1);
  expect(blocked.best).toBeNull();expect(blocked.totalProbability).toBe(0);
});
test('invalid move records and temperature are named instead of producing NaN',()=>{
  expect(()=>parseMoves('[{"action":"a","score":"bad","legal":true}]')).toThrow(/score/);
  expect(()=>parseMoves('[{"action":"a","score":1,"legal":"false"}]')).toThrow(/legal/);
  expect(()=>parseMoves('[]')).toThrow(/action/);
  expect(()=>scoreMoves([{action:'a',score:1,legal:true}],0)).toThrow(/temperature/i);
});
test('empirical calibration does not certify risk on a different labelled sample',()=>{
  const data=parseRiskCases(JSON.stringify({calibration:[{risk:0.1,breaks:false},{risk:0.9,breaks:true}],evaluation:[{risk:0.1,breaks:true},{risk:0.95,breaks:true}]}));
  const r=evaluateRiskCases(data,0);
  expect(r.threshold).toBe(0.9);expect(r.calibration.violations).toBe(0);
  expect(r.evaluation.violations).toBe(1);expect(r.evaluation.violationRate).toBe(0.5);
  expect(r.evaluation.acted).toBe(1);expect(r.evaluation.violations/r.evaluation.acted).toBe(1);
});
test('all-safe calibration does not arbitrarily exclude the highest-score action',()=>{
  expect(calibrate([{risk:0,breaks:false},{risk:1,breaks:false}],0)).toBeGreaterThan(1);
  expect(calibrate([{risk:0,breaks:true}],0)).toBe(0);
});
test('risk datasets reject missing labels, non-probability scores and empty samples',()=>{
  expect(()=>parseRiskCases('{"calibration":[],"evaluation":[]}')).toThrow(/calibration/);
  expect(()=>parseRiskCases('{"calibration":[{"risk":2,"breaks":false}],"evaluation":[{"risk":0,"breaks":false}]}')).toThrow(/risk/);
  expect(()=>parseRiskCases('{"calibration":[{"risk":0,"breaks":"false"}],"evaluation":[{"risk":0,"breaks":false}]}')).toThrow(/breaks/);
});
test('custom schedule intervals use half-open boundaries and strict clock validation',()=>{
  const a=parseSection('Seminar','0','09:00','10:00');
  expect(clash([a],parseSection('Next','0','10:00','11:00'))).toBeNull();
  expect(clash([a],parseSection('Overlap','0','09:30','10:30'))?.with).toBe('Seminar');
  expect(()=>parseSection('Bad','0','11:00','10:00')).toThrow(/after/);
  expect(()=>parseSection('Bad','0','09:70','10:00')).toThrow(/time/);
  expect(()=>parseSection('','0','09:00','10:00')).toThrow(/name/);
  expect(()=>parseSection('Bad','9','09:00','10:00')).toThrow(/Day/);
});
