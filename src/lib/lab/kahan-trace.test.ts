import {test,expect} from 'vitest';
import {arithmeticTrace} from './kahan-trace';

test('trace exposes the actual products and subtraction for non-preset binary-exact inputs',()=>{
  const r=arithmeticTrace([1.25,3.5,.75,5.25]);
  expect(r.steps.map(s=>s.value)).toEqual([4.375,3.9375,.4375,3.9375,0,.4375,.4375]);
  expect(r.reference).toBe(.4375);
  expect(r.referenceExact).toBe('7 × 2^-4');
});

test('the trace keeps a residual lost by separately rounded products',()=>{
  // (1 + 2^-52)(1 - 2^-52) - 1 = -2^-104, exactly.
  const r=arithmeticTrace([1+2**-52,1-2**-52,1,1]);
  expect(r.steps[0].value).toBe(1);
  expect(r.steps[0].discarded).toBe(-(2**-104));
  expect(r.steps[2].value).toBe(0);
  expect(r.steps[5].value).toBe(-(2**-104));
  expect(r.steps[6].value).toBe(-(2**-104));
  expect(r.referenceExact).toBe('-1 × 2^-104');
  expect(r.steps[2].bits).toBe('0'.repeat(64));
  expect(r.steps[6].bits).not.toBe(r.steps[2].bits);
});

test('trace describes actual rounded binary inputs rather than claiming decimal arithmetic',()=>{
  const r=arithmeticTrace([.1,10,1,1]);
  expect(r.steps[2].value).toBe(0);
  expect(r.steps[5].value).toBe(5.551115123125783e-17);
  expect(r.referenceExact).toBe('1 × 2^-54');
  expect(JSON.parse(JSON.stringify(r)).inputs).toEqual([.1,10,1,1]);
});
