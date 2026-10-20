import {beforeAll,test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadPyodide} from 'pyodide';
import {bindDNA,COMMIT,MODULES} from '../../public/lab/dna-runtime.js';
const root=new URL('../../public/lab/dna-codec/',import.meta.url);
const read=(name:string)=>readFileSync(new URL(name,root),'utf8');
let run:(action:string,text:string)=>any;
beforeAll(async()=>{run=bindDNA(await loadPyodide(),Object.fromEntries(MODULES.map((name:string)=>[name,read(name)])));},60_000);
test('pinned Python bytes retain upstream provenance',()=>{
 const m=JSON.parse(read('manifest.json'));expect(m.commit).toBe(COMMIT);
 for(const name of MODULES)expect(createHash('sha256').update(read(name)).digest('hex')).toBe(m.files[name].sha256);
});
test('actual Python recovers Unicode after a missing fragment and refuses ambiguous loss',()=>{
 const original='a'.repeat(1050)+'界🦉',bundle=run('encode',original).bundle;
 const received={...bundle,fragments:bundle.fragments.filter((f:any)=>f.kind!=='data'||f.index!==0)};
 const result=run('recover',JSON.stringify(received));expect(result.ok).toBe(true);expect(result.text).toBe(original);expect(result.report.recovered_indices).toEqual([0]);
 received.fragments=received.fragments.filter((f:any)=>f.kind!=='data'||f.index!==1);
 const refused=run('recover',JSON.stringify(received));expect(refused.ok).toBe(false);expect(refused.message).toContain('unrecoverable');expect(refused.text).toBeUndefined();
});
test('damaged fragment is detected before parity repair and manifest corruption is refused',()=>{
 const bundle=run('encode','safe payload').bundle;
 bundle.fragments[0].record.strand='T'+bundle.fragments[0].record.strand.slice(1);
 const result=run('recover',JSON.stringify(bundle));expect(result.ok).toBe(true);expect(result.text).toBe('safe payload');expect(result.report.invalid_fragments[0].reason).toContain('checksum');
 bundle.manifest.byte_length+=1;
 expect(run('recover',JSON.stringify(bundle)).ok).toBe(false);
});
test('browser limits, empty payload, duplicate JSON fields and unsupported actions stay explicit',()=>{
 expect(()=>run('encode','a'.repeat(8193))).toThrow('limit');
 expect(()=>run('recover','a'.repeat(131073))).toThrow('limit');
 expect(()=>run('execute','anything')).toThrow('Unknown');
 const empty=run('encode','').bundle;expect(run('recover',JSON.stringify(empty))).toMatchObject({ok:true,text:''});
 expect(run('recover','{"schema":1,"schema":2}')).toMatchObject({ok:false,message:expect.stringContaining('duplicate')});
});
