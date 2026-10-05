// Victoria Harbour drawn from data. The city (BTC/USDT history, the platform race test,
// the blueprint future) is painted once into a base layer; only the water, where the
// live order book sits, is repainted, and at most 10 times a second.
import daily from "../../data/btc-daily.json";
import snapshot from "../../data/book-snapshot.json";
import { createFeed, FrameGate, type Book, type FeedState } from "../../lib/orderbook";

const W = 1584, H = 396, WL = 286, XT = 1210;          // canvas size, waterline, t = now
const ROWS = 14, ROW_H = 6.4, BAR = 190;
const WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@depth20@100ms";
const REST_URL = "https://data-api.binance.vision/api/v3/depth?symbol=BTCUSDT&limit=100";

type Rows = { label: string[]; bid: number[]; ask: number[]; mid: number };

interface Geo {
  M: { o: number; c: number; h: number; l: number; rets: number[] }[];
  BW: number; Y: (v: number) => number; roof: [number, number][]; hub: [number, number];
}

// Each stage stays under ~50 ms on a 4x-throttled phone CPU, so painting the city never blocks input.
const pause = () => new Promise<void>((r) => setTimeout(r, 0));

async function drawCity(cx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): Promise<Geo> {
  const CL = daily.close;
  let s = 4242; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  // one building per 30-day block: open, high, low, close and that block's daily log returns
  const M: Geo["M"] = [];
  for (let i = 0; i < CL.length; i += 30) {
    const seg = CL.slice(i, i + 30); if (seg.length < 5) break;
    const prev = i > 0 ? CL[i - 1] : seg[0];
    M.push({ o: Math.log(seg[0]), c: Math.log(seg[seg.length - 1]), h: Math.log(Math.max(...seg)), l: Math.log(Math.min(...seg)), rets: seg.map((c, k) => Math.log(c / (k ? seg[k - 1] : prev))) });
  }
  // the roof scale leaves headroom for a bootstrap of real monthly changes (the 90th percentile path)
  const mc = M.map((m) => m.c), mr = mc.slice(1).map((v, i) => v - mc[i]);
  const tops: number[] = [];
  for (let p = 0; p < 900; p++) { let v = mc[mc.length - 1], top = v; for (let k = 0; k < 24; k++) { v += mr[Math.floor(rnd() * mr.length)]; top = Math.max(top, v); } tops.push(top); }
  tops.sort((a, b) => a - b);
  const lo = Math.min(...M.map((m) => m.l)), hi = Math.max(...M.map((m) => m.h), tops[Math.floor(0.9 * (tops.length - 1))]);
  const Y = (v: number) => WL - 28 - ((v - lo) / (hi - lo)) * 205;

  let g = cx.createLinearGradient(0, 0, 0, WL); g.addColorStop(0, "#060a16"); g.addColorStop(0.65, "#0f1a33"); g.addColorStop(1, "#1c3053"); cx.fillStyle = g; cx.fillRect(0, 0, W, WL);
  const r = cx.createRadialGradient(W * 0.55, WL, 10, W * 0.55, WL, W * 0.55); r.addColorStop(0, "rgba(120,190,225,0.15)"); r.addColorStop(1, "rgba(0,0,0,0)"); cx.fillStyle = r; cx.fillRect(0, 0, W, WL);

  // two hazy ridges: Hong Kong's skyline sits against its hills
  const ridgeAt = (x: number, sd: number, amp: number, base: number) => base - amp * (0.55 + 0.45 * (Math.sin(x / 260 + sd) * 0.55 + Math.sin(x / 140 + sd * 2.1) * 0.28 + Math.sin(x / 70 + sd * 3.7) * 0.12));
  for (const [sd, amp, base, col] of [[1.3, 150, WL - 150, "rgba(30,46,80,0.70)"], [4.1, 105, WL - 125, "rgba(22,35,63,0.92)"]] as const) {
    cx.beginPath(); cx.moveTo(0, WL); for (let x = 0; x <= W; x += 4) cx.lineTo(x, ridgeAt(x, sd, amp, base)); cx.lineTo(W, WL); cx.closePath(); cx.fillStyle = col; cx.fill();
    cx.beginPath(); for (let x = 0; x <= W; x += 4) { const yy = ridgeAt(x, sd, amp, base); x ? cx.lineTo(x, yy) : cx.moveTo(x, yy); } cx.strokeStyle = "rgba(140,180,220,0.12)"; cx.lineWidth = 1; cx.stroke();
  }

  await pause();
  // back row: generic towers for depth (not data)
  for (let x = -10; x < W;) {
    const w = 22 + Math.floor(rnd() * 30), h = 90 + rnd() * 130;
    g = cx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "rgba(40,64,108,0.95)"); g.addColorStop(1, "rgba(30,48,84,0.95)"); cx.fillStyle = g; cx.fillRect(x, WL - h, w, h);
    if (rnd() < 0.3) cx.fillRect(x + w * 0.25, WL - h - 10, w * 0.5, 10);
    for (let yy = WL - 8; yy > WL - h + 6; yy -= 6) for (let xx = x + 3; xx < x + w - 3; xx += 5) if (rnd() < 0.18) { cx.fillStyle = "rgba(170,205,230,0.20)"; cx.fillRect(xx, yy, 2, 3); }
    x += w + 3 + Math.floor(rnd() * 8);
  }
  { const hz = cx.createLinearGradient(0, WL - 240, 0, WL); hz.addColorStop(0, "rgba(20,34,62,0)"); hz.addColorStop(1, "rgba(20,34,62,0.45)"); cx.fillStyle = hz; cx.fillRect(0, WL - 240, W, 240); }

  // the data platform: one tall tower with a beacon
  const PX = 640, PW = 34, PH = 232;
  g = cx.createLinearGradient(PX, 0, PX + PW, 0); g.addColorStop(0, "#24406e"); g.addColorStop(1, "#172b4f"); cx.fillStyle = g; cx.fillRect(PX, WL - PH, PW, PH);
  cx.fillRect(PX + 8, WL - PH - 14, PW - 16, 14); cx.fillStyle = "rgba(180,220,240,0.25)";
  for (let yy = WL - 10; yy > WL - PH + 6; yy -= 6) for (let xx = PX + 3; xx < PX + PW - 3; xx += 5) if (rnd() < 0.45) cx.fillRect(xx, yy, 2, 3);
  cx.strokeStyle = "rgba(160,210,235,0.35)"; cx.lineWidth = 1; cx.strokeRect(PX + 0.5, WL - PH + 0.5, PW - 1, PH - 1);
  const hub: [number, number] = [PX + PW / 2, WL - PH - 14];

  await pause();
  // front row: one building per block. roof = close, spire = high, windows = that block's days
  const BW = XT / M.length, roof: [number, number][] = [];
  M.forEach((m) => {
    const i = roof.length, w = Math.max(7, BW * (0.55 + 0.42 * rnd())), x = i * BW + (BW - w) / 2, top = Y(m.c);
    g = cx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "#1d2f52"); g.addColorStop(1, "#0e182e"); cx.fillStyle = g; cx.fillRect(x, top, w, WL - top);
    const sx = x + w / 2, sy = Y(m.h);
    if (top - sy > 4) {
      cx.strokeStyle = "rgba(200,215,235,0.5)"; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(sx, top); cx.lineTo(sx, sy); cx.stroke();
      cx.save(); cx.shadowColor = "rgba(255,240,200,0.9)"; cx.shadowBlur = 5; cx.fillStyle = "rgba(255,245,220,0.95)"; cx.beginPath(); cx.arc(sx, sy, 1.4, 0, 7); cx.fill(); cx.restore();
    }
    const cells: [number, number][] = [];
    for (let yy = WL - 8; yy > top + 3; yy -= 5) for (let xx = x + 2; xx < x + w - 3; xx += 4) cells.push([xx, yy]);
    cx.fillStyle = "rgba(60,82,118,0.22)"; cells.forEach(([xx, yy]) => cx.fillRect(xx, yy, 2, 3));
    for (let d = 0; d < m.rets.length && cells.length; d++) {
      const [xx, yy] = cells.splice(Math.floor(rnd() * cells.length), 1)[0], v = m.rets[d];
      cx.fillStyle = v > 0 ? (v > 0.02 ? "rgba(86,211,100,0.95)" : "rgba(63,185,80,0.62)") : (v < -0.02 ? "rgba(248,81,73,0.92)" : "rgba(248,81,73,0.5)");
      cx.fillRect(xx, yy, 2, 3);
    }
    roof.push([x + w / 2, top]);
  });

  await pause();
  // the price chart, hiding in plain sight along the rooftops
  cx.save(); cx.shadowColor = "rgba(140,230,220,0.8)"; cx.shadowBlur = 6; cx.strokeStyle = "rgba(170,240,230,0.62)"; cx.lineWidth = 1.1;
  cx.beginPath(); roof.forEach(([x, y], i) => (i ? cx.lineTo(x, y) : cx.moveTo(x, y))); cx.stroke(); cx.restore();

  // Symphony of Lights as a system diagram: 12 reader beams (teal), 5 writer beams (amber)
  { const idx = [...roof.keys()].filter((i) => Math.abs(roof[i][0] - hub[0]) > 90);
    for (let k = 0; k < 17; k++) {
      const [rx, ry] = roof[idx[Math.floor(((k + 0.5) / 17) * idx.length)]], writer = k % 3 === 1 && k < 15, col = writer ? "255,190,120" : "110,230,215";
      const lg = cx.createLinearGradient(hub[0], hub[1], rx, ry); lg.addColorStop(0, `rgba(${col},${writer ? 0.55 : 0.42})`); lg.addColorStop(1, `rgba(${col},0.06)`);
      cx.save(); cx.shadowColor = `rgba(${col},0.8)`; cx.shadowBlur = 5; cx.strokeStyle = lg; cx.lineWidth = writer ? 1.3 : 1; cx.beginPath(); cx.moveTo(hub[0], hub[1]); cx.lineTo(rx, ry - 2); cx.stroke(); cx.restore();
      cx.fillStyle = `rgba(${col},0.9)`; cx.beginPath(); cx.arc(rx, ry - 2, 1.5, 0, 7); cx.fill();
    }
    cx.save(); cx.shadowColor = "rgba(200,240,255,1)"; cx.shadowBlur = 12; cx.fillStyle = "rgba(225,245,255,1)"; cx.beginPath(); cx.arc(hub[0], hub[1], 2.6, 0, 7); cx.fill(); cx.restore(); }

  // t = now
  cx.setLineDash([3, 6]); cx.strokeStyle = "rgba(220,235,250,0.4)"; cx.beginPath(); cx.moveTo(XT, 36); cx.lineTo(XT, H - 8); cx.stroke(); cx.setLineDash([]);
  cx.fillStyle = "rgba(220,235,250,0.65)"; cx.font = 'italic 24px "STIX Two Text","Times New Roman",serif'; cx.fillText("t", XT + 8, 58); cx.font = "20px Menlo, monospace"; cx.fillText("= now", XT + 22, 58);

  // the convention centre: warm-lit glass hall under one sweeping wing roof
  { const x0 = 760, w = 300, base = WL + 3, hh = 30, x1 = x0 + w;
    cx.fillStyle = "#14233f"; cx.fillRect(x0 - 6, base - 6, w + 12, 8);
    cx.fillStyle = "#1a2a48"; cx.fillRect(x0 + 18, base - hh, w - 40, hh - 6);
    g = cx.createLinearGradient(0, base - hh, 0, base); g.addColorStop(0, "rgba(255,214,160,0.80)"); g.addColorStop(1, "rgba(255,170,110,0.40)"); cx.fillStyle = g; cx.fillRect(x0 + 18, base - hh, w - 40, hh - 6);
    cx.fillStyle = "rgba(40,50,70,0.55)"; for (let xx = x0 + 22; xx < x1 - 24; xx += 7) cx.fillRect(xx, base - hh, 1, hh - 6); cx.fillRect(x0 + 18, base - hh + 12, w - 40, 1);
    const wing = () => { cx.moveTo(x0 - 4, base - hh + 4); cx.bezierCurveTo(x0 + w * 0.3, base - hh - 26, x0 + w * 0.62, base - hh - 44, x1 + 18, base - hh - 30); };
    cx.beginPath(); wing(); cx.bezierCurveTo(x1 + 4, base - hh - 14, x1 - 10, base - hh, x1 - 30, base - hh); cx.lineTo(x0 + 18, base - hh); cx.quadraticCurveTo(x0 + 6, base - hh + 1, x0 - 4, base - hh + 4); cx.closePath();
    g = cx.createLinearGradient(0, base - hh - 44, 0, base - hh + 4); g.addColorStop(0, "#3a5a88"); g.addColorStop(1, "#1c2f52"); cx.fillStyle = g; cx.fill();
    cx.save(); cx.shadowColor = "rgba(200,230,250,0.8)"; cx.shadowBlur = 6; cx.strokeStyle = "rgba(215,236,250,0.85)"; cx.lineWidth = 1.2; cx.beginPath(); wing(); cx.stroke(); cx.restore();
    for (let k = 1; k < 9; k++) { const t = k / 9, u = 1 - t;
      const bx = u ** 3 * (x0 - 4) + 3 * u * u * t * (x0 + w * 0.3) + 3 * u * t * t * (x0 + w * 0.62) + t ** 3 * (x1 + 18);
      const by = u ** 3 * (base - hh + 4) + 3 * u * u * t * (base - hh - 26) + 3 * u * t * t * (base - hh - 44) + t ** 3 * (base - hh - 30);
      cx.fillStyle = "rgba(255,236,200,0.9)"; cx.beginPath(); cx.arc(bx, by + 2, 1.2, 0, 7); cx.fill(); } }

  await pause();
  // the harbour and the city's reflection in it
  g = cx.createLinearGradient(0, WL, 0, H); g.addColorStop(0, "#0d182d"); g.addColorStop(1, "#050913"); cx.fillStyle = g; cx.fillRect(0, WL, W, H - WL);
  const ref = document.createElement("canvas"); ref.width = W; ref.height = H; ref.getContext("2d")!.drawImage(canvas, 0, 0);
  for (let yy = WL; yy < H; yy += 2) {
    const k = (yy - WL) / (H - WL), src = WL - (yy - WL) * 1.1; if (src < 0) break;
    cx.globalAlpha = 0.3 * (1 - k * 0.9); cx.drawImage(ref, 0, src, W, 2, Math.sin(yy * 0.55) * 2.2 * (0.4 + k) + Math.sin(yy * 0.13) * 1.5, yy, W, 2);
  }
  cx.globalAlpha = 1;
  g = cx.createLinearGradient(0, WL - 2, 0, WL + 6); g.addColorStop(0, "rgba(160,210,235,0)"); g.addColorStop(0.5, "rgba(160,210,235,0.2)"); g.addColorStop(1, "rgba(160,210,235,0)"); cx.fillStyle = g; cx.fillRect(0, WL - 2, W, 8);

  // after t = now the future is not data yet: fog, then unlit dashed blueprint towers
  { const fg = cx.createLinearGradient(XT, 0, XT + 60, 0); fg.addColorStop(0, "rgba(10,16,34,0)"); fg.addColorStop(1, "rgba(10,16,34,0.72)"); cx.fillStyle = fg; cx.fillRect(XT, 0, W - XT, WL);
    let x = XT + 14, k = 0; const hs = [150, 96, 188, 120, 72, 160, 104, 140];
    cx.setLineDash([4, 4]); cx.strokeStyle = "rgba(170,215,225,0.42)";
    while (x < W - 24) { const w = 18 + ((k * 7) % 14), h = hs[k % hs.length]; cx.strokeRect(x + 0.5, WL - h + 0.5, w, h - 1);
      for (let yy = WL - h + 8; yy < WL - 6; yy += 10) { cx.beginPath(); cx.moveTo(x + 4, yy + 0.5); cx.lineTo(x + w - 4, yy + 0.5); cx.stroke(); }
      x += w + 9; k++; }
    cx.setLineDash([]); }

  // a few large annotations; the hover read-outs carry the rest
  const label = (text: string, tx: number, ty: number, px?: number, py?: number) => {
    cx.font = "20px Menlo, monospace"; cx.fillStyle = "rgba(8,13,26,0.72)"; const w = cx.measureText(text).width; cx.fillRect(tx - 6, ty - 19, w + 12, 27); cx.fillStyle = "rgba(190,225,232,0.95)"; cx.fillText(text, tx, ty);
    if (px !== undefined && py !== undefined) { cx.strokeStyle = "rgba(190,225,232,0.5)"; cx.setLineDash([2, 3]); cx.beginPath(); cx.moveTo(tx + 8, ty + 9); cx.lineTo(px, py); cx.stroke(); cx.setLineDash([]); cx.fillStyle = "rgba(220,245,245,0.95)"; cx.beginPath(); cx.arc(px, py, 2.2, 0, 7); cx.fill(); }
  };
  cx.font = "20px Menlo, monospace"; cx.fillStyle = "rgba(140,170,190,0.85)"; cx.fillText("$ ./render --seed 42", 28, 36);
  { const [rx, ry] = roof[Math.floor(roof.length * 0.16)]; label("BTC/USDT, 2020 → now", 28, 76, rx, ry - 2); }
  label("12 readers · 5 writers · 0 lost", hub[0] + 18, hub[1] + 6);
  cx.font = "italic 20px Menlo, monospace"; cx.fillStyle = "rgba(170,215,225,0.85)"; cx.fillText("no look-ahead", XT + 22, 92);
  return { M, BW, Y, roof, hub };
}

/** Rows for the water: live books by depth level, the bundled snapshot by distance from mid. */
function rowsFromBook(book: Book): Rows {
  const n = Math.min(20, book.bids.length, book.asks.length), label: string[] = [], bid: number[] = [], ask: number[] = [];
  for (let i = 0; i < ROWS; i++) {
    const k = Math.max(1, Math.round(((i + 1) * n) / ROWS));
    label.push(`top ${k} level${k > 1 ? "s" : ""}`);
    bid.push(book.bids.slice(0, k).reduce((s, l) => s + l[1], 0));
    ask.push(book.asks.slice(0, k).reduce((s, l) => s + l[1], 0));
  }
  return { label, bid, ask, mid: (book.bids[0][0] + book.asks[0][0]) / 2 };
}
const SNAPSHOT_ROWS: Rows = {
  label: snapshot.bands_bps.map((b) => `within ${b} bps of mid`), bid: snapshot.cum_bid_btc, ask: snapshot.cum_ask_btc, mid: snapshot.mid,
};

export async function mountHarbour(wrap: HTMLElement) {
  const canvas = wrap.querySelector("canvas")!, tip = wrap.querySelector<HTMLElement>("[data-testid=harbour-tip]")!;
  const badge = wrap.querySelector<HTMLElement>("[data-testid=book-badge]")!;
  const pauseBtn = wrap.querySelector<HTMLButtonElement>("[data-testid=book-pause]")!;
  const cx = canvas.getContext("2d")!;
  // paint the city off-screen, then show it whole: no half-drawn frames
  const base = document.createElement("canvas"); base.width = W; base.height = H;
  const geo = await drawCity(base.getContext("2d")!, base);

  let rows = SNAPSHOT_ROWS, state: FeedState | "connecting" = "connecting", restAt = "", frames = 0, paused = false;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let gate = new FrameGate(reduce.matches ? 1 : 10);
  reduce.addEventListener("change", () => (gate = new FrameGate(reduce.matches ? 1 : 10)));

  function paint() {
    cx.drawImage(base, 0, 0);
    const dmax = Math.max(...rows.bid, ...rows.ask);
    rows.bid.forEach((b, i) => {
      const yy = WL + 10 + i * ROW_H, bl = (b / dmax) * BAR, al = (rows.ask[i] / dmax) * BAR;
      let gr = cx.createLinearGradient(XT - bl, 0, XT, 0); gr.addColorStop(0, "rgba(63,185,80,0.10)"); gr.addColorStop(1, "rgba(63,185,80,0.85)"); cx.fillStyle = gr; cx.fillRect(XT - bl, yy, Math.max(0, bl - 3), 2);
      gr = cx.createLinearGradient(XT, 0, XT + al, 0); gr.addColorStop(0, "rgba(248,81,73,0.85)"); gr.addColorStop(1, "rgba(248,81,73,0.10)"); cx.fillStyle = gr; cx.fillRect(XT + 3, yy, al, 2);
    });
    cx.font = "18px Menlo, monospace";
    const t = `bids | asks  ${rows.mid.toLocaleString("en-US", { maximumFractionDigits: 1 })}`, w = cx.measureText(t).width;
    cx.fillStyle = "rgba(8,13,26,0.72)"; cx.fillRect(XT - w / 2 - 6, H - 26, w + 12, 24); cx.fillStyle = "rgba(190,225,232,0.95)"; cx.fillText(t, XT - w / 2, H - 8);
    frames++;
    wrap.dataset.frames = String(frames);
    wrap.dataset.bookMid = rows.mid.toFixed(2);
  }

  function setBadge() {
    badge.dataset.state = paused ? "paused" : state;
    badge.textContent = paused ? "paused" : state === "live" ? "live · BTCUSDT" : state === "rest" ? `snapshot · ${restAt} UTC` : state === "fallback" ? "snapshot · 5 Oct 2026" : "connecting…";
  }

  let pending: ReturnType<typeof setTimeout> | undefined;
  function request() {
    if (document.hidden) return;
    const now = performance.now();
    if (gate.ready(now)) { clearTimeout(pending); pending = undefined; paint(); }
    else if (!pending) pending = setTimeout(() => { pending = undefined; request(); }, 100);  // trailing frame: the newest book is never dropped
  }

  let feed: ReturnType<typeof createFeed> | undefined;
  const start = () => {
    feed?.stop();
    feed = createFeed({
      wsUrl: WS_URL, restUrl: REST_URL,
      onBook: (book, s) => { rows = rowsFromBook(book); if (s === "rest") restAt = new Date().toISOString().slice(11, 16); request(); },
      onState: (s) => { if (s !== state) { state = s; setBadge(); } if (s === "fallback") { rows = SNAPSHOT_ROWS; request(); } },
    });
  };
  const halt = () => { feed?.stop(); feed = undefined; clearTimeout(pending); pending = undefined; };
  // Stop the stream while the tab is hidden; reconnect when it is shown again.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) halt();
    else if (!paused && (state === "live" || state === "connecting")) start();
  });
  // WCAG 2.2.2: anything that updates by itself can be paused.
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    if (paused) halt(); else start();
    setBadge();
  });

  paint(); setBadge();
  if (!document.hidden) start();           // a page opened in a background tab waits until it is shown

  // ---------- read-outs: pointer and keyboard ----------
  const d0 = Date.UTC(2020, 0, 1), day = (i: number) => new Date(d0 + i * 864e5).toISOString().slice(0, 10);
  const usd = (v: number) => "$" + Math.round(Math.exp(v)).toLocaleString("en-US");
  const site = wrap.dataset.base ?? "/";
  function readout(x: number, y: number): string {
    if (Math.hypot(x - geo.hub[0], y - geo.hub[1]) < 34)
      return `<b>Data platform race test</b><br>12 readers and 5 writers at once (4 appending, 1 rewriting a partition)<br>23 of 23 commits kept<br><a href="${site}projects/qts-research-platform/">The platform →</a>`;
    if (x > XT + 4 && y < WL)
      return `<b>After t = now: no look-ahead</b><br>Look-ahead bias is using data that was not yet known at decision time, which makes a backtest look better than anything that could have traded.<br>These towers stay unlit blueprints. <a href="${site}projects/point-in-time-research/">Point-in-time research →</a>`;
    if (y > WL + 6 && y < WL + 12 + ROWS * ROW_H && Math.abs(x - XT) < 200) {
      const l = Math.max(0, Math.min(ROWS - 1, Math.floor((y - WL - 8) / ROW_H)));
      return `<b>Order book, ${rows.label[l]}</b><br><span class="g">bids ${rows.bid[l].toFixed(2)} BTC</span> · <span class="r">asks ${rows.ask[l].toFixed(2)} BTC</span><br>${badge.textContent}`;
    }
    const i = Math.floor(x / geo.BW), m = geo.M[i];
    if (m && y < WL && y > geo.Y(m.h) - 14) {
      const up = m.rets.filter((v) => v > 0).length, ch = (Math.exp(m.c - m.o) - 1) * 100;
      return `<b>${day(i * 30)} → ${day(i * 30 + m.rets.length - 1)}</b><br>close ${usd(m.c)} · high ${usd(m.h)}<br>first→last close <span class="${ch >= 0 ? "g" : "r"}">${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%</span><br><span class="g">${up} up days</span> · <span class="r">${m.rets.length - up} down days</span>`;
    }
    return "";
  }
  // canvas uses object-fit: cover on narrow screens, so map through the cover transform
  function toCanvas(clientX: number, clientY: number) {
    const r = canvas.getBoundingClientRect(), sc = Math.max(r.width / W, r.height / H);
    const ox = (r.width - W * sc) * parseFloat(getComputedStyle(canvas).objectPosition) / 100, oy = (r.height - H * sc) / 2;
    return [(clientX - r.left - ox) / sc, (clientY - r.top - oy) / sc, r, sc, ox, oy] as const;
  }
  function show(html: string, px: number, py: number) {
    if (!html) { tip.hidden = true; return; }
    tip.innerHTML = html; tip.hidden = false;
    const r = wrap.getBoundingClientRect();
    tip.style.left = Math.max(6, Math.min(px + 14, r.width - tip.offsetWidth - 6)) + "px";
    tip.style.top = Math.max(4, py - tip.offsetHeight - 12) + "px";
  }
  wrap.addEventListener("mousemove", (e) => {
    if ((e.target as HTMLElement).closest("[data-testid=harbour-tip]")) return;
    const [x, y, r] = toCanvas(e.clientX, e.clientY);
    show(readout(x, y), e.clientX - r.left, e.clientY - r.top);
  });
  wrap.addEventListener("mouseleave", () => (tip.hidden = true));

  const stops: [number, number][] = [
    ...geo.roof.filter((_, i) => i % 8 === 0).map(([x, y]) => [x, y + 6] as [number, number]),
    [geo.hub[0], geo.hub[1]], [XT + 120, 200], [XT, WL + 14],
  ];
  let k = -1;
  wrap.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Escape") return;
    e.preventDefault();
    if (e.key === "Escape") { tip.hidden = true; return; }
    k = (k + (e.key === "ArrowRight" ? 1 : stops.length - 1)) % stops.length;
    const [x, y] = stops[k], [, , r, sc, ox, oy] = toCanvas(0, 0);
    show(readout(x, y), x * sc + ox, y * sc + oy);
    void r;
  });
  // hide the read-out only when focus leaves the harbour, so Tab can reach the links inside it
  wrap.addEventListener("focusout", (e) => { if (!wrap.contains(e.relatedTarget as Node | null)) tip.hidden = true; });
}
