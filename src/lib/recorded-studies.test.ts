import {test,expect} from 'vitest';
import {recordedSelection} from './recorded-studies';
test('Kelly assumptions select their actual recorded summaries without simulating new paths',()=>{
  const r=recordedSelection('kelly','overestimated');expect(r.recorded).toBe(true);expect(r.source.commit).toBe('2d82aed');
  expect(r.metrics[0].values.map(x=>x.value)).toEqual([0.000035,0.001284]);expect(r.paths).toEqual([]);
  expect(recordedSelection('kelly','true').paths[0].values).toHaveLength(99);
});
test('validation and funding controls retain distinct measured quantities',()=>{
  expect(recordedSelection('validation','contiguous').metrics[0].values.map(x=>x.value)).toEqual([0.496606,0.495311]);
  expect(recordedSelection('funding','eth').metrics[0].values.map(x=>x.value)).toEqual([0.347526,-0.02471,0.139761]);
  expect(()=>recordedSelection('funding','made-up')).toThrow(/available/);
});
