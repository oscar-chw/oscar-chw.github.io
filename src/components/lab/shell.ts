// Shell-style keys for a single-line terminal input: Enter runs, ↑/↓ walk history (kept for the
// session; Ctrl+P/N too), Tab completes from history and suggestions, Ctrl+C cancels the line, Ctrl+L or ⌘K
// clears the screen, Ctrl+U/K kill before/after the cursor, Ctrl+A/E jump to start/end. Other keys keep
// their native behaviour. Ctrl+K stops propagating so it does not also open the site console.
interface ShellOptions { run: (cmd: string) => void; clear: () => void; cancel?: (line: string) => void; history: string; suggest?: () => string[] }

export function attachShell(input: HTMLInputElement, o: ShellOptions) {
  const key = `hist:${o.history}`;
  let hist: string[] = [];
  try { hist = JSON.parse(sessionStorage.getItem(key) ?? "[]"); } catch { /* storage blocked: history lives in memory */ }
  let pos = hist.length, draft = "";
  const save = () => { try { sessionStorage.setItem(key, JSON.stringify(hist.slice(-50))); } catch { /* ignore */ } };

  input.addEventListener("keydown", (e) => {
    const ctrl = e.ctrlKey && !e.metaKey && !e.altKey, k = e.key.toLowerCase(), at = input.selectionStart ?? input.value.length;
    if (e.key === "Enter") {
      e.preventDefault();
      const cmd = input.value.trim();
      if (!cmd) return;
      if (hist.at(-1) !== cmd) hist.push(cmd);
      pos = hist.length; draft = ""; save();
      input.value = "";
      o.run(cmd);
    } else if ((e.key === "ArrowUp" || (ctrl && k === "p")) && hist.length) {
      e.preventDefault();
      if (pos === hist.length) draft = input.value;
      pos = Math.max(0, pos - 1); input.value = hist[pos];
    } else if ((e.key === "ArrowDown" || (ctrl && k === "n")) && pos < hist.length) {
      e.preventDefault();
      pos++; input.value = pos === hist.length ? draft : hist[pos];
    } else if (e.key === "Tab" && input.value) {
      const pool = [...hist.slice().reverse(), ...(o.suggest?.() ?? [])];
      const hit = pool.find((c) => c.startsWith(input.value) && c !== input.value);
      if (hit) { e.preventDefault(); input.value = hit; }
    } else if (ctrl && k === "c") {
      e.preventDefault();
      if (input.value) o.cancel?.(input.value);
      input.value = ""; pos = hist.length;
    } else if ((ctrl && k === "l") || (e.metaKey && k === "k")) {
      e.preventDefault(); e.stopPropagation(); o.clear();
    } else if (ctrl && k === "u") {
      e.preventDefault(); input.value = input.value.slice(at); input.setSelectionRange(0, 0);
    } else if (ctrl && k === "k") {
      e.preventDefault(); e.stopPropagation(); input.value = input.value.slice(0, at);
    } else if (ctrl && (k === "a" || k === "e")) {
      e.preventDefault(); const i = k === "a" ? 0 : input.value.length; input.setSelectionRange(i, i);
    }
  });
}
