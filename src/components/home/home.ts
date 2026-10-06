// Home-page motion: name scramble, typed line, particle sky, scroll parallax, scroll-scrubbed
// story, magnetic buttons, cursor spotlight, tilt tiles. One "motionpause" switch (the harbour's
// Pause button) and prefers-reduced-motion stop everything that moves by itself.
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
let paused = false;
document.addEventListener("motionpause", (e) => { paused = (e as CustomEvent<boolean>).detail; document.documentElement.toggleAttribute("data-paused", paused); });

// ---------- name: letters decode into place ----------
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>/";
function scramble(el: HTMLElement) {
  const target = el.dataset.text ?? el.textContent ?? "";
  if (still) { el.textContent = target; return; }
  let f = 0;
  const id = setInterval(() => {
    f++;
    el.textContent = [...target].map((c, i) => (c === " " || i < f / 2.2 ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
    if (f > target.length * 2.2 + 2) { clearInterval(id); el.textContent = target; }
  }, 38);
}
document.querySelectorAll<HTMLElement>("[data-scramble]").forEach(scramble);

// ---------- typed line: cycles through what Oscar builds ----------
for (const el of document.querySelectorAll<HTMLElement>("[data-type]")) {
  const words: string[] = JSON.parse(el.dataset.type ?? "[]");
  if (still || words.length < 2) continue;
  let w = 0, n = words[0].length, dir = -1, hold = 40;
  setInterval(() => {
    if (paused) return;
    if (hold > 0) { hold--; return; }
    n += dir;
    if (n <= 0) { dir = 1; w = (w + 1) % words.length; }
    if (n >= words[w].length) { dir = -1; hold = 45; }
    el.textContent = words[w].slice(0, Math.max(0, n));
  }, 45);
}

// ---------- particle sky: drifting points, linked when close, pushed away by the cursor ----------
for (const cv of document.querySelectorAll<HTMLCanvasElement>("[data-sky]")) {
  const cx = cv.getContext("2d")!;
  let W = 0, H = 0, mx = -1e4, my = -1e4, visible = true;
  type P = { x: number; y: number; vx: number; vy: number };
  let ps: P[] = [];
  const colour = () => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#6ee6d7";
  let ink = colour();
  document.addEventListener("themechange", () => (ink = colour()));
  const size = () => {
    const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
    const n = Math.min(110, Math.round((W * H) / 11000));
    ps = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35 }));
  };
  const draw = () => {
    cx.clearRect(0, 0, W, H);
    cx.fillStyle = ink; cx.strokeStyle = ink;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
      if (d < 120 && d > 0) { p.vx += (dx / d) * 0.06; p.vy += (dy / d) * 0.06; }
      p.vx *= 0.985; p.vy *= 0.985;
      p.vx += (Math.random() - 0.5) * 0.02; p.vy += (Math.random() - 0.5) * 0.02;
      p.x = (p.x + p.vx + W) % W; p.y = (p.y + p.vy + H) % H;
      cx.globalAlpha = 0.7; cx.fillRect(p.x, p.y, 1.6, 1.6);
      for (let j = i + 1; j < ps.length; j++) {
        const q = ps[j], ex = p.x - q.x, ey = p.y - q.y, e = ex * ex + ey * ey;
        if (e < 9000) { cx.globalAlpha = 0.16 * (1 - e / 9000); cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(q.x, q.y); cx.stroke(); }
      }
    }
    cx.globalAlpha = 1;
  };
  const loop = () => { if (visible && !paused && !document.hidden) draw(); requestAnimationFrame(loop); };
  size(); draw();
  addEventListener("resize", size);
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(cv);
  const host = cv.parentElement!;
  host.addEventListener("pointermove", (e) => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
  host.addEventListener("pointerleave", () => { mx = my = -1e4; });
  if (!still) requestAnimationFrame(loop);
}

// ---------- parallax: hero text rises faster than the sky; harbour stays put ----------
const layers = [...document.querySelectorAll<HTMLElement>("[data-parallax]")];
if (!still && layers.length) {
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      if (y < innerHeight * 1.2) for (const l of layers) {
        const k = Number(l.dataset.parallax);
        l.style.transform = `translate3d(0, ${y * k}px, 0)`;
        if (l.dataset.fade !== undefined) l.style.opacity = String(Math.max(0, 1 - y / (innerHeight * 0.7)));
      }
      ticking = false;
    });
  }, { passive: true });
}

// ---------- magnetic buttons ----------
if (fine && !still) for (const b of document.querySelectorAll<HTMLElement>("[data-magnetic]")) {
  b.addEventListener("pointermove", (e) => {
    const r = b.getBoundingClientRect();
    b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.28}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
  });
  b.addEventListener("pointerleave", () => (b.style.transform = ""));
}

// ---------- 3D tilt tiles ----------
if (fine && !still) for (const t of document.querySelectorAll<HTMLElement>("[data-tilt]")) {
  t.addEventListener("pointermove", (e) => {
    const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    t.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(0)`;
    t.style.setProperty("--mx", `${(x + 0.5) * 100}%`); t.style.setProperty("--my", `${(y + 0.5) * 100}%`);
  });
  t.addEventListener("pointerleave", () => (t.style.transform = ""));
}

// ---------- cursor spotlight ----------
const spot = document.querySelector<HTMLElement>("[data-spotlight]");
if (spot && fine && !still) {
  addEventListener("pointermove", (e) => { spot.style.setProperty("--x", `${e.clientX}px`); spot.style.setProperty("--y", `${e.clientY}px`); spot.style.opacity = "1"; }, { passive: true });
}

// ---------- ticker: live BTC mid from the harbour ----------
for (const el of document.querySelectorAll<HTMLElement>("[data-ticker-mid]")) {
  let last = 0;
  document.addEventListener("harbourmid", (e) => {
    const { mid } = (e as CustomEvent<{ mid: number }>).detail, now = performance.now();
    if (now - last < 1000) return;
    last = now;
    el.textContent = mid.toLocaleString("en-US", { maximumFractionDigits: 1 });
  });
}

// ---------- boot sequence: real facts as a boot log, once per visit, any key skips ----------
const boot = document.querySelector<HTMLElement>("[data-boot]");
if (boot && !still) {
  let seen = false;
  try { seen = sessionStorage.getItem("booted") === "1" || localStorage.getItem("noboot") === "1"; } catch { /* storage blocked: show it */ }
  if (!seen) {
    const log = boot.querySelector("[data-boot-log]")!;
    const lines = [
      "<span class=ac>oscar@chw</span> boot v2026.10",
      "[<span class=ok> OK </span>] mounting market data ............ 700B+ rows",
      "[<span class=ok> OK </span>] c++20 order-book replay ......... 25×",
      "[<span class=ok> OK </span>] cuda state vector ............... 6×",
      "[<span class=ok> OK </span>] look-ahead guard ................ armed",
      "[<span class=ok> OK </span>] wss://stream.binance.com ........ connecting",
      "",
      "<span class=ac>&gt;</span> welcome",
    ];
    boot.hidden = false;
    let i = 0;
    const done = () => { boot.classList.add("done"); clearInterval(id); removeEventListener("keydown", done); boot.removeEventListener("pointerdown", done); try { sessionStorage.setItem("booted", "1"); } catch { /* ignore */ } setTimeout(() => (boot.hidden = true), 600); };
    const id = setInterval(() => { if (i < lines.length) log.innerHTML += lines[i++] + "\n"; else done(); }, 170);
    addEventListener("keydown", done, { once: true });
    boot.addEventListener("pointerdown", done, { once: true });
  }
}

// ---------- clock: Hong Kong time in the status line ----------
for (const el of document.querySelectorAll<HTMLElement>("[data-clock]")) {
  const tick = () => (el.textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Hong_Kong", hour: "2-digit", minute: "2-digit" }).format(new Date()));
  tick(); setInterval(tick, 15000);
}

// ---------- manifesto: words light up with scroll progress ----------
for (const m of document.querySelectorAll<HTMLElement>("[data-manifesto]")) {
  if (still) continue;
  const words = [...m.querySelectorAll<HTMLElement>(".say span")];
  const update = () => {
    const r = m.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
    const n = Math.round(p * words.length * 1.15);
    words.forEach((w, i) => w.toggleAttribute("data-on", i < n));
  };
  addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  update();
}

// ---------- easter eggs: the Konami code lights up the harbour; a note for whoever opens devtools ----------
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let kpos = 0;
addEventListener("keydown", (e) => {
  kpos = e.key === KONAMI[kpos] ? kpos + 1 : e.key === KONAMI[0] ? 1 : 0;
  if (kpos === KONAMI.length) { kpos = 0; document.documentElement.classList.toggle("lights"); }
});
console.log(
  "%c oscar@chw:~$ %c you opened devtools. we should talk: choiheiwang@gmail.com\n(try typing `sudo hire oscar` in the console on the page, or the Konami code)",
  "background:#6ee6d7;color:#05070c;font-family:monospace;padding:2px 4px",
  "color:#8b9aaa;font-family:monospace",
);
