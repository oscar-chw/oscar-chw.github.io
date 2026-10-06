// Water that answers the cursor: a WebGL layer over the harbour's water band refracts the painted
// water (reflection + order book) through expanding ripples spawned under the pointer. It renders
// only while ripples are alive, never under reduced motion, and silently does nothing without WebGL.
const VS = `attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;
const FS = `precision mediump float;
varying vec2 uv; uniform sampler2D tex; uniform float now, aspect; uniform vec3 rip[16];
void main(){
  vec2 off = vec2(0.); float shine = 0.;
  for (int i = 0; i < 16; i++) {
    float age = now - rip[i].z;
    if (rip[i].z < 0. || age > 3.) continue;
    vec2 d = (uv - rip[i].xy) * vec2(aspect, 1.);
    float r = length(d), front = age * .35;
    float w = sin((r - front) * 70.) * exp(-abs(r - front) * 18.) * exp(-age * 1.4);
    off += normalize(d + 1e-5) * w * .02; shine += w * .8;
  }
  vec4 c = texture2D(tex, uv + vec2(off.x / aspect, off.y));
  gl_FragColor = vec4(c.rgb + vec3(.43, .9, .84) * max(shine, 0.) * .5, 1.);
}`;

export function attachRipples(stage: HTMLElement, source: HTMLCanvasElement, top: number, W: number, H: number) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || innerWidth < 700) return null;
  const cv = document.createElement("canvas");
  cv.className = "ripples"; cv.setAttribute("aria-hidden", "true");
  const bh = H - top, aspect = W / bh;
  cv.width = W; cv.height = bh;                     // size first: the GL viewport is fixed at context creation
  const gl = cv.getContext("webgl", { premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  gl.viewport(0, 0, W, bh);
  cv.style.top = `${(top / H) * 100}%`; cv.style.height = `${(bh / H) * 100}%`;
  stage.appendChild(cv);

  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { cv.remove(); return null; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const uNow = gl.getUniformLocation(prog, "now"), uRip = gl.getUniformLocation(prog, "rip");
  gl.uniform1f(gl.getUniformLocation(prog, "aspect"), aspect);

  // the water band as a texture, re-copied whenever the harbour repaints its water
  const band = document.createElement("canvas"); band.width = W; band.height = bh;
  const bx = band.getContext("2d")!;
  const refresh = () => { bx.drawImage(source, 0, top, W, bh, 0, 0, W, bh); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, band); if (!raf) draw(); };

  const rips = new Float32Array(48).fill(-1);
  let next = 0, raf = 0, t0 = performance.now(), lastSpawn = 0, alive = 0;
  const now = () => (performance.now() - t0) / 1000;
  const draw = () => {
    const t = now();
    gl.uniform1f(uNow, t); gl.uniform3fv(uRip, rips);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    alive = 0;
    for (let i = 0; i < 16; i++) if (rips[i * 3 + 2] >= 0 && t - rips[i * 3 + 2] < 3) alive++;
    stage.dataset.ripples = String(alive);
    raf = alive && !document.documentElement.hasAttribute("data-paused") ? requestAnimationFrame(draw) : 0;
  };
  // spawn under the pointer: on the water directly, or at the waterline below a pointer in the city
  stage.addEventListener("pointermove", (e) => {
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, yRaw = (e.clientY - r.top) / r.height;
    const t = now();
    if (x < 0 || x > 1 || t - lastSpawn < 0.09) return;
    lastSpawn = t;
    rips.set([x, Math.min(1, Math.max(0.04, yRaw)), t], next * 3); next = (next + 1) % 16;
    if (!raf) raf = requestAnimationFrame(draw);
  });
  refresh();
  return { refresh };
}
