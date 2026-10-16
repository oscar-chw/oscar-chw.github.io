// A 3D surface on a plain 2D canvas: the grid's quads are projected with a little perspective, fitted
// to the canvas, and painted back to front (painter's algorithm), coloured by height with its shadow
// on the floor. Drag (mouse or touch) or use the arrow keys to turn it; hover to read exact values;
// switching data morphs the old surface into the new one. Rotation can be paused or resumed;
// the grid probe exposes the same computed values to keyboards and touch screens.
import { h, button, icon } from "./ui";
import { Pause, Play, Hand, RotateCcw } from "lucide";
import "./surface-controls.css";

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
  const tip = h("span", { class: "s3d-tip mono", hidden: "", "aria-hidden": "true" });
  const readout = h("p", { class: "s3d-readout mono", role: "status", "data-surface-readout": "" });
  const x = h("input", { type: "range", min: "0", step: "1", "aria-label": "Inspect x position" });
  const y = h("input", { type: "range", min: "0", step: "1", "aria-label": "Inspect y position" });
  const xLabel = h("span", { class: "ctl-l mono" }), yLabel = h("span", { class: "ctl-l mono" });
  const xValue = h("output", { class: "mono" }), yValue = h("output", { class: "mono" });
  const motion = button("", () => setSpin(!spin));
  const touch = button("Touch rotation", () => setTouchRotation(!touchRotation), "", Hand);
  const reset = button("Reset view", () => {
    setSpin(false); setTouchRotation(false); yaw = -0.85; pitch = 1.05; draw();
  }, "", RotateCcw);
  const wrap = h("div", { class: "s3d-wrap" }, canvas, tip,
    h("div", { class: "s3d-controls" }, motion, touch, reset),
    h("div", { class: "s3d-probe", role: "group", "aria-label": "Surface probe" },
      h("label", { class: "ctl" }, xLabel, x, xValue), h("label", { class: "ctl" }, yLabel, y, yValue)), readout,
    h("p", { class: "lab-note s3d-help" }, "Inspect a grid point with the position sliders. Mouse drag or arrow keys rotate the view. Turn on Touch rotation to drag with a finger; leave it off to scroll the page over the plot."));
  const cx = canvas.getContext("2d")!;
  let spec: SurfaceSpec | null = null, shown: number[][] = [], yaw = -0.85, pitch = 1.05, spin = !reduce();
  let hover: [number, number] | null = null, verts: [number, number, number, number][] = [];   // screen x, y, i, j
  let tipVisible = false, touchRotation = false, frame = 0, disposed = false;
  const events = new AbortController(), media = matchMedia("(prefers-reduced-motion: reduce)");

  function setSpin(value: boolean) {
    spin = value;
    motion.replaceChildren(icon(spin ? Pause : Play), spin ? "Pause rotation" : "Resume rotation");
    if (spin && !frame && !disposed) frame = requestAnimationFrame(loop);
    if (!spin) { cancelAnimationFrame(frame); frame = 0; }
  }
  function setTouchRotation(value: boolean) {
    touchRotation = value; touch.setAttribute("aria-pressed", String(value));
    canvas.dataset.touchRotation = String(value); drag = null; tap = null;
  }
  function syncProbe() {
    if (!spec || !hover) return;
    const [i, j] = hover, nx = spec.z[0].length, ny = spec.z.length;
    x.max = String(nx - 1); y.max = String(ny - 1); x.value = String(i); y.value = String(j);
    xLabel.textContent = spec.labels[0]; yLabel.textContent = spec.labels[1];
    const xv = spec.x[0] + i / (nx - 1) * (spec.x[1] - spec.x[0]);
    const yv = spec.y[0] + j / (ny - 1) * (spec.y[1] - spec.y[0]);
    xValue.textContent = spec.fmt(xv, "x"); yValue.textContent = spec.fmt(yv, "y");
    x.setAttribute("aria-valuetext", `${spec.labels[0]} ${xValue.textContent}`);
    y.setAttribute("aria-valuetext", `${spec.labels[1]} ${yValue.textContent}`);
  }

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
    const f = spec.fmt, ink = "#e6edf3", dim = "#c4d0da";
    cx.font = "11px ui-monospace, Menlo, monospace"; cx.textAlign = "center";
    const xs = [-1, 1].map((s) => P(0, s * 1.15, -0.6)), yEdge = xs[0][2] < xs[1][2] ? -1 : 1;      // the x labels go on the nearer y edge (smaller depth)
    const ys = [-1, 1].map((s) => P(s * 1.15, 0, -0.6)), xEdge = ys[0][2] < ys[1][2] ? -1 : 1;
    // Separate labels that meet at a projected corner, and keep every pill inside the canvas.
    const labels: { x: number; y: number; w: number }[] = [];
    const pill = (txt: string, x: number, y: number, col: string) => {
      const w = cx.measureText(txt).width + 8;
      x = Math.max(w / 2 + 3, Math.min(W - w / 2 - 3, x));
      y = Math.max(9, Math.min(H - 8, y));
      for (const offset of [0, 18, -18, 36, -36, 54, -54]) {
        const candidate = y + offset;
        if (candidate < 9 || candidate > H - 8) continue;
        if (labels.some(p => Math.abs(x - p.x) < (w + p.w) / 2 + 2 && Math.abs(candidate - p.y) < 17)) continue;
        y = candidate; break;
      }
      labels.push({ x, y, w });
      cx.textAlign = "center";
      cx.fillStyle = "rgba(8,13,26,0.92)"; cx.beginPath(); cx.roundRect(x - w / 2, y - 8, w, 15, 4); cx.fill();
      cx.fillStyle = col; cx.fillText(txt, x, y + 3);
    };
    const ticks = W < 360 ? 2 : 4;
    for (let k = 0; k <= ticks; k++) {
      const t = -1 + k * 2 / ticks;
      const px = P(t, yEdge * 1.12, -0.6); pill(f(spec.x[0] + ((t + 1) / 2) * (spec.x[1] - spec.x[0]), "x"), px[0], px[1], dim);
      const py = P(xEdge * 1.2, t, -0.6); pill(f(spec.y[0] + ((t + 1) / 2) * (spec.y[1] - spec.y[0]), "y"), py[0], py[1], dim);
    }
    // axis titles beyond the end of each axis
    const lx = P(1.5, yEdge * 1.12, -0.6), ly = P(xEdge * 1.2, 1.5, -0.6);
    pill(`${spec.labels[0]} →`, lx[0], lx[1], ink); pill(`${spec.labels[1]} →`, ly[0], ly[1], ink);
    const vb = P(-xEdge, -yEdge, -0.6), vt = P(-xEdge, -yEdge, 0.6);
    cx.strokeStyle = "rgba(185,205,218,0.5)"; cx.beginPath(); cx.moveTo(vb[0], vb[1]); cx.lineTo(vt[0], vt[1]); cx.stroke();
    pill(f(hi, "z"), vt[0] + 6 + cx.measureText(f(hi, "z")).width / 2, vt[1] + 4, dim);
    pill(f(lo, "z"), vb[0] + 6 + cx.measureText(f(lo, "z")).width / 2, vb[1] + 4, dim);
    pill(spec.labels[2], vt[0] + 6 + cx.measureText(spec.labels[2]).width / 2, vt[1] - 16, ink);

    // hover: the point, a drop line to the floor, and the exact values
    if (hover) {
      const [i, j] = hover, v = spec.z[j][i], top = P(X(i), Y(j), Z(shown[j][i])), base = P(X(i), Y(j), -0.6);
      cx.setLineDash([3, 3]); cx.strokeStyle = "rgba(255,255,255,0.7)"; cx.beginPath(); cx.moveTo(top[0], top[1]); cx.lineTo(base[0], base[1]); cx.stroke(); cx.setLineDash([]);
      cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(top[0], top[1], 3.5, 0, 7); cx.fill();
      const xv = spec.x[0] + (i / (nx - 1)) * (spec.x[1] - spec.x[0]), yv = spec.y[0] + (j / (ny - 1)) * (spec.y[1] - spec.y[0]);
      const text = `${spec.labels[0]} ${f(xv, "x")} · ${spec.labels[1]} ${f(yv, "y")} → ${spec.labels[2]} ${f(v, "z")}`;
      tip.textContent = text;
      if (readout.textContent !== text) readout.textContent = text;
      tip.hidden = !tipVisible; tip.style.left = `${Math.min(W - 10, Math.max(10, top[0]))}px`; tip.style.top = `${top[1]}px`;
    } else tip.hidden = true;
  }

  // switching data morphs the shown grid into the new one over about half a second
  let morph = 0;
  function set(s: SurfaceSpec) {
    if (disposed) return;
    const id = ++morph; // Even an immediate update must invalidate older queued frames.
    const from = shown.length === s.z.length && shown[0]?.length === s.z[0].length ? shown.map((r) => r.slice()) : null;
    const lo0 = spec ? Math.min(...spec.z.flat()) : 0, hi0 = spec ? Math.max(...spec.z.flat()) : 1;
    spec = s;
    hover = hover ? [Math.min(hover[0], s.z[0].length - 1), Math.min(hover[1], s.z.length - 1)]
      : [Math.floor(s.z[0].length / 2), Math.floor(s.z.length / 2)];
    syncProbe();
    const lo = Math.min(...s.z.flat()), hi = Math.max(...s.z.flat());
    if (!from || reduce()) { shown = s.z.map((r) => r.slice()); draw(); return; }
    // morph in normalised height, so a price surface can become a gamma surface without a jump in scale
    const norm0 = from.map((r) => r.map((v) => (v - lo0) / (hi0 - lo0 || 1)));
    const t0 = performance.now();
    const step = (now: number) => {
      if (id !== morph) return;
      const t = Math.min(1, (now - t0) / 520), e = 1 - Math.pow(1 - t, 3);
      shown = s.z.map((r, j) => r.map((v, i) => lo + (norm0[j][i] + (((v - lo) / (hi - lo || 1)) - norm0[j][i]) * e) * (hi - lo)));
      draw();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // A paused camera owns no animation loop. Hidden panels keep their pose until shown again.
  function loop() {
    frame = 0;
    if (!spin || disposed || !canvas.isConnected) return;
    if (!document.hidden && canvas.offsetParent) { yaw += 0.0025; draw(); }
    frame = requestAnimationFrame(loop);
  }
  let drag: { x: number; y: number } | null = null;
  let tap: { x: number; y: number } | null = null;
  const inspectAt = (clientX: number, clientY: number, floating: boolean) => {
    const r = canvas.getBoundingClientRect(), mx = clientX - r.left, my = clientY - r.top;
    let best: [number, number] | null = null, bd = (floating ? 18 : 40) ** 2;
    for (const [vx, vy, i, j] of verts) { const d = (vx - mx) ** 2 + (vy - my) ** 2; if (d < bd) { bd = d; best = [i, j]; } }
    tipVisible = floating && !!best;
    if (best) { hover = best; syncProbe(); setSpin(false); }
    draw();
  };
  canvas.addEventListener("pointerdown", (e) => {
    setSpin(false); tipVisible = false; tap = { x: e.clientX, y: e.clientY };
    if (e.pointerType === "mouse" || touchRotation) {
      drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId);
    }
  }, { signal: events.signal });
  canvas.addEventListener("pointermove", (e) => {
    if (drag) {
      yaw += (e.clientX - drag.x) * 0.01; pitch = Math.min(1.45, Math.max(0.2, pitch - (e.clientY - drag.y) * 0.008));
      drag = { x: e.clientX, y: e.clientY }; draw(); return;
    }
    if (e.pointerType !== "mouse") return;
    inspectAt(e.clientX, e.clientY, true);
  }, { signal: events.signal });
  canvas.addEventListener("pointerup", (e) => {
    if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 8) inspectAt(e.clientX, e.clientY, e.pointerType === "mouse");
    drag = null; tap = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  }, { signal: events.signal });
  canvas.addEventListener("pointercancel", () => { drag = null; tap = null; }, { signal: events.signal });
  canvas.addEventListener("lostpointercapture", () => { drag = null; tap = null; }, { signal: events.signal });
  canvas.addEventListener("pointerleave", () => { tipVisible = false; draw(); }, { signal: events.signal });
  canvas.addEventListener("keydown", (e) => {
    const d = ({ ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] } as Record<string, number[]>)[e.key];
    if (!d) return;
    e.preventDefault(); setSpin(false); yaw += d[0]; pitch = Math.min(1.45, Math.max(0.2, pitch + d[1])); draw();
  }, { signal: events.signal });
  for (const input of [x, y]) input.addEventListener("input", () => {
    hover = [Number(x.value), Number(y.value)]; tipVisible = false; setSpin(false); syncProbe(); draw();
  }, { signal: events.signal });
  media.addEventListener("change", () => {
    if (!media.matches) return;
    setSpin(false); ++morph;
    if (spec) { shown = spec.z.map(row => row.slice()); draw(); }
  }, { signal: events.signal });
  const size = new ResizeObserver(() => { if (canvas.isConnected) draw(); });
  size.observe(canvas); setTouchRotation(false); setSpin(spin);

  return { el: wrap, set, angle: () => [yaw, pitch] as const, dispose: () => {
    disposed = true; ++morph; cancelAnimationFrame(frame); size.disconnect(); events.abort();
  } };
}
