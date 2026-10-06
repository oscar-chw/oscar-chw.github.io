// The site console (loaded on first use by the inline stub in Base.astro): plain words search the
// site, a few shell commands work, and anything that looks like a real shell command is judged by the
// real agent-harness guard (lab/pyguard.js: guard.py in Pyodide). Nothing typed here is ever executed.
const d = document.querySelector(".palette"), q = d.querySelector(".pq"), out = d.querySelector(".po");
const items = [...d.querySelectorAll("li")];
let sel = 0;
const vis = () => items.filter((li) => !li.hidden);
const mark = () => vis().forEach((li, i) => li.toggleAttribute("aria-selected", i === sel));
const say = (t) => { out.textContent = t; out.hidden = !t; };
const filter = () => { const s = q.value.toLowerCase().trim().replace(/^(cd|open)\s+/, ""); items.forEach((li) => (li.hidden = !!s && !li.textContent.toLowerCase().includes(s))); sel = 0; mark(); };
export const open = (text = "", go = false) => {
  if (!d.open) d.showModal(); q.value = text; say(""); filter(); q.focus();
  if (go && text.trim()) { remember(text.trim()); if (!run(text)) vis()[sel]?.querySelector("a")?.click(); }   // Enter was pressed while this file loaded
};
const mail = (subject) => (location.href = `mailto:${d.dataset.mail}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`);
const SHELL = new Set("rm rmdir git curl wget bash sh zsh sudo chmod chown dd mv cp find xargs echo cat rsync truncate shred python python3 perl node mkfs kill killall tar ln touch mkdir eval exec env npm pip docker".split(" "));
const looksShell = (s, c) => SHELL.has(c) || /[|;&>`$]|^:\(/.test(s);
let asked = 0;                                            // only the latest command's verdict is shown
const judge = (cmd) => {
  const n = ++asked;
  say(`$ ${cmd}\nbooting the real guard (Python in WebAssembly)…`);
  import(new URL("lab/pyguard.js", new URL(d.dataset.js, location.href)).href).then((m) => m.loadGuard()).then((verdict) => {
    if (n !== asked) return;
    const why = verdict(cmd);
    say(why ? `$ ${cmd}\n✗ blocked by guard.py: ${why}` : `$ ${cmd}\n✓ guard.py allows it (nothing ran: this is a website)`);
  }, () => n === asked && say(`$ ${cmd}\ncould not load the Python runtime (offline?), so this was not judged`));
};
const run = (raw) => {
  const s = raw.trim().toLowerCase(), [c, ...rest] = s.split(/\s+/), arg = rest.join(" ");
  const replies = {
    help: "ls · cd NAME · whoami · cv · email · theme · clear\nshell commands (git push, curl | sh…) go to the real guard\nor type anything to search",
    ls: "work/  demos/  about  cv  card\n" + items.filter((li) => li.textContent.startsWith("project")).map((li) => li.textContent.replace(/^project/, "  ")).join("\n"),
    whoami: "oscar choi · cs @ cuhk, class of 2027\nquant dev · quant research · swe · full-stack · ai engineering\nstatus: open to work",
    ping: "pong · 0.09 s (one stock-day, cold)",
    exit: "there is no exit. only more projects.",
    vim: "you are in vim now. (relax: esc gets you out)",
    coffee: "418 i'm a teapot",
    hello: "hi! try whoami, or ls",
    42: "the harbour's random seed. now you know.",
  };
  if (s === "sudo hire oscar") { say("[sudo] password for recruiter: ********\naccess granted. opening mail…"); setTimeout(() => mail("Let's talk"), 900); return true; }
  if (c === "sudo") { say("recruiter is not in the sudoers file. try: sudo hire oscar"); return true; }
  if (looksShell(s, c)) { judge(raw.trim()); return true; }
  if (c === "clear") { q.value = ""; say(""); filter(); return true; }
  if (c === "cv") { location.href = d.dataset.cv; return true; }
  if (c === "email" || c === "contact") { mail(""); return true; }
  if (c === "theme") { document.querySelector(".theme").click(); say("theme switched"); return true; }
  if (c === "lights") { document.documentElement.classList.toggle("lights"); say("symphony of lights: 8 pm, every night"); return true; }
  if ((c === "cd" || c === "open") && arg) { const a = vis()[0]?.querySelector("a"); if (a) { a.click(); return true; } say(`cd: no such page: ${arg}`); return true; }
  if (Object.hasOwn(replies, c)) { say(replies[c]); return true; }   // own keys only: "constructor" is not a command
  if (c === "hi") { say(replies.hello); return true; }
  if (!vis().length && s) { say(`command not found: ${c} · try help`); return true; }
  return false;
};
// Shell keys: ↑/↓ (or Ctrl+P/N) walk history when the line is empty or already showing history, else move
// through results; Tab completes; Ctrl+C cancels; Ctrl+L or ⌘K clears; Ctrl+U/K kill; Ctrl+A/E jump.
let hist = [];
try { hist = JSON.parse(sessionStorage.getItem("hist:console") ?? "[]"); } catch { /* storage blocked */ }
let hpos = hist.length;
const remember = (cmd) => { if (cmd && hist.at(-1) !== cmd) hist.push(cmd); hpos = hist.length; try { sessionStorage.setItem("hist:console", JSON.stringify(hist.slice(-50))); } catch { /* ignore */ } };
const setq = (t) => { q.value = t; filter(); q.setSelectionRange(t.length, t.length); };
const WORDS = ["help", "ls", "cd ", "whoami", "cv", "email", "theme", "clear", "sudo hire oscar"];
q.addEventListener("input", () => { say(""); filter(); hpos = hist.length; });
q.addEventListener("keydown", (e) => {
  const v = vis(), ctrl = e.ctrlKey && !e.metaKey && !e.altKey, k = e.key.toLowerCase();
  const back = e.key === "ArrowUp" || (ctrl && k === "p"), fwd = e.key === "ArrowDown" || (ctrl && k === "n");
  if ((back && hist.length && (!q.value || hpos < hist.length)) || (fwd && hpos < hist.length)) {
    e.preventDefault(); hpos = Math.max(0, Math.min(hist.length, hpos + (back ? -1 : 1))); setq(hist[hpos] ?? ""); return;
  }
  if (e.key === "Tab" && q.value) {
    const hit = [...hist.slice().reverse(), ...WORDS].find((w) => w.startsWith(q.value) && w !== q.value);
    if (hit) { e.preventDefault(); setq(hit); } return;
  }
  if (ctrl && k === "c") { e.preventDefault(); if (q.value) say(`$ ${q.value}^C`); setq(""); hpos = hist.length; return; }
  if ((ctrl && k === "l") || (e.metaKey && k === "k")) { e.preventDefault(); e.stopPropagation(); say(""); setq(""); return; }
  if (ctrl && k === "u") { e.preventDefault(); setq(q.value.slice(q.selectionStart)); q.setSelectionRange(0, 0); return; }
  if (ctrl && k === "k") { e.preventDefault(); e.stopPropagation(); q.value = q.value.slice(0, q.selectionStart); filter(); return; }
  if (ctrl && (k === "a" || k === "e")) { e.preventDefault(); const i = k === "a" ? 0 : q.value.length; q.setSelectionRange(i, i); return; }
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : v.length - 1)) % Math.max(1, v.length); mark(); v[sel]?.scrollIntoView({ block: "nearest" }); }
  if (e.key === "Enter") { e.preventDefault(); remember(q.value.trim()); if (!run(q.value)) v[sel]?.querySelector("a").click(); }
});
d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
      
