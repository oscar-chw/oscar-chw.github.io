// Order-book shapes and the frame limiter for the harbour's water.
export type Level = [price: number, qty: number];
export interface Book { bids: Level[]; asks: Level[] }

/** Admits at most `fps` frames per second. */
export class FrameGate {
  private last = -Infinity;
  private readonly interval: number;
  constructor(fps: number) { this.interval = 1000 / fps; }
  ready(now: number): boolean {
    if (now - this.last < this.interval) return false;
    this.last = now;                         // measured from the last frame painted: no two frames closer than 1/fps
    return true;
  }
}
