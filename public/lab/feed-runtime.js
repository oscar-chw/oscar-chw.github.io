// Executes the pinned public Python implementation; never evaluates visitor code.
export const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
export const COMMIT = 'f8c48256e12b96523807ba8f59c04b798517e04e';
export const MAX_BYTES = 64 * 1024;
export const MODULES = ['__init__.py', 'book.py', 'feed.py', 'admission.py'];

export function bindFeed(py, sources) {
  py.FS.mkdirTree('/home/pyodide/site_feed/replay');
  for (const name of MODULES) py.FS.writeFile(`/home/pyodide/site_feed/replay/${name}`, sources[name]);
  py.runPython(`
import sys, json, hashlib
sys.path.insert(0, '/home/pyodide/site_feed')
from replay.admission import admit
def _site_feed_admit(text):
    raw = text.encode('utf-8')
    digest = hashlib.sha256(raw).hexdigest()
    try:
        header, rows, report = admit(raw)
        result = {'accepted': True, 'header': header, 'rows': rows, 'report': report}
    except (ValueError, TypeError) as error:
        result = {'accepted': False, 'errorType': type(error).__name__, 'message': str(error)}
    result['input_sha256'] = digest
    return json.dumps(result, allow_nan=False)
`);
  const run = py.globals.get('_site_feed_admit');
  return (text) => {
    if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('Use at most 64 KB of input.');
    if (text.split(/\r?\n/).filter(s=>s.trim()).length > 201) throw new Error('Use at most 200 records plus the header.');
    return JSON.parse(run(text));
  };
}

const hash = async (bytes) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
let ready = null, attempt = 0;
export function loadFeed(base) {
  ready ??= (async () => {
    const root = new URL(`${base.replace(/\/$/, '')}/lab/feed-gate/`, location.origin);
    const get = async (name) => {
      const response = await fetch(new URL(name, root));
      if (!response.ok) throw new Error(`Python source ${name}: HTTP ${response.status}`);
      return response.text();
    };
    const source = JSON.parse(await get('manifest.json'));
    if (source.commit !== COMMIT) throw new Error('Python source revision does not match this demo.');
    const sources = {};
    for (const name of MODULES) {
      const text = await get(`replay/${name}`);
      if (await hash(new TextEncoder().encode(text)) !== source.files[`replay/${name}`].sha256) throw new Error(`Python source checksum mismatch: ${name}`);
      sources[name] = text;
    }
    const {loadPyodide} = await import(`${PYODIDE}pyodide.mjs${attempt++ ? `?feed_retry=${attempt}` : ''}`);
    return {run:bindFeed(await loadPyodide({indexURL:PYODIDE}), sources), source};
  })();
  ready.catch(()=>{ready=null;});
  return ready;
}
