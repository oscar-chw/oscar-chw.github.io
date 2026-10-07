// Gate: every number printed in site content traces to an approved source.
// Named failure: a page states a figure (a rank, a speed-up, a row count) that
// appears in no approved source: invented, rounded up, or copied from a
// non-approved write-up.
//
// Sources: the approved wording file (CONTENT_MD, private, never in this repo)
// plus any files a content entry lists under `sources:` (paths relative to
// sources/ in this repo). A missing source FAILS: absence never passes.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const CONTENT_MD = process.env.CONTENT_MD ?? "../website-content/CONTENT.md";
const ROOT = "src/content";
if (!existsSync(CONTENT_MD)) { console.error(`check-numbers: approved source ${CONTENT_MD} not found`); process.exit(1); }
if (!existsSync(ROOT)) { console.error(`check-numbers: ${ROOT}/ not found`); process.exit(1); }

const NUM = /(?<![\w.,/#])\d+(?:[.,]\d+)*/g;   // "700B+", "100k", "25×", "−0.5" all yield their digits
const nums = (s) => new Set([...s.matchAll(NUM)].map((m) => m[0].replace(/[.,]$/, "")));
// Structural fields are not claims: ordering keys, dates, links, source lists.
const SKIP_KEYS = /^(order|sources|repo|links|date|start|end|href|url|slug|weight|demo|image|alt)\s*:/;

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(ROOT).filter((p) => /\.(md|mdx|json|ya?ml)$/.test(p));
if (files.length === 0) { console.error(`check-numbers: no content files under ${ROOT}`); process.exit(1); }

const approved = readFileSync(CONTENT_MD, "utf8");
let bad = 0, checked = 0, sourced = "";   // text of every source any entry lists, for the built-page pass
for (const f of files) {
  const raw = readFileSync(f, "utf8");
  let srcText = approved;
  const listed = [...raw.matchAll(/^\s*-\s*"?(sources\/[^"\s]+)"?\s*$/gm)].map((m) => m[1]);
  for (const s of listed) {
    if (!existsSync(s)) { console.error(`FAIL ${f}: listed source ${s} missing`); bad++; continue; }
    srcText += "\n" + readFileSync(s, "utf8"); sourced += "\n" + readFileSync(s, "utf8");
  }
  const ok = nums(srcText);
  let inList = false;
  raw.split("\n").forEach((line, i) => {
    if (/^\s*(sources|links)\s*:/.test(line)) { inList = true; return; }
    if (inList && /^\s+-/.test(line)) return;
    inList = false;
    if (SKIP_KEYS.test(line.trim()) || /^\s*import\s/.test(line)) return;
    const text = line
      .replace(/\]\([^)]*\)/g, "]")            // markdown link targets
      .replace(/https?:\/\/\S+/g, "")          // bare URLs
      .replace(/\b(?:href|src|id|class)="[^"]*"/g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");   // MDX comments
    for (const n of nums(text)) {
      checked++;
      if (!ok.has(n)) { console.error(`FAIL ${relative(".", f)}:${i + 1}: "${n}" is in no approved source`); bad++; }
    }
  });
}
// Second pass: what the built text pages actually show, so figures written into templates (the home page's
// ticker and status line, project page chrome) are checked too, plus the home page's boot log, which lives
// in a script. Named failure: a figure typed into index.astro or home.ts that no approved source holds.
// Allowed without a source, each for a stated reason: zero-padded section counters (01..99), and the
// simulated market's labelled seed and starting price on the home page.
const DIST = "dist";
if (!existsSync(DIST)) { console.error("check-numbers: dist/ not found; build first (absence never passes)"); process.exit(1); }
const ALLOW = (n) => /^0\d$/.test(n) || n === "42" || n === "100.00";
const textPages = ["index.html", "about/index.html", "projects/index.html", "cv/index.html", "card/index.html",
  ...readdirSync(join(DIST, "projects")).map((d) => `projects/${d}/index.html`)]
  .filter((p) => existsSync(join(DIST, p)) && !readFileSync(join(DIST, p), "utf8").startsWith("<!doctype html><title>Redirecting"));
const okAll = nums(approved + sourced);   // a built page may show what the approved wording or a listed public source holds
let built = 0;
const visible = (h) => h.replace(/<(script|style|svg|template)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ");
for (const p of textPages) {
  for (const n of nums(visible(readFileSync(join(DIST, p), "utf8")))) {
    built++; checked++;
    if (!okAll.has(n) && !ALLOW(n)) { console.error(`FAIL dist/${p}: "${n}" is shown but is in no approved source`); bad++; }
  }
}
const boot = readFileSync("src/components/home/home.ts", "utf8").match(/^\s*"\[<span class=ok>.*$/gm) ?? [];
if (!boot.length) { console.error("check-numbers: the home page's boot log was not found in home.ts"); bad++; }
for (const line of boot) for (const n of nums(line.replace(/<[^>]+>/g, " ").replace(/c\+\+20/g, ""))) {
  checked++;
  if (!okAll.has(n) && !ALLOW(n)) { console.error(`FAIL src/components/home/home.ts boot log: "${n}" is in no approved source`); bad++; }
}
if (!built) { console.error("check-numbers: the built text pages show no numbers; refusing a vacuous pass"); process.exit(1); }
if (checked === 0) { console.error("check-numbers: content holds no numbers at all; refusing a vacuous pass"); process.exit(1); }
if (bad) { console.error(`check-numbers: ${bad} untraced number(s)`); process.exit(1); }
console.log(`check-numbers: OK (${checked} numbers in ${files.length} files and ${textPages.length} built pages)`);
