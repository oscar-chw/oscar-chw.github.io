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

const NUM = /(?<![\w.,/#-])\d+(?:[.,]\d+)*/g;   // "700B+", "100k", "25×" all yield their digits
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
let bad = 0, checked = 0;
for (const f of files) {
  const raw = readFileSync(f, "utf8");
  let srcText = approved;
  const listed = [...raw.matchAll(/^\s*-\s*"?(sources\/[^"\s]+)"?\s*$/gm)].map((m) => m[1]);
  for (const s of listed) {
    if (!existsSync(s)) { console.error(`FAIL ${f}: listed source ${s} missing`); bad++; continue; }
    srcText += "\n" + readFileSync(s, "utf8");
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
if (checked === 0) { console.error("check-numbers: content holds no numbers at all; refusing a vacuous pass"); process.exit(1); }
if (bad) { console.error(`check-numbers: ${bad} untraced number(s)`); process.exit(1); }
console.log(`check-numbers: OK (${checked} numbers in ${files.length} files)`);
