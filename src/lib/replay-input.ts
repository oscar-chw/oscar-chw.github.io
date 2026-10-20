import type {Event,Side} from './replay';
export function manualOrder(kind:string,side:string,priceText:string,qtyText:string,id:number,t:number):Exclude<Event,{kind:'cancel'}>{
  if(kind!=='limit'&&kind!=='market')throw new Error('Choose limit or market order.');
  if(side!=='buy'&&side!=='sell')throw new Error('Choose buy or sell side.');
  const qty=Number(qtyText);if(!qtyText.trim()||!Number.isSafeInteger(qty)||qty<1||qty>10000)throw new Error('Order quantity must be an integer from 1 to 10000.');
  if(kind==='market')return {kind,side:side as Side,qty,id,t};
  const price=Number(priceText);if(!priceText.trim()||!Number.isSafeInteger(price)||price<1||price>1e6)throw new Error('Order price must be an integer from 1 to 1000000 ticks.');
  return {kind,side:side as Side,price,qty,id,t};
}
