import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {EXPERIMENTS} from '../src/data/lab.ts';
const root='docs/all-demo-audit/';
const data=JSON.parse(readFileSync(root+'coverage.json','utf8'));
const renders=JSON.parse(readFileSync(root+'baseline/renders.json','utf8'));
let final;
if(process.argv.includes('--complete')){
  assert(data.final_receipt&&existsSync(data.final_receipt),'Final execution receipt missing');
  final=JSON.parse(readFileSync(data.final_receipt,'utf8'));
  assert.equal(final.exit,0,'Final browser journeys did not pass');
  assert(final.source_hashes&&Object.keys(final.source_hashes).length>0,'Final source pins missing');
  for(const [path,hash] of Object.entries(final.source_hashes))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash,`Source changed after verification: ${path}`);
  const log=readFileSync(final.browser_log,'utf8');
  assert.equal(createHash('sha256').update(log).digest('hex'),final.browser_log_sha256,'Browser evidence changed');
  assert(/\d+ passed/.test(log)&&!/^\s+\d+ failed/m.test(log),'Final browser log must report passing tests without failures');
  final.renders=JSON.parse(readFileSync(final.render_receipt,'utf8'));
  assert.equal(final.renders.length,EXPERIMENTS.length*4,'Final renders do not cover both engines and sizes');
  const compiler=data.requested_routes?.find(r=>r.id==='compiler');
  assert(compiler&&compiler.status==='unavailable-private-source'&&existsSync(compiler.receipt),'Compiler disposition must stay explicit');
}
assert.deepEqual(data.demos.map(d=>d.id).sort(),EXPERIMENTS.map(d=>d.id).sort(),'Coverage must equal the registered demos');
for(const d of data.demos){
  for(const key of ['execution','inputs','normal','boundary','repair','reset','provenance','journey','principle','intermediate','tradeoff'])assert.equal(typeof d[key],'string',`${d.id}: missing ${key}`);
  for(const key of ['execution','inputs','normal','boundary','repair','reset','provenance','journey','principle','intermediate','tradeoff'])assert(d[key].length>15,`${d.id}: empty ${key}`);
  assert(Array.isArray(d.sources)&&d.sources.length,`${d.id}: source absent`);
  for(const p of d.sources)assert(existsSync(p),`${d.id}: source missing ${p}`);
  assert(Array.isArray(d.gaps),`${d.id}: gap assessment absent`);
  for(const engine of ['chromium','webkit'])for(const width of [375,1280]){
    const r=renders.find(r=>r.id===d.id&&r.engine===engine&&r.width===width);
    assert(r&&existsSync(r.shot),`${d.id}: missing ${engine}/${width} render`);
  }
  if(process.argv.includes('--complete')){
    assert.equal(d.gaps.length,0,`${d.id}: unresolved ${d.gaps.join('; ')}`);
    assert.equal(d.status,'verified',`${d.id}: not verified`);
    assert(d.verification&&d.verification.exit===0&&existsSync(d.verification.receipt),`${d.id}: execution receipt absent`);
    for(const engine of ['chromium','webkit'])for(const width of [375,1280]){
      const matches=final.renders.filter(r=>r.id===d.id&&r.engine===engine&&r.width===width);
      assert.equal(matches.length,1,`${d.id}: missing or duplicate final render`);
      const r=matches[0];assert.equal(r.overflow,0,`${d.id}: final overflow`);assert.deepEqual(r.errors,[],`${d.id}: final page errors`);assert(existsSync(r.shot),`${d.id}: final screenshot absent`);
    }
    for(const path of d.sources)assert(final.source_hashes[path],`${d.id}: source not pinned ${path}`);
  }
}
console.log(`Coverage: ${data.demos.length} demos; ${data.demos.filter(d=>d.gaps.length).length} with outstanding gaps. ${process.argv.includes('--complete')?'Local interaction contract verified; private compiler unavailable, independent review and publication held.':'Inventory only; not completion.'}`);
