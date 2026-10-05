// Live BTCUSDT order book for the harbour's water: parse, aggregate, throttle, fall back.
export type Level = [price: number, qty: number];
export interface Book { bids: Level[]; asks: Level[] }
export type FeedState = "live" | "rest" | "fallback";

const levels = (raw: unknown): Level[] | null => {
  if (!Array.isArray(raw)) return null;
  const out: Level[] = [];
  for (const l of raw) {
    if (!Array.isArray(l)) return null;
    const p = Number(l[0]), q = Number(l[1]);
    if (!Number.isFinite(p) || !Number.isFinite(q)) return null;
    if (q > 0) out.push([p, q]);
  }
  return out;
};

/** Binance partial-depth (bids/asks) or diff-stream (b/a) payload -> sorted book, or null if unusable. */
export function parseDepth(msg: unknown): Book | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  const bids = levels(m.bids ?? m.b), asks = levels(m.asks ?? m.a);
  if (!bids?.length || !asks?.length) return null;
  bids.sort((x, y) => y[0] - x[0]);
  asks.sort((x, y) => x[0] - y[0]);
  if (bids[0][0] >= asks[0][0]) return null;              // a crossed book is a bad message, not a market
  return { bids, asks };
}

/** Cumulative size within each distance (in basis points) of mid, the shape the harbour draws. */
export function bands(book: Book, bps: number[]) {
  const mid = (book.bids[0][0] + book.asks[0][0]) / 2;
  const cum = (side: Level[], dir: 1 | -1) => bps.map((b) => {
    const edge = mid * (1 + (dir * b) / 1e4);
    return side.reduce((s, [p, q]) => (dir < 0 ? p >= edge : p <= edge) ? s + q : s, 0);
  });
  return { mid, cumBid: cum(book.bids, -1), cumAsk: cum(book.asks, 1) };
}

/** Admits at most `fps` frames per second; catches up on the grid so slow ticks do not drift below fps. */
export class FrameGate {
  private last = -Infinity;
  private readonly interval: number;
  constructor(fps: number) { this.interval = 1000 / fps; }
  ready(now: number): boolean {
    if (now - this.last < this.interval) return false;
    this.last = this.last === -Infinity ? now : now - ((now - this.last) % this.interval);
    return true;
  }
}

interface FeedOptions {
  wsUrl: string;
  restUrl: string;
  WebSocketImpl?: typeof WebSocket;
  fetchImpl?: typeof fetch;
  onBook: (book: Book, state: FeedState) => void;
  onState: (state: FeedState) => void;
  timeoutMs?: number;
}

/** WebSocket first; on error, close or silence, one REST snapshot; failing that, the bundled snapshot. */
export function createFeed(o: FeedOptions) {
  const WS = o.WebSocketImpl ?? WebSocket;
  const get = o.fetchImpl ?? fetch.bind(globalThis);
  let stopped = false, fellBack = false;
  const ws = new WS(o.wsUrl);
  const silence = setTimeout(() => fallBack(), o.timeoutMs ?? 6000);

  async function fallBack() {
    if (stopped || fellBack) return;
    fellBack = true;
    clearTimeout(silence);
    ws.close();
    try {
      const r = await get(o.restUrl, { signal: AbortSignal.timeout(6000) });
      const book = r.ok ? parseDepth(await r.json()) : null;
      if (stopped) return;
      if (!book) throw new Error("bad REST depth");
      o.onBook(book, "rest");
      o.onState("rest");
    } catch {
      if (!stopped) o.onState("fallback");
    }
  }

  ws.onmessage = (e: MessageEvent | { data: string }) => {
    if (stopped || fellBack) return;
    let book: Book | null = null;
    try { book = parseDepth(JSON.parse(String(e.data))); } catch { /* malformed frame: skip it */ }
    if (!book) return;
    clearTimeout(silence);
    o.onBook(book, "live");
    o.onState("live");
  };
  ws.onerror = () => { void fallBack(); };
  ws.onclose = () => { void fallBack(); };

  return {
    stop() { stopped = true; clearTimeout(silence); ws.close(); },
  };
}
