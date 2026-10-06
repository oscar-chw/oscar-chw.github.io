import { describe, it, expect, vi } from "vitest";
import { parseDepth, FrameGate, createFeed, type Book } from "./orderbook";

const raw = { lastUpdateId: 7, bids: [["100.0", "2"], ["101.0", "1"]], asks: [["103.0", "1"], ["102.0", "4"]] };

describe("parseDepth", () => {
  it("parses Binance depth payloads into sorted numeric levels", () => {
    expect(parseDepth(raw)).toEqual({ bids: [[101, 1], [100, 2]], asks: [[102, 4], [103, 1]] });
  });
  it("accepts the diff-stream shape (b/a keys)", () => {
    expect(parseDepth({ b: [["1", "1"]], a: [["2", "1"]] })).toEqual({ bids: [[1, 1]], asks: [[2, 1]] });
  });
  it.each([null, "x", {}, { bids: [], asks: [] }, { bids: [["a", "1"]], asks: [["2", "1"]] }, { bids: [["3", "1"]], asks: [["2", "1"]] }])(
    "rejects malformed, empty or crossed books: %j", (m) => expect(parseDepth(m)).toBeNull());
});

describe("FrameGate", () => {
  it("never admits two frames closer than 1/fps, even with irregular ticks", () => {
    const g = new FrameGate(10), admitted: number[] = [];
    for (const t of [0, 16, 99.9, 100, 150, 199.9, 200, 250, 300, 316, 401, 1000, 1000.5]) if (g.ready(t)) admitted.push(t);
    for (let i = 1; i < admitted.length; i++) expect(admitted[i] - admitted[i - 1]).toBeGreaterThanOrEqual(100);
    expect(admitted).toEqual([0, 100, 200, 300, 401, 1000]);
  });
  it("keeps up with a steady stream (no starvation)", () => {
    const g = new FrameGate(10);
    let n = 0;
    for (let t = 0; t < 1000; t += 16) if (g.ready(t)) n++;
    expect(n).toBeGreaterThanOrEqual(8);
    expect(n).toBeLessThanOrEqual(10);
  });
});

class FakeWS {
  static last: FakeWS;
  onopen?: () => void; onmessage?: (e: { data: string }) => void; onerror?: () => void; onclose?: () => void;
  closed = false;
  constructor(public url: string) { FakeWS.last = this; }
  close() { this.closed = true; }
}

describe("createFeed", () => {
  it("streams live books from the WebSocket", () => {
    const onBook = vi.fn(), onState = vi.fn();
    createFeed({ wsUrl: "ws://x", restUrl: "http://r", WebSocketImpl: FakeWS as never, fetchImpl: vi.fn() as never, onBook, onState, timeoutMs: 1000 });
    FakeWS.last.onmessage!({ data: JSON.stringify(raw) });
    expect(onState).toHaveBeenLastCalledWith("live");
    expect(onBook).toHaveBeenCalledWith(parseDepth(raw), "live");
  });
  it("falls back to REST when the socket errors, then to the bundled snapshot when REST fails", async () => {
    const onState = vi.fn();
    const okFetch = vi.fn(async () => ({ ok: true, json: async () => raw }));
    createFeed({ wsUrl: "ws://x", restUrl: "http://r", WebSocketImpl: FakeWS as never, fetchImpl: okFetch as never, onBook: () => {}, onState, timeoutMs: 1000 });
    FakeWS.last.onerror!();
    await vi.waitFor(() => expect(onState).toHaveBeenLastCalledWith("rest"));
    expect(okFetch).toHaveBeenCalledWith("http://r", expect.anything());

    const onState2 = vi.fn();
    const badFetch = vi.fn(async () => { throw new Error("451"); });
    createFeed({ wsUrl: "ws://x", restUrl: "http://r", WebSocketImpl: FakeWS as never, fetchImpl: badFetch as never, onBook: () => {}, onState: onState2, timeoutMs: 1000 });
    FakeWS.last.onclose!();
    await vi.waitFor(() => expect(onState2).toHaveBeenLastCalledWith("fallback"));
  });
  it("gives up on a silent socket after the timeout", async () => {
    vi.useFakeTimers();
    const onState = vi.fn();
    createFeed({ wsUrl: "ws://x", restUrl: "http://r", WebSocketImpl: FakeWS as never, fetchImpl: vi.fn(async () => { throw new Error(); }) as never, onBook: () => {}, onState, timeoutMs: 500 });
    const ws = FakeWS.last;
    await vi.advanceTimersByTimeAsync(600);
    expect(ws.closed).toBe(true);
    expect(onState).toHaveBeenLastCalledWith("fallback");
    vi.useRealTimers();
  });
  it("falls back when a live socket goes quiet without closing", async () => {
    vi.useFakeTimers();
    const onState = vi.fn();
    createFeed({ wsUrl: "ws://x", restUrl: "http://r", WebSocketImpl: FakeWS as never, fetchImpl: vi.fn(async () => { throw new Error(); }) as never, onBook: () => {}, onState, timeoutMs: 500 });
    await vi.advanceTimersByTimeAsync(400);
    FakeWS.last.onmessage!({ data: JSON.stringify(raw) });
    expect(onState).toHaveBeenLastCalledWith("live");
    await vi.advanceTimersByTimeAsync(400);
    expect(onState).toHaveBeenLastCalledWith("live");          // 400 ms after the message: still inside the window
    await vi.advanceTimersByTimeAsync(200);
    expect(onState).toHaveBeenLastCalledWith("fallback");      // quiet for 600 ms: no longer called live
    vi.useRealTimers();
  });
  it("stop() closes the socket and silences callbacks", () => {
    const onBook = vi.fn();
    const feed = createFeed({ wsUrl: "ws://x", restUrl: "http://r", WebSocketImpl: FakeWS as never, fetchImpl: vi.fn() as never, onBook, onState: () => {}, timeoutMs: 1000 });
    feed.stop();
    expect(FakeWS.last.closed).toBe(true);
    FakeWS.last.onmessage?.({ data: JSON.stringify(raw) });
    expect(onBook).not.toHaveBeenCalled();
  });
});
