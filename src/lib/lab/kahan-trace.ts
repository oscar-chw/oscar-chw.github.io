import {exactDet,fma,kahan,plain,toDouble} from './kahan';

export type Operands=[number,number,number,number];
export interface Operation {id:string; path:'plain'|'compensated'; label:string; formula:string; value:number; bits:string; discarded?:number; why:string}
const bits=(n:number)=>{const v=new DataView(new ArrayBuffer(8));v.setFloat64(0,n);return v.getBigUint64(0).toString(2).padStart(64,'0');};

export function arithmeticTrace(inputs:Operands) {
  const [a,b,c,d]=inputs,ab=a*b,w=c*d,e=fma(-c,d,w),f=fma(a,b,-w);
  const step=(id:string,path:Operation['path'],label:string,formula:string,value:number,why:string,discarded?:number):Operation=>
    ({id,path,label,formula,value,bits:bits(value),why,...(discarded===undefined?{}:{discarded})});
  const steps=[
    step('ab','plain','Product a × b','fl(a × b)',ab,'The product is rounded before the subtraction. A tiny difference can disappear here.',fma(a,b,-ab)),
    step('cd','plain','Product c × d','fl(c × d)',w,'This independently rounded product may become identical to the first.',fma(c,d,-w)),
    step('plain','plain','Subtract stored products','fl(ab − cd)',plain(a,b,c,d),'Subtraction cannot recover bits already discarded by the products.'),
    step('w','compensated','Store one product','w = fl(c × d)',w,'Keep this rounded product and explicitly calculate its rounding residual.'),
    step('residual','compensated','Recover its residual','e = fma(−c, d, w)',e,'The fused operation evaluates w − c×d with one final rounding.'),
    step('fused','compensated','Subtract before rounding','f = fma(a, b, −w)',f,'Multiplication and subtraction share one rounding, retaining the small difference.'),
    step('compensated','compensated','Add the correction','fl(f + e)',kahan(a,b,c,d),'Combine the fused difference and residual. This is more arithmetic, not a fresh GPU benchmark.'),
  ];
  const exact=exactDet(a,b,c,d);let m=exact.m,exponent=exact.e;
  if(m===0n)exponent=0;
  else while(m%2n===0n){m/=2n;exponent++;}
  return {format:'arithmetic-execution-v1',execution:'Browser arithmetic; FMA emulated with BigInt, no GPU job',
    inputSemantics:'The entered numbers are first represented as binary64; the exact reference uses those binary inputs.',
    inputs,reference:toDouble(exact),referenceExact:`${m} × 2^${exponent}`,steps};
}
export type ArithmeticTrace=ReturnType<typeof arithmeticTrace>;
