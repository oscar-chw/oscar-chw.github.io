// The site console (loaded on first use by the inline stub in Base.astro): plain words search the
// site; supported commands operate on a bounded virtual filesystem in this tab. Unsupported host
// commands are policy demonstrations only. No command reaches a host shell or private service.
const d = document.querySelector(".palette"), q = d.querySelector(".pq"), out = d.querySelector(".po");
// Inline experiment entries belong to the interactive console; add them only on
// first use so reading pages do not contain a second hidden set of demo links.
const template = d.querySelector("li");
for (const [title, href] of JSON.parse(d.dataset.experiments || "[]")) {
  const entry = template.cloneNode(true), a = entry.querySelector("a");
  a.href = href; a.querySelector(".k").textContent = "demo"; a.querySelector("span:last-child").textContent = title;
  d.querySelector(".pl").append(entry);
}
const items = [...d.querySelectorAll("li")], list = d.querySelector(".pl");
const prompt = d.querySelector(".prompt"), info = d.querySelector(".workspace-state");
const LOCAL = new Set("help man pwd ls tree cd cat head tail grep sort uniq wc echo mkdir touch cp mv rm rmdir find date uname which".split(" "));
let workspace, loading, attempts = 0, transcript = [], cancelledThrough = 0;
const workspaceReady = () => loading ??= (async () => {
  const moduleURL = new URL("terminal/shell.js", new URL(d.dataset.js, location.href));
  if (attempts++) moduleURL.searchParams.set("retry", String(attempts));
  const { WorkspaceShell } = await import(moduleURL.href);
  const dataURL = new URL("lab/corpus.json", new URL(d.dataset.js, location.href));
  const response = await fetch(dataURL);
  if (!response.ok) throw new Error(`Workspace sources HTTP ${response.status}`);
  const corpus = await response.json();
  if (!Array.isArray(corpus) || !corpus.every(p => p && typeof p.title === "string" && typeof p.text === "string" && typeof p.href === "string" && p.href.startsWith("/") && !p.href.startsWith("//"))) throw new Error("Invalid workspace sources");
  const files = {
    "/lab/versions.csv": "key,value,known\nprice,10,1\nprice,12.5,4\nvolume,100,2\n",
    "/lab/README.md": "Edit version records in the workbench: open data-workbench\nInspect sample rows: cat /lab/versions.csv | head -n 3\nThe sample is synthetic. Your workspace is local to this page.\n",
    "/projects/index.txt": items.map(li => li.textContent.trim() + " " + li.querySelector("a").getAttribute("href")).join("\n") + "\n",
  };
  for (const p of corpus) {
    const slug = p.href.split("/").filter(Boolean).slice(0, 2).join("-").replace(/[^a-z0-9-]/gi, "-");
    const path = `/projects/${slug}.txt`; files[path] = (files[path] || "") + `${p.title}\n${p.text}\n${p.href}\n\n`;
  }
  workspace = new WorkspaceShell(files); return workspace;
})().catch(error => { loading = null; throw error; });
let sel = 0;
const vis = () => items.filter((li) => !li.hidden);
const mark = () => vis().forEach((li, i) => li.toggleAttribute("aria-selected", i === sel));
const say = (t, replace = false) => {
  if (!t) transcript = []; else { if (replace) transcript.pop(); transcript.push(t); transcript = transcript.slice(-20); }
  out.textContent = transcript.join("\n\n"); out.hidden = !transcript.length;
  if (t) list.hidden = true;
  out.scrollTop = out.scrollHeight;
};
const reflectPath = () => { if (workspace) { const cwd = workspace.cwd.replace(/^\/home\/visitor(?=\/|$)/, "~"); prompt.textContent = `${cwd}$`; prompt.title = workspace.cwd; } };
const executeLocal = (raw, n) => {
  say(`$ ${raw}\nloading browser workspace…`);
  workspaceReady().then(sh => {
    if (n <= cancelledThrough) return;
    const result = sh.execute(raw);
    reflectPath();
    const pending = transcript.indexOf(`$ ${raw}\nloading browser workspace…`);
    if (pending >= 0) transcript[pending] = `$ ${raw}\n${result.output || "done"}`;
    out.textContent = transcript.join("\n\n");
    if (n === asked) { out.hidden = false; list.hidden = true; out.scrollTop = out.scrollHeight; }
  }, () => { if (n === asked) say(`$ ${raw}\nCould not load the workspace files. Run the command again to retry; page search still works.`, true); });
};
const editFile = (name, n) => {
  workspaceReady().then(sh => {
    if (n !== asked) return;
    const old = d.querySelector(".terminal-editor"); if (old) old.remove();
    const wrap = document.createElement("div"); wrap.className = "terminal-editor";
    const label = document.createElement("label"); label.textContent = "Browser file editor · saved in this page only; download to keep";
    const path = document.createElement("input"); path.value = name || "notes.txt"; path.setAttribute("aria-label", "Virtual file path");
    const text = document.createElement("textarea"); text.setAttribute("aria-label", "Virtual file contents"); text.setAttribute("data-lenis-prevent", ""); text.spellcheck = false; text.rows = 8;
    if (sh.files.has(sh.path(path.value))) text.value = sh.read(path.value);
    const error = document.createElement("p"); error.setAttribute("role", "alert"); error.hidden = true;
    const actions = document.createElement("div"); actions.className = "edit-actions";
    const close = () => { wrap.remove(); q.disabled = false; q.focus(); };
    const save = document.createElement("button"); save.type = "button"; save.textContent = "Save file";
    const persist = () => { try { sh.write(path.value, text.value); say(`Saved ${sh.path(path.value)} · ${text.value.length} characters`); close(); } catch(e) { error.textContent = e.message; error.hidden = false; } };
    save.addEventListener("click", persist);
    const download = document.createElement("button"); download.type = "button"; download.textContent = "Download text";
    download.addEventListener("click", () => { const url = URL.createObjectURL(new Blob([text.value], {type: "text/plain"})); const a = document.createElement("a"); a.href = url; a.download = path.value.split("/").pop() || "notes.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
    const cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "Cancel editing"; cancel.addEventListener("click", close);
    actions.append(save, download, cancel); label.append(path); wrap.append(label, text, error, actions); out.after(wrap); list.hidden = true; out.hidden = true; q.disabled = true;
    wrap.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); e.stopPropagation(); persist(); } });
    text.focus();
  }, () => say("Could not load the workspace. Run the editor command again to retry."));
};
const filter = () => {
  const raw = q.value.trim(), c = raw.split(/\s+/)[0].toLowerCase();
  const s = raw.toLowerCase().replace(/^(cd|open)\s+/, "");
  items.forEach(li => li.hidden = !!s && !li.textContent.toLowerCase().includes(s));
  list.hidden = !!raw && c !== "cd" && c !== "open" && (LOCAL.has(c) || SHELL.has(c) || c === "guard");
  out.hidden = !list.hidden || !transcript.length; sel = 0; mark();
};
export const open = (text = "", go = false) => {
  if (!d.open) d.showModal(); q.value = text; filter(); reflectPath(); q.focus();
  if (go && text.trim()) { remember(text.trim()); if (!run(text)) vis()[sel]?.querySelector("a")?.click(); }   // Enter was pressed while this file loaded
};
const mail = (subject) => (location.href = `mailto:${d.dataset.mail}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`);
const SHELL = new Set("rm rmdir git curl wget bash sh zsh sudo chmod chown dd mv cp find xargs echo cat rsync truncate shred python python3 perl node mkfs kill killall tar ln touch mkdir eval exec env npm pip docker".split(" "));
const looksShell = (s, c) => SHELL.has(c) || /[|;&>`$]|^:\(/.test(s);
let asked = 0;                                            // bumped by every command: only the latest one's output is shown
const judge = (cmd, virtual = false) => {
  const n = asked;
  say(`$ ${cmd}\nbooting the real guard (Python in WebAssembly)…`);
  import(new URL("lab/pyguard.js", new URL(d.dataset.js, location.href)).href).then((m) => m.loadGuard()).then((verdict) => {
    if (n !== asked) return;
    const why = verdict(cmd);
    if (why) say(`$ ${cmd}\n✗ blocked by guard.py: ${why}`, true);
    else if (virtual) {
      say(`$ ${cmd}\n✓ guard.py allows it; applying only to the browser workspace`, true);
      executeLocal(cmd, n);
    } else say(`$ ${cmd}\n✓ guard.py allows it; this host program is not available in the browser. No host command ran.`, true);
  }, () => n === asked && say(`$ ${cmd}\ncould not load the Python runtime (offline?), so this was not judged`));
};
const run = (raw) => {
  asked++;
  const input = raw.trim(), [command, ...rest] = input.split(/\s+/), c = command.toLowerCase(), s = input.toLowerCase(), arg = rest.join(" ");
  const replies = {
    help: "ls · cd NAME · whoami · cv · email · theme · clear\nshell commands (git push, curl | sh…) go to the real guard\nor type anything to search",
    ls: "work/  demos/  about  cv  card\n" + items.filter((li) => li.textContent.startsWith("project")).map((li) => li.textContent.replace(/^project/, "  ")).join("\n"),
    whoami: "oscar choi · cs @ cuhk, class of 2027\nquant dev · quant research · swe · full-stack · ai engineering\nstatus: open to work",
    ping: "pong",
    exit: "there is no exit. only more projects.",
    vim: "you are in vim now. (relax: esc gets you out)",
    coffee: "418 i'm a teapot",
    hello: "hi! try whoami, or ls",
    42: "the harbour's random seed. now you know.",
  };
  if (s === "sudo hire oscar") { say("[sudo] password for recruiter: ********\naccess granted. opening mail…"); setTimeout(() => mail("Let's talk"), 900); return true; }
  if (c === "sudo") { say("recruiter is not in the sudoers file. try: sudo hire oscar"); return true; }
  if (c === "guard") { if (arg) judge(input.slice(command.length).trim()); else say("usage: guard COMMAND · checks policy without running a host command"); return true; }
  if (c === "rm" && /(?:^|\s)-[a-z]*r[a-z]*(?:\s|$)/i.test(input)) { judge(input, true); return true; }
  if (c === "cd" && arg && !arg.includes("/") && arg !== "." && arg !== ".." && arg !== "~" && arg !== "-" && !workspace?.dirs.has(workspace.path(arg))) {
    const a = vis()[0]?.querySelector("a"); if (a) { a.click(); return true; }
  }
  if (c === "nano" || c === "edit" || c === "vim" && arg) { editFile(arg.replace(/^("|\')(.*)\1$/, "$2"), asked); return true; }
  if (LOCAL.has(c)) { executeLocal(input, asked); return true; }
  if (looksShell(s, c)) { judge(input); return true; }
  if (c === "clear") { q.value = ""; say(""); filter(); return true; }
  if (c === "history") { say(hist.map((line, i) => `${i + 1}  ${line}`).join("\n")); return true; }
  if (c === "cv") { location.href = d.dataset.cv; return true; }
  if (c === "email" || c === "contact") { mail(""); return true; }
  if (c === "theme") { document.querySelector(".theme").click(); say("theme switched"); return true; }
  if (c === "lights") { document.documentElement.classList.toggle("lights"); say("symphony of lights: 8 pm, every night"); return true; }
  if (c === "open" && rest[0] === "data-workbench" && rest.length > 1) {
    const n = asked, path = rest.slice(1).join(" ").replace(/^("|\')(.*)\1$/, "$2");
    workspaceReady().then(sh => {
      if (n !== asked) return;
      try {
        const csv = sh.read(path);
        if (new TextEncoder().encode(csv).length > 65536) throw new Error("Workbench input exceeds 64 KB.");
        sessionStorage.setItem("lab:pending-versions", csv);
        dispatchEvent(new Event("lab:versions-ready"));
        const a = items.map(li => li.querySelector("a")).find(a => a.getAttribute("href").endsWith("#data-workbench"));
        if (a) { d.close(); location.href = a.href; }
      } catch(e) { say(`open: ${e.message} · You can also download the file and import it in the workbench.`); }
    }, () => say("Could not load the workspace. Try again."));
    return true;
  }
  if (c === "open" && arg) { const a = items.map(li => li.querySelector("a")).find(a => a.getAttribute("href").split("#")[1] === arg) ?? vis()[0]?.querySelector("a"); if (a) { a.click(); return true; } say(`open: no such page: ${arg}`); return true; }
  if (Object.hasOwn(replies, c)) { say(replies[c]); return true; }   // own keys only: "constructor" is not a command
  if (c === "hi") { say(replies.hello); return true; }
  if (!vis().length && s) { say(`command not found: ${c} · try help`); return true; }
  return false;
};
// Shell keys: ↑/↓ (or Ctrl+P/N) walk history when the line is empty or already showing history, else move
// through results; Tab completes; Ctrl+C cancels; Ctrl+L or ⌘K clears; Ctrl+U/K kill; Ctrl+A/E jump.
// Off the Mac, Ctrl is the system modifier: Ctrl+A selects all and Ctrl+C with a selection copies, as usual.
const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
let hist = [];
try { const stored = JSON.parse(sessionStorage.getItem("hist:console") ?? "[]"); if (Array.isArray(stored) && stored.every(x => typeof x === "string")) hist = stored.slice(-50); } catch { /* storage blocked */ }
let hpos = hist.length;
const remember = (cmd) => { if (cmd && hist.at(-1) !== cmd) hist.push(cmd); hpos = hist.length; try { sessionStorage.setItem("hist:console", JSON.stringify(hist.slice(-50))); } catch { /* ignore */ } };
const setq = (t) => { q.value = t; filter(); q.setSelectionRange(t.length, t.length); };
const WORDS = [...LOCAL, "nano ", "edit ", "guard ", "open ", "whoami", "cv", "email", "theme", "clear", "history", "sudo hire oscar"];
q.addEventListener("input", () => { filter(); hpos = hist.length; });
q.addEventListener("keydown", (e) => {
  const v = vis(), ctrl = e.ctrlKey && !e.metaKey && !e.altKey, k = e.key.toLowerCase();
  const back = e.key === "ArrowUp" || (ctrl && k === "p"), fwd = e.key === "ArrowDown" || (ctrl && k === "n");
  if ((back && hist.length && (!q.value || hpos < hist.length)) || (fwd && hpos < hist.length)) {
    e.preventDefault(); hpos = Math.max(0, Math.min(hist.length, hpos + (back ? -1 : 1))); setq(hist[hpos] ?? ""); return;
  }
  if (e.key === "Tab" && q.value) {
    const hit = [...(workspace?.complete(q.value) ?? []), ...hist.slice().reverse(), ...WORDS].find((w) => w.startsWith(q.value) && w.trim() !== q.value);
    if (hit) { e.preventDefault(); setq(hit); } return;
  }
  if (ctrl && k === "c" && q.selectionStart === q.selectionEnd) { e.preventDefault(); cancelledThrough = asked; asked++; if (q.value) say(`$ ${q.value}^C`); setq(""); hpos = hist.length; return; }
  if ((ctrl && k === "l") || (e.metaKey && k === "k")) { e.preventDefault(); e.stopPropagation(); say(""); setq(""); return; }
  if (ctrl && k === "u") { e.preventDefault(); setq(q.value.slice(q.selectionStart)); q.setSelectionRange(0, 0); return; }
  if (ctrl && k === "k") { e.preventDefault(); e.stopPropagation(); q.value = q.value.slice(0, q.selectionStart); filter(); return; }
  if (MAC && ctrl && (k === "a" || k === "e")) { e.preventDefault(); const i = k === "a" ? 0 : q.value.length; q.setSelectionRange(i, i); return; }
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : v.length - 1)) % Math.max(1, v.length); mark(); v[sel]?.scrollIntoView({ block: "nearest" }); }
  if (e.key === "Enter") { e.preventDefault(); remember(q.value.trim()); if (!run(q.value)) v[sel]?.querySelector("a").click(); }
});
d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
list.addEventListener("click", (e) => { if (e.target.closest("a")) d.close(); });
      

for (const b of d.querySelectorAll("[data-console-example]")) b.addEventListener("click", () => {
  setq(b.dataset.consoleExample); remember(q.value); run(q.value); q.focus();
});
if (info) info.textContent = "Browser workspace · editable scratch files · no host access";
