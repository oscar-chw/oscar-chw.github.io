// Runs the licensed, unchanged Python codec. Visitor text is data, never code.
export const COMMIT='b8a7089416399179dd40851871e73ad1eadcefdd';
export const MODULES=['__init__.py','codec.py','fragments.py'];
export const MAX_BYTES=8192;
const PYODIDE='https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
export function bindDNA(py,sources){
  py.FS.mkdirTree('/home/pyodide/site_dna');
  for(const name of MODULES)py.FS.writeFile(`/home/pyodide/site_dna/${name}`,sources[name]);
  py.runPython(`
import sys, json
sys.path.insert(0, '/home/pyodide')
from site_dna.fragments import encode_bundle, recover_bundle, load_bundle
from site_dna.codec import CodecError
def _site_dna_run(action, text):
    try:
        if action == 'encode':
            raw = text.encode('utf-8')
            if len(raw) > 8192:
                raise CodecError('Use at most 8192 UTF-8 bytes in this browser tool.')
            return json.dumps({'ok': True, 'bundle': encode_bundle(raw)})
        bundle = load_bundle(text.encode('utf-8'))
        if not isinstance(bundle, dict) or not isinstance(bundle.get('manifest'), dict):
            raise CodecError('Expected a fragment bundle with a manifest.')
        length = bundle['manifest'].get('byte_length')
        if type(length) is not int or not 0 <= length <= 8192:
            raise CodecError('This browser tool admits at most 8192 payload bytes.')
        raw, report = recover_bundle(bundle)
        return json.dumps({'ok': True, 'text': raw.decode('utf-8'), 'report': report})
    except (CodecError, UnicodeError) as error:
        return json.dumps({'ok': False, 'message': str(error)})
`);
  const run=py.globals.get('_site_dna_run');
  return (action,text)=>{
    if(!['encode','recover'].includes(action))throw new Error('Unknown DNA operation.');
    if(typeof text!=='string'||new TextEncoder().encode(text).length>(action==='encode'?MAX_BYTES:128*1024))throw new Error('DNA input exceeds the browser limit.');
    return JSON.parse(run(action,text));
  };
}
let ready,attempt=0;
export function loadDNA(base){
  ready??=(async()=>{
    const root=new URL(`${base.replace(/\/$/,'')}/lab/dna-codec/`,location.origin);
    const get=async name=>{const r=await fetch(new URL(name,root));if(!r.ok)throw new Error(`DNA source ${name}: HTTP ${r.status}`);return r.text();};
    const manifest=JSON.parse(await get('manifest.json'));
    if(manifest.commit!==COMMIT)throw new Error('DNA source revision mismatch.');
    const sources={};
    for(const name of MODULES){const text=await get(name),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==manifest.files[name]?.sha256)throw new Error(`DNA source checksum mismatch: ${name}`);sources[name]=text;}
    const {loadPyodide}=await import(`${PYODIDE}pyodide.mjs${attempt++?`?dna_retry=${attempt}`:''}`);
    return bindDNA(await loadPyodide({indexURL:PYODIDE}),sources);
  })();ready.catch(()=>{ready=undefined;});return ready;
}
