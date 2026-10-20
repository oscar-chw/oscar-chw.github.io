import {test,expect} from '@playwright/test';
for(const kind of ['lookahead','candles'])test(`${kind}: extreme valid inputs retain finite log results with an explicit percentage-display boundary`,async({page})=>{
 await page.goto(`/demos/#${kind}`);const p=page.locator(`[data-panel="${kind}"]`);
 const returns='step,return_pct\n'+Array.from({length:180},(_,i)=>`${i},-99`).join('\n');
 const candles='open_min,close_min,available_min,return_pct\n'+Array.from({length:180},(_,i)=>`${i*5},${i*5+5},${i*5+5},-99`).join('\n');
 await p.getByLabel(kind==='lookahead'?'Return records CSV':'Candle records CSV',{exact:true}).fill(kind==='lookahead'?returns:candles);
 await p.getByRole('button',{name:kind==='lookahead'?'Run backtest':'Run availability audit',exact:true}).click();
 await expect(p.locator('.ro')).not.toContainText(/Infinity|NaN/);
 await expect(p.locator('.ro')).toContainText('log units');
 await expect(p.locator('.ro')).toContainText('percentage out of range');
 const saved=page.waitForEvent('download');await p.getByRole('button',{name:'Export result',exact:true}).click();const stream=await(await saved).createReadStream(),chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(chunk);
 const data=JSON.parse(Buffer.concat(chunks).toString()).result,values=data.honest??data.equity;
 expect(values.every((v:unknown)=>typeof v==='number'&&Number.isFinite(v))).toBe(true);expect(values.at(-1)).toBeGreaterThan(700);
 await p.getByRole('button',{name:'Load correct example',exact:true}).click();await p.getByRole('button',{name:kind==='lookahead'?'Run backtest':'Run availability audit',exact:true}).click();
 await expect(p.locator('.ro')).not.toContainText('percentage out of range');await expect(p.locator('.ro')).toContainText('%');
});
