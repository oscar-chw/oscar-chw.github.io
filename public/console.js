// The site console (loaded on first use by the inline stub in Base.astro): plain words search the
// site, a few shell commands work, and some do not do what a shell would.
const d = document.querySelector(".palette"), q = d.querySelector(".pq"), out = d.querySelector(".po");
const items = [...d.querySelectorAll("li")];
let sel = 0;
const vis = () => items.filter((li) => !li.hidden);
const mark = () => vis().forEach((li, i) => li.toggleAttribute("aria-selected", i === sel));
const say = (t) => { out.textContent = t; out.hidden = !t; };
const filter = () => { const s = q.value.toLowerCase().trim().replace(/^(cd|open)\s+/, ""); items.forEach((li) => (li.hidden = !!s && !li.textContent.toLowerCase().includes(s))); sel = 0; mark(); };
export const open = (text = "") => { if (!d.open) d.showModal(); q.value = text; say(""); filter(); q.focus(); };
const mail = (subject) => (location.href = `mailto:${d.dataset.mail}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`);
const run = (raw) => {
  const s = raw.trim().toLowerCase(), [c, ...rest] = s.split(/\s+/), arg = rest.join(" ");
  const btc = document.querySelector("[data-ticker-mid]")?.textContent;
  const replies = {
    help: "ls · cd NAME · whoami · cv · email · theme · btc · clear\nor type anything to search",
    ls: "work/  demos/  about  cv  card\n" + items.filter((li) => li.textContent.startsWith("project")).map((li) => li.textContent.replace(/^project/, "  ")).join("\n"),
    whoami: "oscar choi · cs @ cuhk, class of 2027\nquant dev · quant research · swe · full-stack · ai engineering\nstatus: open to work",
    btc: btc && /\d/.test(btc) ? `BTCUSDT ${btc} (live from the harbour)` : "the live book runs on the home page: cd home",
    ping: "pong · 0.09 s (one stock-day, cold)",
    exit: "there is no exit. only more projects.",
    vim: "you are in vim now. (relax: esc gets you out)",
    coffee: "418 i'm a teapot",
    hello: "hi! try whoami, or ls",
    42: "the harbour's random seed. now you know.",
  };
  if (s === "sudo hire oscar") { say("[sudo] password for recruiter: ********\naccess granted. opening mail…"); setTimeout(() => mail("Let's talk"), 900); return true; }
  if (c === "sudo") { say("recruiter is not in the sudoers file. try: sudo hire oscar"); return true; }
  if (c === "rm") { say("rm: permission denied\nthe look-ahead guard blocks destructive commands"); return true; }
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
q.addEventListener("input", () => { say(""); filter(); });
q.addEventListener("keydown", (e) => {
  const v = vis();
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : v.length - 1)) % Math.max(1, v.length); mark(); v[sel]?.scrollIntoView({ block: "nearest" }); }
  if (e.key === "Enter") { e.preventDefault(); if (!run(q.value)) v[sel]?.querySelector("a").click(); }
});
d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
      
