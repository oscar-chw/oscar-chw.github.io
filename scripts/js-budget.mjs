// Gate: the brief's JS budget, measured on the built site.
//   - every non-demo page ships <= 50 KB of gzipped JS (external + inline);
//   - text pages (everything but the home page, the demos and the contact card) load no external JS except the
//     shared site motion module (Base.astro's script: smooth scroll, cursor, reveals), stay under
//     12 KB gzipped in total, have no inline event handlers, and their only inline scripts are the
//     named, allowlisted ones (data-inline="theme" | "palette"), under 1.5 KB gzipped.
//     (Changed 2026-10-06 from "no external JS" after Oscar asked for an immersive site.)
// Fails if dist/ is missing or holds no pages, so an absent build never passes.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = process.argv[2] ?? "dist";
const BUDGET = 50 * 1024;
const INLINE_TEXT_BUDGET = 1536;
const TEXT_BUDGET = 12 * 1024;
const SHARED_MOTION = /\/_astro\/Base\.astro_astro_type_script_index_\d+_lang\.[\w-]+\.js$/;   // theme script + the console stub (the console itself loads on use)
const ALLOWED_INLINE = new Set(["theme", "palette"]);   // "print" left with the old card page on 2026-10-07

if (!existsSync(DIST)) { console.error(`js-budget: ${DIST}/ does not exist; build first`); process.exit(1); }

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const pages = walk(DIST).filter((p) => p.endsWith(".html"));
if (pages.length === 0) { console.error("js-budget: no .html pages in dist/"); process.exit(1); }

const gz = (s) => gzipSync(s).length;
// Resolve a script src against dist, ignoring the deploy base (/next/ during preview).
const resolve = (src) => {
  const clean = src.split("?")[0].replace(/^https?:\/\/[^/]+/, "");
  const cands = [clean, clean.replace(/^\/[^/]+/, "")].map((c) => join(DIST, c));
  return cands.find((c) => existsSync(c));
};

let failed = 0;
for (const page of pages) {
  const rel = relative(DIST, page);
  const html = readFileSync(page, "utf8");
  const isDemo = rel.startsWith("demos/");           // the lab (demos/index) and every demo page
  // the contact card flips, shares and copies (2026-10-07), so like the home page it is interactive, not text
  const isText = !isDemo && rel !== "index.html" && rel !== "card/index.html";
  const external = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  const preloads = [...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let bytes = inline.reduce((n, s) => n + gz(s), 0);
  for (const src of new Set([...external, ...preloads])) {
    const f = resolve(src);
    if (!f) { console.error(`FAIL ${rel}: script ${src} not found in dist`); failed++; continue; }
    bytes += gz(readFileSync(f));
  }
  const inlineBytes = inline.reduce((n, s) => n + gz(s), 0);
  const foreign = external.filter((s) => !SHARED_MOTION.test(s.split("?")[0]));
  if (isText && foreign.length) { console.error(`FAIL ${rel}: text page loads external JS ${foreign.join(", ")}`); failed++; }
  if (isText && bytes > TEXT_BUDGET) { console.error(`FAIL ${rel}: ${bytes} B gz JS > ${TEXT_BUDGET} on a text page`); failed++; }
  if (isText) {
    const tags = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/(?:ld\+)?json")([^>]*)>/g)].map((m) => m[1]);
    for (const attrs of tags) {
      const name = attrs.match(/data-inline="([^"]+)"/)?.[1];
      if (!name || !ALLOWED_INLINE.has(name)) { console.error(`FAIL ${rel}: inline script not on the allowlist (${attrs.trim() || "no attributes"})`); failed++; }
    }
    const handlers = html.replace(/<script[\s\S]*?<\/script>/g, "").match(/<[^>]+\son[a-z]+=/g);
    if (handlers) { console.error(`FAIL ${rel}: inline event handler ${handlers[0].slice(0, 60)}`); failed++; }
  }
  if (isText && inlineBytes > INLINE_TEXT_BUDGET) { console.error(`FAIL ${rel}: inline JS ${inlineBytes} B gz > ${INLINE_TEXT_BUDGET}`); failed++; }
  if (!isDemo && bytes > BUDGET) { console.error(`FAIL ${rel}: ${bytes} B gz JS > ${BUDGET}`); failed++; }
  console.log(`${isDemo ? "demo" : isText ? "text" : "page"}  ${String(bytes).padStart(6)} B gz  ${rel}`);
}
if (failed) { console.error(`js-budget: ${failed} failure(s)`); process.exit(1); }
console.log(`js-budget: OK (${pages.length} pages)`);
