// A 3D surface on a plain 2D canvas: the grid's quads are projected with a little perspective, fitted
// to the canvas, and painted back to front (painter's algorithm), coloured by height with its shadow
// on the floor. Drag (mouse or touch) or use the arrow keys to turn it; hover to read exact values;
// switching data morphs the old surface into the new one. It turns slowly by itself until touched,
// unless motion is reduced. No WebGL and no library: a few kilobytes, the same in every browser.
import { h } from "./ui";

export interface SurfaceSpec {
  z: number[][];                                  // rows along y, columns along x
  x: [number, number]; y: [number, number];       // data ranges, for the axis labels
  labels: [string, string, string];               // x, y, z
  fmt: (v: number, axis: "x" | "y" | "z") => string;
}

const STOPS = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];   // viridis
const colour = (t: number, shade: number, a = 1) => {
  const u = Math.min(0.9999, Math.max(0, t)) * (STOPS.length - 1), i = Math.floor(u), f = u - i;
  const c = STOPS[i].map((v, k) => Math.round((v + (STOPS[i + 1][k] - v) * f) * shade));
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
};
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function surface(aria: string) {
  const canvas = h("canvas", { class: "s3d", role: "img", "aria-label": aria, tabindex: "0" }) as HTMLCanvasElement;
  const tip = h("span", { class: "s3d-tip mono", hidden: "" });
  const wrap = h("div", { class: "s3d-wrap" }, canvas, tip);
  const cx = canvas.getContext("2d")!;
  let spec: SurfaceSpec | null = null, shown: number[][] = [], yaw = -0.85, pitch = 1.05, spin = !reduce();
  let hover: [number, number] | null = null, verts: [number, number, number, number][] = [];   // screen x, y, i, j

  function draw() {
    if (!spec || !shown.length) return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = canvas.clientWidth || 640, H = canvas.clientHeight || 400;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
    const z = shown, ny = z.length, nx = z[0].length, all = spec.z.flat();
    const lo = Math.min(...all), hi = Math.max(...all);
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const raw = (gx: number, gy: number, gz: number): [number, number, number] => {
      const rx = gx * cy - gy * sy, ry = gx * sy + gy * cy, py = ry * cp - gz * sp, pz = ry * sp + gz * cp, k = 3.2 / (3.2 + py);
      return [rx * k, -pz * k, py];
    };
    // fit the whole box (with room for labels) to the canvas, whatever the angle
    const corners = [-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [-0.62, 0.62].map((c) => raw(a * 1.45, b * 1.45, c))));
    const bx = [Math.min(...corners.map((p) => p[0])), Math.max(...corners.map((p) => p[0]))], byy = [Math.min(...corners.map((p) => p[1])), Math.max(...corners.map((p) => p[1]))];
    const S = Math.min((W - 24) / (bx[1] - bx[0]), (H - 24) / (byy[1] - byy[0])), ox = W / 2 - ((bx[0] + bx[1]) / 2) * S, oy = H / 2 - ((byy[0] + byy[1]) / 2) * S;
    const P = (gx: number, gy: number, gz: number): [number, number, number] => { const [a, b, d] = raw(gx, gy, gz); return [ox + a * S, oy + b * S, d]; };
    const X = (i: number) => (i / (nx - 1)) * 2 - 1, Y = (j: number) => (j / (ny - 1)) * 2 - 1, Z = (v: number) => ((v - lo) / (hi - lo || 1)) * 1.2 - 0.6;

    // floor grid
    cx.lineWidth = 1; cx.strokeStyle = "rgba(140,160,180,0.22)";
    for (let t = -1; t <= 1.001; t += 0.25) for (const [a, b, c, d] of [[t, -1, t, 1], [-1, t, 1, t]]) {
      const p = P(a, b, -0.6), q = P(c, d, -0.6); cx.beginPath(); cx.moveTo(p[0], p[1]); cx.lineTo(q[0], q[1]); cx.stroke();
    }
    // the surface's shadow on the floor: a flat heat map
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const ps = [P(X(i), Y(j), -0.6), P(X(i + 1), Y(j), -0.6), P(X(i + 1), Y(j + 1), -0.6), P(X(i), Y(j + 1), -0.6)];
      cx.beginPath(); ps.forEach(([a, b], k) => (k ? cx.lineTo(a, b) : cx.moveTo(a, b))); cx.closePath();
      cx.fillStyle = colour(((z[j][i] + z[j + 1][i + 1]) / 2 - lo) / (hi - lo || 1), 0.9, 0.16); cx.fill();
    }
    // quads, far to near, lit from above-left by their slope
    const quads: { d: number; pts: [number, number][]; t: number; shade: number }[] = [];
    verts = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const p = P(X(i), Y(j), Z(z[j][i])); verts.push([p[0], p[1], i, j]); }
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const vs = [z[j][i], z[j][i + 1], z[j + 1][i + 1], z[j + 1][i]], span = hi - lo || 1;
      const ps = [P(X(i), Y(j), Z(vs[0])), P(X(i + 1), Y(j), Z(vs[1])), P(X(i + 1), Y(j + 1), Z(vs[2])), P(X(i), Y(j + 1), Z(vs[3]))];
      const slope = ((vs[1] - vs[0]) + (vs[2] - vs[3])) / span * (nx / 12) + ((vs[3] - vs[0]) + (vs[2] - vs[1])) / span * (ny / 24);
      quads.push({ d: ps.reduce((s, p) => s + p[2], 0) / 4, pts: ps.map(([a, b]) => [a, b] as [number, number]), t: ((vs[0] + vs[1] + vs[2] + vs[3]) / 4 - lo) / span, shade: Math.max(0.5, Math.min(1.15, 0.92 - slope)) });
    }
    quads.sort((a, b) => b.d - a.d);
    for (const q of quads) {
      cx.beginPath(); q.pts.forEach(([a, b], k) => (k ? cx.lineTo(a, b) : cx.moveTo(a, b))); cx.closePath();
      cx.fillStyle = colour(q.t, q.shade); cx.fill(); cx.strokeStyle = "rgba(8,12,22,0.22)"; cx.stroke();
    }

    // axes: ticks along the two near floor edges, and a height scale on a vertical edge
    const f = spec.fmt, ink = "rgba(185,205,218,0.95)", dim = "rgba(150,170,185,0.75)";
    cx.font = "11px ui-monospace, Menlo, monospace"; cx.textAlign = "center";
    const xs = [-1, 1].map((s) => P(0, s * 1.15, -0.6)), yEdge = xs[0][2] < xs[1][2] ? -1 : 1;      // the x labels go on the nearer y edge (smaller depth)
    const ys = [-1, 1].map((s) => P(s * 1.15, 0, -0.6)), xEdge = ys[0][2] < ys[1][2] ? -1 : 1;
    // tick labels sit on small dark pills, so they stay legible wherever the surface passes behind them
    const pill = (txt: string, x: number, y: number, col: string) => {
      const w = cx.measureText(txt).width + 8;
      cx.fillStyle = "rgba(8,13,26,0.72)"; cx.beginPath(); cx.roundRect(x - w / 2, y - 8, w, 15, 4); cx.fill();
      cx.fillStyle = col; cx.fillText(txt, x, y + 3);
    };
    for (let k = 0; k <= 4; k++) {
      const t = -1 + k / 2;
      const px = P(t, yEdge * 1.12, -0.6); pill(f(spec.x[0] + ((t + 1) / 2) * (spec.x[1] - spec.x[0]), "x"), px[0], px[1], dim);
      const py = P(xEdge * 1.2, t, -0.6); pill(f(spec.y[0] + ((t + 1) / 2) * (spec.y[1] - spec.y[0]), "y"), py[0], py[1], dim);
    }
    // axis titles beyond the end of each axis
    const lx = P(1.5, yEdge * 1.12, -0.6), ly = P(xEdge * 1.2, 1.5, -0.6);
    pill(`${spec.labels[0]} →`, lx[0], lx[1], ink); pill(`${spec.labels[1]} →`, ly[0], ly[1], ink);
    const vb = P(-xEdge, -yEdge, -0.6), vt = P(-xEdge, -yEdge, 0.6);
    cx.strokeStyle = "rgba(185,205,218,0.5)"; cx.beginPath(); cx.moveTo(vb[0], vb[1]); cx.lineTo(vt[0], vt[1]); cx.stroke();
    cx.textAlign = "left";
    cx.fillText(f(hi, "z"), vt[0] + 6, vt[1] + 4); cx.fillStyle = dim; cx.fillText(f(lo, "z"), vb[0] + 6, vb[1] + 4);
    cx.fillStyle = ink; cx.fillText(spec.labels[2], vt[0] + 6, vt[1] - 10);

    // hover: the point, a drop line to the floor, and the exact values
    if (hover) {
      const [i, j] = hover, v = spec.z[j][i], top = P(X(i), Y(j), Z(shown[j][i])), base = P(X(i), Y(j), -0.6);
      cx.setLineDash([3, 3]); cx.strokeStyle = "rgba(255,255,255,0.7)"; cx.beginPath(); cx.moveTo(top[0], top[1]); cx.lineTo(base[0], base[1]); cx.stroke(); cx.setLineDash([]);
      cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(top[0], top[1], 3.5, 0, 7); cx.fill();
      const xv = spec.x[0] + (i / (nx - 1)) * (spec.x[1] - spec.x[0]), yv = spec.y[0] + (j / (ny - 1)) * (spec.y[1] - spec.y[0]);
      tip.textContent = `${spec.labels[0]} ${f(xv, "x")} · ${spec.labels[1]} ${f(yv, "y")} → ${spec.labels[2]} ${f(v, "z")}`;
      tip.hidden = false; tip.style.left = `${Math.min(W - 10, Math.max(10, top[0]))}px`; tip.style.top = `${top[1]}px`;
    } else tip.hidden = true;
  }

  // switching data morphs the shown grid into the new one over about half a second
  let morph = 0;
  function set(s: SurfaceSpec) {
    const from = shown.length === s.z.length && shown[0]?.length === s.z[0].length ? shown.map((r) => r.slice()) : null;
    const lo0 = spec ? Math.min(...spec.z.flat()) : 0, hi0 = spec ? Math.max(...spec.z.flat()) : 1;
    spec = s;
    const lo = Math.min(...s.z.flat()), hi = Math.max(...s.z.flat());
    if (!from || reduce()) { shown = s.z.map((r) => r.slice()); draw(); return; }
    // morph in normalised height, so a price surface can become a gamma surface without a jump in scale
    const norm0 = from.map((r) => r.map((v) => (v - lo0) / (hi0 - lo0 || 1)));
    const t0 = performance.now(), id = ++morph;
    const step = (now: number) => {
      if (id !== morph) return;
      const t = Math.min(1, (now - t0) / 520), e = 1 - Math.pow(1 - t, 3);
      shown = s.z.map((r, j) => r.map((v, i) => lo + (norm0[j][i] + (((v - lo) / (hi - lo || 1)) - norm0[j][i]) * e) * (hi - lo)));
      draw();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // the slow spin runs only while it is on, the tab is visible and the panel is shown; it ends for good once touched
  const loop = () => { if (!spin) return; if (!document.hidden && canvas.offsetParent) { yaw += 0.0025; draw(); } requestAnimationFrame(loop); };
  let drag: { x: number; y: number } | null = null;
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; spin = false; hover = null; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => {
    if (drag) {
      yaw += (e.clientX - drag.x) * 0.01; pitch = Math.min(1.45, Math.max(0.2, pitch - (e.clientY - drag.y) * 0.008));
      drag = { x: e.clientX, y: e.clientY }; draw(); return;
    }
    if (e.pointerType !== "mouse") return;
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    let best: [number, number] | null = null, bd = 18 * 18;
    for (const [x, y, i, j] of verts) { const d = (x - mx) ** 2 + (y - my) ** 2; if (d < bd) { bd = d; best = [i, j]; } }
    if (best?.[0] !== hover?.[0] || best?.[1] !== hover?.[1]) { hover = best; draw(); }
  });
  canvas.addEventListener("pointerup", () => (drag = null));
  canvas.addEventListener("pointerleave", () => { if (hover) { hover = null; draw(); } });
  canvas.addEventListener("keydown", (e) => {
    const d = ({ ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] } as Record<string, number[]>)[e.key];
    if (!d) return;
    e.preventDefault(); spin = false; yaw += d[0]; pitch = Math.min(1.45, Math.max(0.2, pitch + d[1])); draw();
  });
  new ResizeObserver(() => draw()).observe(canvas);
  requestAnimationFrame(loop);

  return { el: wrap, set, angle: () => [yaw, pitch] as const };
}
