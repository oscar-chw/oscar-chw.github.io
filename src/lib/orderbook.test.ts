import { describe, it, expect, vi } from "vitest";
import { parseDepth, bands, FrameGate, createFeed, type Book } from "./orderbook";

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

describe("bands", () => {
  const book: Book = { bids: [[99.99, 1], [99.9, 2], [99, 5]], asks: [[100.01, 1], [100.1, 3], [101, 7]] };
  it("cumulates size within each bps distance of mid", () => {
    const b = bands(book, [2, 20, 200]);
    expect(b.mid).toBeCloseTo(100, 6);
    expect(b.cumBid).toEqual([1, 3, 8]);
    expect(b.cumAsk).toEqual([1, 4, 11]);
  });
  it("is monotone non-decreasing for any band list", () => {
    const b = bands(book, [1, 5, 10, 50, 100, 500]);
    for (let i = 1; i < b.cumBid.length; i++) { expect(b.cumBid[i]).toBeGreaterThanOrEqual(b.cumBid[i - 1]); expect(b.cumAsk[i]).toBeGreaterThanOrEqual(b.cumAsk[i - 1]); }
  });
});

describe("FrameGate", () => {
  it("admits at most fps frames per second", () => {
    const g = new FrameGate(10);
    let n = 0;
    for (let t = 0; t < 1000; t += 16) if (g.ready(t)) n++;
    expect(n).toBe(10);
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
  it("stop() closes the socket and silences callbacks", () => {
    const onBook = vi.fn();
    const feed = createFeed({ wsUrl: "ws://x", restUrl: "http://r", WebSocketImpl: FakeWS as never, fetchImpl: vi.fn() as never, onBook, onState: () => {}, timeoutMs: 1000 });
    feed.stop();
    expect(FakeWS.last.closed).toBe(true);
    FakeWS.last.onmessage?.({ data: JSON.stringify(raw) });
    expect(onBook).not.toHaveBeenCalled();
  });
});
