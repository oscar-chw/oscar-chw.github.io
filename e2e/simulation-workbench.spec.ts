import {test,expect} from '@playwright/test';

test('circuit export contains parseable input and the computed normalized state',async({page})=>{
  await page.goto('/demos/#qubits');const p=page.locator('[data-panel="qubits"]');
  await p.getByRole('button',{name:'Bell state',exact:true}).click();
  const saved=page.waitForEvent('download');await p.getByRole('button',{name:'Export circuit and state',exact:true}).click();
  const stream=await (await saved).createReadStream(),chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);
  const r=JSON.parse(Buffer.concat(chunks).toString());expect(r.qubits).toBe(3);expect(r.gates).toHaveLength(2);expect(r.state).toHaveLength(8);
  expect(r.probabilities.reduce((a:number,b:number)=>a+b,0)).toBeCloseTo(1,12);expect(r.probabilities.filter((p:number)=>p>0.49)).toHaveLength(2);
});

test('market maker computes visitor flow and exposes fill, cash and inventory mechanics',async({page})=>{
  await page.goto('/demos/#marketmaking');const p=page.locator('[data-panel="marketmaking"]'),input=p.getByRole('textbox',{name:'Market flow CSV'});
  await expect(input).toBeVisible();await input.fill('fair,taker_value,side,qty\n100,101,1,1\n100,99,-1,1\n');
  await p.getByRole('button',{name:'Replay flow',exact:true}).click();
  const saved=page.waitForEvent('download');await p.getByRole('button',{name:'Export result',exact:true}).click();const stream=await (await saved).createReadStream(),chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);
  const r=JSON.parse(Buffer.concat(chunks).toString()).result;
  expect(r.inventory).toEqual([-1,0]);expect(r.pnl[1]).toBeCloseTo(0.38,10);expect(r.ledger[0].cash).toBeCloseTo(100.2,10);
  await p.getByRole('slider',{name:'Inspect flow event'}).fill('1');await expect(p.locator('.mm-inspect')).toContainText('inventory 0');
});
test('filter accepts observations and reports computation rather than an assumed planted truth',async({page})=>{
  await page.goto('/demos/#imc');const p=page.locator('[data-panel="imc"]'),input=p.getByRole('textbox',{name:'Observed mids CSV'});
  await expect(input).toBeVisible();await input.fill('mid,drift\n'+Array.from({length:25},()=> '100,0').join('\n'));
  await p.getByRole('button',{name:'Run filter',exact:true}).click();await expect(p.locator('.filter-ledger tbody tr')).toHaveCount(25);
  await expect(p.locator('.filter-inspect')).toContainText('slope 0.000');
  await input.fill('mid,drift\n-1,0\n');await p.getByRole('button',{name:'Run filter',exact:true}).click();await expect(p.locator('.we-status')).toContainText('mid');
});
test('factor candidates are editable and changing the market reseals the test',async({page})=>{
  await page.goto('/demos/#factors');const p=page.locator('[data-panel="factors"]'),input=p.getByRole('textbox',{name:'Candidate windows CSV'});
  await expect(input).toBeVisible();await input.fill('window,direction\n2,1\n7,-1\n');await p.getByRole('button',{name:'Score candidates',exact:true}).click();
  await expect(p.locator('.ic-row')).toHaveCount(2);await expect(p.locator('.icb.te.sealed')).toHaveCount(2);
  await p.getByRole('radio',{name:'open the chosen one'}).click();await expect(p.locator('.icb.te:not(.sealed)')).toHaveCount(1);
  await p.getByRole('button',{name:'new random market',exact:true}).click();await expect(p.locator('.icb.te.sealed')).toHaveCount(2);
  await p.getByRole('slider',{name:'Inspect scoring day'}).fill('80');await expect(p.locator('.factor-pairs tbody tr')).toHaveCount(30);
});
test('noise search accepts a seed, identifies the chosen candidate and shows an inspectable ranking',async({page})=>{
  await page.goto('/demos/#multitest');const p=page.locator('[data-panel="multitest"]'),input=p.getByRole('textbox',{name:'candidate seed offset'});
  await expect(input).toBeVisible();await input.fill('42');await p.getByRole('button',{name:'Run search',exact:true}).click();
  await p.getByRole('slider',{name:'random formulas searched'}).fill('60');await expect(p.locator('.noise-candidates tbody tr')).toHaveCount(60);
  await expect(p.locator('.noise-candidates tr[data-chosen="true"]')).toHaveCount(1);
  await input.fill('bad');await p.getByRole('button',{name:'Run search',exact:true}).click();await expect(p.locator('.noise-error')).toContainText('seed');
});
test('visitors can schedule each writer and observe an actual overwrite or retry',async({page})=>{
  await page.goto('/demos/#lostupdates');const p=page.locator('[data-panel="lostupdates"]'),a=p.getByRole('button',{name:'Step writer A',exact:true}),b=p.getByRole('button',{name:'Step writer B',exact:true});
  await expect(a).toBeVisible();await a.click();await b.click();await a.click();await b.click();
  await expect(p.locator('.lu-manual-result')).toContainText('record 1');await expect(p.locator('.lu-manual-result')).toContainText('lost');
  await p.getByRole('radio',{name:'compare-and-swap'}).click();await a.click();await b.click();await a.click();await b.click();
  await expect(p.locator('.lu-manual-result')).toContainText('retry');await b.click();await b.click();await expect(p.locator('.lu-manual-result')).toContainText('record 2');
});
test('qubit circuit limit is explicit and undo restores a usable gate button',async({page})=>{
  await page.goto('/demos/#qubits');const p=page.locator('[data-panel="qubits"]'),status=p.locator('.qubit-status');await expect(status).toBeVisible();
  const h=p.getByRole('button',{name:'H',exact:true});for(let i=0;i<24;i++)await h.click();
  await expect(status).toContainText('limit');await expect(h).toBeDisabled();await p.getByRole('button',{name:'Undo last gate',exact:true}).click();await expect(h).toBeEnabled();
  await expect(p.locator('.qubit-norm')).toContainText('1.000000');
});
test('order book accepts and cancels a visitor limit order and rejects invalid quantity',async({page})=>{
  await page.goto('/demos/order-book/');const price=page.getByLabel('Order price (ticks)',{exact:true});await expect(price).toBeVisible();
  await page.getByLabel('Order kind',{exact:true}).selectOption('limit');await page.getByLabel('Order side',{exact:true}).selectOption('buy');await price.fill('9000');await page.getByLabel('Order quantity',{exact:true}).fill('3');
  await page.getByRole('button',{name:'Submit local order',exact:true}).click();await expect(page.locator('.manual-orders')).toContainText('resting 3');
  await page.getByRole('button',{name:/Cancel order/}).click();await expect(page.locator('.manual-orders')).toContainText('cancelled');
  await page.getByLabel('Order quantity',{exact:true}).fill('0');await page.getByRole('button',{name:'Submit local order',exact:true}).click();await expect(page.locator('.manual-order-status')).toContainText('quantity');
});
test('blueprint explorer switches recorded assumptions and exports an explicitly recorded result',async({page})=>{
  await page.goto('/demos/crypto-desk/');const study=page.getByLabel('Recorded study',{exact:true});await expect(study).toBeVisible();
  await study.selectOption('kelly');await page.getByLabel('Recorded assumption',{exact:true}).selectOption('overestimated');await expect(page.locator('.recorded-insight')).toContainText('overestimated');
  const saved=page.waitForEvent('download');await page.getByRole('button',{name:'Export recorded comparison',exact:true}).click();const stream=await (await saved).createReadStream(),chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);
  const r=JSON.parse(Buffer.concat(chunks).toString());expect(r.recorded).toBe(true);expect(r.source.commit).toBe('2d82aed');expect(r.variant).toBe('overestimated');
});
test('FatQat recorded explorer exposes the full comparison and selected-row provenance',async({page})=>{
  await page.goto('/demos/#fatqat-bench');const p=page.locator('[data-panel="fatqat-bench"]');
  const exportButton=p.getByRole('button',{name:'Export selected measurement',exact:true});await expect(exportButton).toBeVisible();
  await p.getByText('Compare all recorded rows',{exact:true}).click();await expect(p.locator('.fb-table tbody tr')).toHaveCount(12);
  const saved=page.waitForEvent('download');await exportButton.click();const stream=await (await saved).createReadStream(),chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);
  const r=JSON.parse(Buffer.concat(chunks).toString());expect(r.recorded).toBe(true);expect(r.row.qubits).toBe(24);expect(r.row.mode).toBe('compensated');expect(r.source.measured_code_revision).toBeTruthy();
});

test('inspecting a different recorded row updates its controls and exported measurement together',async({page})=>{
  await page.goto('/demos/#fatqat-bench');const p=page.locator('[data-panel="fatqat-bench"]');
  await p.getByText('Compare all recorded rows',{exact:true}).click();
  await p.getByRole('button',{name:'Inspect plain full_state 28',exact:true}).click();
  await expect(p.locator('.fb-compare')).toHaveAttribute('open','');
  await expect(p.getByRole('radio',{name:'28',exact:true})).toBeChecked();
  await expect(p.getByRole('radio',{name:'plain',exact:true})).toBeChecked();
  await expect(p.getByRole('radio',{name:'full state',exact:true})).toBeChecked();
  const saved=page.waitForEvent('download');await p.getByRole('button',{name:'Export selected measurement',exact:true}).click();
  const stream=await (await saved).createReadStream(),chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);
  const r=JSON.parse(Buffer.concat(chunks).toString());expect(r.row).toMatchObject({qubits:28,mode:'plain',output:'full_state'});
  expect(r.computed_ratio).toBe(r.row.cpu_median_ms/r.row.gpu_median_ms);
});
