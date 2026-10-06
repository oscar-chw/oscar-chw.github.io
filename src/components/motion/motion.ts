// Site-wide motion: inertial smooth scroll, a custom cursor that names what it is over,
// headlines that build word by word as they enter, magnetic buttons, a light that follows the
// pointer across glass. Everything is off under prefers-reduced-motion; the cursor and magnetism
// only exist for fine pointers. Pages work the same without this file.
import Lenis from "lenis";

const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const root = document.documentElement;

// ---------- smooth scroll ----------
if (!still) {
  const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  const raf = (t: number) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  // in-page anchors glide too
  document.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a || a.hash.length < 2) return;
    const target = document.querySelector(a.hash);
    if (target) { e.preventDefault(); lenis.scrollTo(target as HTMLElement, { offset: -90 }); }
  });
  // dialogs (the console) scroll natively
  document.addEventListener("toggle", () => (document.querySelector("dialog[open]") ? lenis.stop() : lenis.start()), true);
  (window as unknown as { __lenis: Lenis }).__lenis = lenis;
}

// ---------- headlines build word by word as they enter ----------
const split = (el: HTMLElement) => {
  if (el.dataset.split === "done") return;
  const words = (el.textContent ?? "").trim().split(/\s+/);
  el.setAttribute("aria-label", el.textContent?.trim() ?? "");
  el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--d:${i * 55}ms">${w.replace(/</g, "&lt;")}</span></span>`).join(" ");
  el.dataset.split = "done";
};
if (!still) {
  const heads = [...document.querySelectorAll<HTMLElement>("main h1:not([data-nosplit]), main h2:not([data-nosplit])")].filter((h) => !h.querySelector("a, span[data-scramble], svg") && h.children.length === 0);
  heads.forEach(split);
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -12% 0px" });
  heads.forEach((h) => io.observe(h));
  root.classList.add("motion");
}

// ---------- custom cursor: a dot and a ring that grows and labels what is under it ----------
if (fine && !still) {
  const dot = document.createElement("div"), ring = document.createElement("div");
  dot.className = "cur-dot"; ring.className = "cur-ring";
  dot.setAttribute("aria-hidden", "true"); ring.setAttribute("aria-hidden", "true");
  document.body.append(dot, ring);
  root.classList.add("has-cursor");
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    const t = (e.target as HTMLElement).closest<HTMLElement>("a, button, [data-cursor], input, label, canvas, [role=tab]");
    const label = t?.dataset.cursor ?? (t?.matches("a[href^='mailto:']") ? "write" : t?.matches("a[download], a[href$='.pdf']") ? "download" : t?.matches("a[href^='http']") ? "visit" : t?.matches("a") ? "open" : t?.matches("canvas") ? "" : "");
    ring.dataset.label = label;
    ring.classList.toggle("hot", !!t);
    ring.classList.toggle("text", !!t?.matches("input"));
  }, { passive: true });
  addEventListener("pointerdown", () => ring.classList.add("down"));
  addEventListener("pointerup", () => ring.classList.remove("down"));
  document.addEventListener("pointerleave", () => root.classList.add("cur-out"));
  document.addEventListener("pointerenter", () => root.classList.remove("cur-out"));
  const loop = () => { rx += (x - rx) * 0.18; ry += (y - ry) * 0.18; ring.style.transform = `translate(${rx}px, ${ry}px)`; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

// ---------- magnetic buttons and nav items ----------
if (fine && !still) for (const b of document.querySelectorAll<HTMLElement>(".btn, .bar nav a, .theme, .kbtn, [data-magnetic]")) {
  const s = b.classList.contains("btn") ? 0.3 : 0.18;
  b.addEventListener("pointermove", (e) => {
    const r = b.getBoundingClientRect();
    b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * s}px, ${(e.clientY - r.top - r.height / 2) * s}px)`;
  });
  b.addEventListener("pointerleave", () => (b.style.transform = ""));
}

// ---------- glass catches the light where the pointer is ----------
if (fine) addEventListener("pointermove", (e) => {
  const g = (e.target as HTMLElement).closest<HTMLElement>(".glass, .rows a, .index a");
  if (!g) return;
  const r = g.getBoundingClientRect();
  g.style.setProperty("--gx", `${e.clientX - r.left}px`); g.style.setProperty("--gy", `${e.clientY - r.top}px`);
}, { passive: true });

// ---------- the hobbies piano: Web Audio, created on first key press; keys A to K play when it is open ----------
let audio: AudioContext | null = null;
const play = (key: HTMLElement) => {
  audio ??= new AudioContext();
  const f = Number(key.dataset.freq), t = audio.currentTime, osc = audio.createOscillator(), gain = audio.createGain();
  osc.type = "triangle"; osc.frequency.value = f;
  gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(0.22, t + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  osc.connect(gain).connect(audio.destination); osc.start(t); osc.stop(t + 1.15);
  key.classList.add("on"); setTimeout(() => key.classList.remove("on"), 140);
};
document.addEventListener("click", (e) => { const k = (e.target as HTMLElement).closest<HTMLElement>(".key[data-freq]"); if (k) play(k); });
addEventListener("keydown", (e) => {
  const piano = document.querySelector<HTMLElement>(".hob:hover .piano, .hob:focus-within .piano");
  const t = e.target as HTMLElement;
  if (!piano || e.metaKey || e.ctrlKey || e.altKey || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  const key = [...piano.querySelectorAll<HTMLElement>(".key")].find((k) => k.textContent?.trim() === e.key.toLowerCase());
  if (key) { e.preventDefault(); play(key); }
});

// ---------- pop-ups (definitions, hobby cards): an open one stays 12px inside the viewport ----------
// Delegated, so one listener covers every page; phones get the definition as a bottom sheet in CSS.
let popHost: HTMLElement | null = null;   // re-fit only on entering a new term, so moving within one never jitters
const fitPop = (e: Event) => {
  const host = (e.target as HTMLElement).closest?.<HTMLElement>(".def, .hob") ?? null;
  if (host === popHost) return;
  popHost = host;
  const pop = host?.querySelector<HTMLElement>(".pop, .hpop");
  if (!pop) return;
  pop.style.setProperty("--dx", "0px");
  requestAnimationFrame(() => {
    const r = pop.getBoundingClientRect(), m = 12, W = document.documentElement.clientWidth;
    pop.style.setProperty("--dx", `${r.right > W - m ? W - m - r.right : r.left < m ? m - r.left : 0}px`);
  });
};
document.addEventListener("pointerover", fitPop);
document.addEventListener("focusin", fitPop);

// Escape dismisses an open pop-up without moving the pointer or focus (WCAG 1.4.13); it can open again
// once the pointer or focus has left its term.
addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".def:hover, .def:focus, .hob:hover, .hob:focus-within").forEach((h) => h.classList.add("x"));
});
const undismiss = (e: Event) => {
  const h = (e.target as HTMLElement).closest?.(".def.x, .hob.x");
  if (h && !h.contains((e as FocusEvent).relatedTarget as Node | null)) h.classList.remove("x");
};
document.addEventListener("pointerout", undismiss);
document.addEventListener("focusout", undismiss);

// ---------- background music: two piano pieces from YouTube, off until asked for. The choice, the volume and on/off are
// remembered; after a page change it resumes on the visitor's next tap or key (browsers allow sound only
// after a gesture). Each player loads only when it is first needed.
const musicBtn = document.querySelector<HTMLButtonElement>("[data-music-toggle]");
if (musicBtn) {
  const wrap = musicBtn.closest<HTMLElement>("[data-mus]")!, now = wrap.querySelector<HTMLElement>("[data-mus-now]")!;
  const volIn = wrap.querySelector<HTMLInputElement>("[data-mus-vol]")!, volOut = wrap.querySelector<HTMLOutputElement>("[data-mus-vol-out]")!;
  const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
  const put = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };
  type Track = "unlasting" | "rosalina";
  let track: Track = get("music-track") === "rosalina" ? "rosalina" : "unlasting";
  let vol = Math.min(1, Math.max(0, Number(get("music-vol") ?? 0.6)));
  let yt: typeof import("./youtube") | null = null;
  wrap.querySelector<HTMLInputElement>(`input[value="${track}"]`)!.checked = true;
  volIn.value = String(Math.round(vol * 100)); volOut.textContent = `${volIn.value}%`;

  const isOn = () => musicBtn.getAttribute("aria-pressed") === "true";
  const show = (on: boolean) => {
    musicBtn.setAttribute("aria-pressed", String(on));
    musicBtn.setAttribute("aria-label", on ? "Mute background music" : "Play background music");
    document.documentElement.toggleAttribute("data-music", on && !!yt?.playing());
    put("music", on ? "on" : "off");
    status();
  };
  const status = () => {
    const np = yt?.nowPlaying();
    now.textContent = !isOn() ? "off · press ♪ to play" : np ? `▶ ${np.title} · ${np.credit}` : "on · tap anywhere to continue";
  };
  const play = async () => {
    yt ??= await import("./youtube");
    yt.start(track, vol, () => show(false));
    show(true);
  };
  // the button does what it shows: "on" (playing, or waiting for a tap after a page change) turns it off
  musicBtn.addEventListener("click", () => { if (isOn()) { yt?.stop(); show(false); } else void play(); });
  wrap.querySelectorAll<HTMLInputElement>('input[name="mus-track"]').forEach((r) => r.addEventListener("change", () => {
    track = r.value as Track; put("music-track", track);
    if (isOn()) void play(); else status();
  }));
  volIn.addEventListener("input", () => {
    vol = Number(volIn.value) / 100; volOut.textContent = `${volIn.value}%`; put("music-vol", String(vol));
    yt?.setVolume(vol);
  });
  // where there is no hover, a tap on the button also opens the panel; a tap elsewhere closes it
  if (matchMedia("(hover: none)").matches) {
    musicBtn.addEventListener("click", () => wrap.classList.add("open"));
    document.addEventListener("pointerdown", (e) => { if (!wrap.contains(e.target as Node)) wrap.classList.remove("open"); });
  }
  setInterval(() => { if (wrap.matches(":hover, :focus-within, .open")) status(); }, 500);
  if (get("music") === "on") {
    musicBtn.setAttribute("aria-pressed", "true"); status();
    const resume = (e: Event) => {
      removeEventListener("pointerdown", resume, true); removeEventListener("keydown", resume, true);
      if (!wrap.contains(e.target as Node) && isOn()) void play();   // the panel's own controls decide for themselves
    };
    addEventListener("pointerdown", resume, true); addEventListener("keydown", resume, true);
  }
}
