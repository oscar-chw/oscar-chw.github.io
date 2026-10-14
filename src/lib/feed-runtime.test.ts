import { beforeAll, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadPyodide } from 'pyodide';
import { bindFeed, MODULES, COMMIT } from '../../public/lab/feed-runtime.js';

const root = new URL('../../public/lab/feed-gate/',import.meta.url);
const text = (name:string) => readFileSync(new URL(name,root),'utf8');
let run:(s:string)=>any;
beforeAll(async()=>{run=bindFeed(await loadPyodide(),Object.fromEntries(MODULES.map((n:string)=>[n,text(`replay/${n}`)])));},60_000);
test('real Python rejects the clock defect and the corrected bytes produce the hand-worked book',()=>{
  const bad=run(text('bad-clock.jsonl'));
  expect(bad.accepted).toBe(false);expect(bad.message).toContain('received <= available');
  const fixed=run(text('bad-clock.jsonl').replace('"available_ms":19','"available_ms":22'));
  expect(fixed.accepted).toBe(true);
  expect(fixed.rows.map((r:any)=>[r.status,r.bid_size,r.available_ms])).toEqual([['AVAILABLE',300,12],['AVAILABLE',100,22]]);
  expect(fixed.report.source_sha256).toBe(createHash('sha256').update(text('correct.jsonl')).digest('hex'));
});
test('duplicate fields, empty data and off-grid prices are refused by the actual source',()=>{
  expect(run('').accepted).toBe(false);
  expect(run(text('correct.jsonl').replace('"record_id":1','"record_id":1,"record_id":1')).message).toContain('duplicate');
  expect(run(text('correct.jsonl').replace('"price":"0.49"','"price":"0.49001"')).accepted).toBe(false);
});
test('a genuine gap remains unavailable rather than a reassuring invented book',()=>{
  const records=text('correct.jsonl').trim().split('\n').map(s=>JSON.parse(s));
  records.push({record_id:2,kind:'gap',received_ms:30,available_ms:30,reason:'disconnect'});
  const out=run(records.map(r=>JSON.stringify(r)).join('\n')+'\n');
  expect(out.accepted).toBe(true);expect(out.rows[2].status).toBe('GAP');expect(out.rows[2].bid_tick).toBeNull();
  expect(out.report.exchange_completeness_verified).toBe(false);
});
test('source pins and runtime revision bind the executable public copy',()=>{
  const manifest=JSON.parse(text('manifest.json'));expect(manifest.commit).toBe(COMMIT);
  for(const name of MODULES) expect(createHash('sha256').update(text(`replay/${name}`)).digest('hex')).toBe(manifest.files[`replay/${name}`].sha256);
});
test('workspace bounds count UTF-8 bytes and reject excessive records before Python',()=>{
  expect(()=>run('界'.repeat(23000))).toThrow('64 KB');
  expect(()=>run('{}\n'.repeat(202))).toThrow('200 records');
});
test('the static preview equals a fresh execution of the same pinned Python',()=>{
  const preview=JSON.parse(readFileSync(new URL('../../sources/site-experiments/feed-gate-preview.json',import.meta.url),'utf8'));
  expect(run(preview.broken_input).message).toBe(preview.error);
  const out=run(preview.corrected_input);
  expect(out.accepted).toBe(true);expect(out.rows).toEqual(preview.rows);expect(out.report).toEqual(preview.report);
});
