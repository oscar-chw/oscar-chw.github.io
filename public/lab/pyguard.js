// The real agent-harness guard, in the browser: Pyodide (CPython compiled to WebAssembly) imports
// guard.py next to this file, an unmodified copy of content/hooks/guard.py from github.com/oscar-chw/agent-harness,
// and every verdict comes from its own verdict(). Loaded on first use (about 12 MB, cached by the browser).
// One module for the Lab and the top-bar console, so a page boots Python at most once.
export const GUARD_SOURCE = { repo: "oscar-chw/agent-harness", path: "content/hooks/guard.py", commit: "8be558d" };
export const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";

// Shared with the unit test, which boots the npm build of the same Pyodide in node.
export function bind(py, src) {
  py.FS.writeFile("/home/pyodide/guard.py", src);        // imported as a module: __name__ is "guard", main() never runs
  py.runPython("import sys; sys.path.insert(0, '/home/pyodide'); import guard");
  const verdict = py.pyimport("guard").verdict;
  return (cmd) => { const r = verdict(cmd); return r == null ? null : String(r); };
}

let ready = null;
export function loadGuard() {
  ready ??= (async () => {
    const { loadPyodide } = await import(`${PYODIDE}pyodide.mjs`);
    const py = await loadPyodide({ indexURL: PYODIDE });
    return bind(py, await (await fetch(new URL("guard.py", import.meta.url))).text());
  })();
  ready.catch(() => (ready = null));                      // a failed load can be retried
  return ready;
}
