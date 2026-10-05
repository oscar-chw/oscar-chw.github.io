// Photo -> one drawable path, entirely in the browser (the Fourier demo's "use your own photo").
// Grey -> blur -> Sobel edges -> keep the strongest edge pixels -> greedy nearest-neighbour tour,
// marking pen-up where the tour jumps between strokes. The same steps as the portrait pipeline
// (fourier.py), simplified to run on a phone in well under a second.
import type { Pt } from "./fourier";

export interface Gray { w: number; h: number; v: Float32Array }

export function toGray(rgba: Uint8ClampedArray, w: number, h: number): Gray {
  const v = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) v[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  return { w, h, v };
}

function blur({ w, h, v }: Gray): Gray {
  const k = [1, 2, 1], out = new Float32Array(w * h), tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let d = -1; d <= 1; d++) { const xx = x + d; if (xx >= 0 && xx < w) { s += v[y * w + xx] * k[d + 1]; n += k[d + 1]; } }
    tmp[y * w + x] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let d = -1; d <= 1; d++) { const yy = y + d; if (yy >= 0 && yy < h) { s += tmp[yy * w + x] * k[d + 1]; n += k[d + 1]; } }
    out[y * w + x] = s / n;
  }
  return { w, h, v: out };
}

/** Strongest edge pixels (Sobel magnitude), at most `max`, as [x, y]. */
export function edges(g: Gray, keep = 0.09, max = 2600): Pt[] {
  const { w, h, v } = blur(g), mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = (dx: number, dy: number) => v[(y + dy) * w + x + dx];
    const gx = -p(-1, -1) - 2 * p(-1, 0) - p(-1, 1) + p(1, -1) + 2 * p(1, 0) + p(1, 1);
    const gy = -p(-1, -1) - 2 * p(0, -1) - p(1, -1) + p(-1, 1) + 2 * p(0, 1) + p(1, 1);
    mag[y * w + x] = Math.hypot(gx, gy);
  }
  const sorted = Float32Array.from(mag).sort();
  const cut = Math.max(1e-6, sorted[Math.floor(sorted.length * (1 - keep))]);
  const pts: Pt[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mag[y * w + x] >= cut) pts.push([x, y]);
  if (pts.length <= max) return pts;
  const step = pts.length / max;                       // even subsample keeps every region represented
  return Array.from({ length: max }, (_, i) => pts[Math.floor(i * step)]);
}

/** Greedy nearest-neighbour tour; pen[i] is true where reaching point i is a jump (no ink). */
export function tour(pts: Pt[], jump = 4): { path: Pt[]; pen: boolean[] } {
  if (!pts.length) return { path: [], pen: [] };
  const used = new Uint8Array(pts.length), path: Pt[] = [pts[0]], pen = [true];
  used[0] = 1;
  // a coarse grid makes the nearest-neighbour search close to linear
  const cell = 8, grid = new Map<string, number[]>();
  const key = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  pts.forEach(([x, y], i) => { const k = key(x, y); (grid.get(k) ?? grid.set(k, []).get(k)!).push(i); });
  let cur = pts[0];
  for (let n = 1; n < pts.length; n++) {
    let best = -1, bd = Infinity;
    const cx = Math.floor(cur[0] / cell), cy = Math.floor(cur[1] / cell);
    for (let r = 0; best < 0 || r <= Math.ceil(Math.sqrt(bd) / cell); r++) {
      for (let gx = cx - r; gx <= cx + r; gx++) for (let gy = cy - r; gy <= cy + r; gy++) {
        if (Math.max(Math.abs(gx - cx), Math.abs(gy - cy)) !== r) continue;
        for (const i of grid.get(`${gx},${gy}`) ?? []) {
          if (used[i]) continue;
          const d = (pts[i][0] - cur[0]) ** 2 + (pts[i][1] - cur[1]) ** 2;
          if (d < bd) { bd = d; best = i; }
        }
      }
      if (r > 400) break;
    }
    used[best] = 1;
    pen.push(Math.sqrt(bd) > jump);
    path.push((cur = pts[best]));
  }
  return { path, pen };
}

/** n samples evenly spaced along the tour (jumps included), with pen-up carried onto jump samples. */
export function resampleTour(path: Pt[], pen: boolean[], n: number): { pts: Pt[]; pen: number[] } {
  const ring = [...path, path[0]], penr = [...pen, true], cum = [0];
  for (let i = 1; i < ring.length; i++) cum.push(cum[i - 1] + Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]));
  const total = cum[cum.length - 1] || 1, out: Pt[] = [], up: number[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (k / n) * total;
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / Math.max(cum[j + 1] - cum[j], 1e-9);
    out.push([ring[j][0] + f * (ring[j + 1][0] - ring[j][0]), ring[j][1] + f * (ring[j + 1][1] - ring[j][1])]);
    up.push(penr[j + 1] ? 1 : 0);
  }
  return { pts: out, pen: up };
}
