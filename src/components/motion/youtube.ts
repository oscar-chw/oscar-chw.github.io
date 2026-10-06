// Piano pieces played from their performers' own YouTube uploads. The site hosts no audio: YouTube's
// privacy-enhanced player loads only when a visitor chooses one, stays visible as a credited
// mini-player (YouTube's rules do not allow a hidden player), and picks up where it left off after a
// page change. Volume and pause go to the player through its postMessage API. YouTube requires the
// player to stay visible and at least 200 by 200 pixels with nothing over it, so it can be moved out of
// the way (dragged, or sent to the other corner) but never hidden.
export const TRACKS = {
  unlasting: { id: "Nh7JtKYhK-Q", title: "unlasting", credit: "LiSA · piano arr. Animenz" },
  rosalina: { id: "K6jn04Qb0J4", title: "Rosalina's Observatory", credit: "Super Mario Galaxy · piano by Erik C 'Piano Man'" },
} as const;
export type YtTrack = keyof typeof TRACKS;
export const watch = (k: YtTrack) => `https://www.youtube.com/watch?v=${TRACKS[k].id}`;

let box: HTMLElement | null = null, frame: HTMLIFrameElement | null = null, current: YtTrack | null = null, vol = 60;
const send = (func: string, args: unknown[] = []) => frame?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
const key = (k: YtTrack) => `yt-${k}-t`;

addEventListener("message", (e) => {
  if (!frame || !current || e.source !== frame.contentWindow) return;
  let d: { event?: string; info?: { currentTime?: number } };
  try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
  if (d.event === "onReady") send("setVolume", [vol]);
  const t = d.info?.currentTime;
  if (typeof t === "number") { try { sessionStorage.setItem(key(current), String(Math.floor(t))); } catch { /* ignore */ } }
});

export function start(k: YtTrack, volume: number, onClose: () => void) {
  vol = Math.round(volume * 100);
  if (box && current === k) { send("playVideo"); send("setVolume", [vol]); return; }
  stop();
  const { id, title, credit } = TRACKS[k];
  let t = 0; try { t = Number(sessionStorage.getItem(key(k))) || 0; } catch { /* ignore */ }
  current = k;
  box = document.createElement("aside");
  box.className = "ytmini glass";
  box.setAttribute("aria-label", `Now playing: ${title}`);
  const p = document.createElement("p"), a = document.createElement("a"), x = document.createElement("button"), sw = document.createElement("button");
  p.className = "mono";
  a.href = watch(k); a.target = "_blank"; a.rel = "noopener"; a.textContent = `${title} · ${credit} ↗`;
  x.type = "button"; x.setAttribute("aria-label", "Close the player"); x.textContent = "×";
  x.addEventListener("click", () => { stop(); onClose(); });
  sw.type = "button"; sw.setAttribute("aria-label", "Move the player to the other corner"); sw.textContent = "⇆";
  sw.addEventListener("click", () => { const r = box!.getBoundingClientRect(); place(r.left < innerWidth / 2 ? innerWidth : 0, r.top); });
  p.append(a, sw, x);
  drag(p);
  frame = document.createElement("iframe");
  frame.title = `${title} (${credit}) on YouTube`;
  frame.allow = "autoplay; encrypted-media; picture-in-picture";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1&rel=0&playsinline=1&loop=1&playlist=${id}&start=${t}&origin=${encodeURIComponent(location.origin)}`;
  // ask the player to report its time, so the next page can continue from there
  frame.addEventListener("load", () => frame?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1 }), "*"));
  box.append(p, frame);
  document.body.append(box);
  let saved: { x: number; y: number } | null = null;
  try { saved = JSON.parse(localStorage.getItem("yt-pos") ?? "null"); } catch { /* ignore */ }
  if (saved) place(saved.x, saved.y);
}

// keep the player fully on screen wherever it is put, and remember the spot for the next page
function place(x: number, y: number) {
  if (!box) return;
  const w = box.offsetWidth, h = box.offsetHeight, m = 12;
  const left = Math.min(Math.max(m, x), innerWidth - w - m), top = Math.min(Math.max(m, y), innerHeight - h - m);
  Object.assign(box.style, { left: `${left}px`, top: `${top}px`, right: "auto", bottom: "auto" });
  try { localStorage.setItem("yt-pos", JSON.stringify({ x: left, y: top })); } catch { /* ignore */ }
}
function drag(handle: HTMLElement) {
  let from: { x: number; y: number; left: number; top: number } | null = null;
  handle.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement).closest("a, button") || !box) return;
    const r = box.getBoundingClientRect();
    from = { x: e.clientX, y: e.clientY, left: r.left, top: r.top }; handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener("pointermove", (e) => { if (from) place(from.left + e.clientX - from.x, from.top + e.clientY - from.y); });
  handle.addEventListener("pointerup", () => (from = null));
}

export function stop() { box?.remove(); box = frame = null; current = null; }
export function setVolume(v: number) { vol = Math.round(v * 100); send("setVolume", [vol]); }
export const playing = () => !!box;
export const nowPlaying = () => (current ? TRACKS[current] : null);
