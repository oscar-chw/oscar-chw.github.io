// Gate: published performance figures retain the scope of their source evidence.
// A matching number alone is insufficient: snapshot, workload and measurement boundary matter.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const read = (p) => readFileSync(p, "utf8"); // Missing inputs must fail, never become empty text.
const clean = (s) => s.replace(/<(script|style|svg|template)\b[^>]*>[\s\S]*?<\/\1>/g, " ")
  .replace(/<\/(?:p|div|li|dd|dt|section|h[1-6])>/g, " ").replace(/<[^>]+>/g, "")
  .replace(/&(?:nbsp|#160);/g, " ").replace(/&(?:amp|#38);/g, "&").replace(/\s+/g, " ");
let bad = 0, checked = 0;
const require = (ok, where, why) => { checked++; if (!ok) { console.error(`FAIL ${where}: ${why}`); bad++; } };
function scopes(text, where) {
  require(!/(?:under|<)\s*0\.2\s*s\b|stock.day.{0,100}0\.2\s*s\b/i.test(text), where, "withdrawn QTS query-latency claim");
  for (const match of text.matchAll(/700\s*B\+|704,009,291,430/g)) {
    const context = text.slice(Math.max(0, match.index - 220), match.index + 420);
    require(/stored/i.test(context) && /2026-10-05|5 Oct(?:ober)? 2026|Oct(?:ober)? 5,? 2026/i.test(context), where, "row count needs stored-row and dated snapshot scope");
  }
  for (const match of text.matchAll(/23\s*(?:of|\/)\s*23/g)) {
    const context = text.slice(Math.max(0, match.index - 220), match.index + 320);
    require(/\b420,?000\b/.test(context) && /fixture/i.test(context), where, "commit count needs the separate concurrency fixture");
  }
  for (const match of text.matchAll(/17\s*[–-]\s*21\s*×/g)) {
    const context = text.slice(Math.max(0, match.index - 180), match.index + 480);
    require(/warm/i.test(context) && /complex128/i.test(context) && /24\s*[–-]\s*28/.test(context) && /32.thread/i.test(context), where, "GPU speed needs warm complex128 workload and CPU baseline");
  }
  for (const match of text.matchAll(/2\.9\s*(?:ε|machine epsilons)/g)) {
    const context = text.slice(Math.max(0, match.index - 240), match.index + 420);
    require(/\b110\b/.test(context) && /small circuits/i.test(context) && /up to 5 qubit\/qutrit subsystems/i.test(context) && /60.digit/.test(context), where, "precision bound needs the small-circuit oracle fixture");
  }
  for (const match of text.matchAll(/80\s*%/g)) {
    const context = text.slice(Math.max(0, match.index - 220), match.index + 420);
    require(/tasks with rule violations/i.test(context) && /prompted/i.test(context) && /synthetic (?:tool.use )?testbed/i.test(context), where, "FYP reduction needs task measure, prompted baseline and synthetic testbed");
  }
}
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const pages = walk("dist").filter((p) => p.endsWith(".html"));
require(pages.length > 10, "dist", "built pages absent or incomplete");
for (const path of ["index.html", "about/index.html", "projects/qts-research-platform/index.html", "projects/fatqat-gpu-backend/index.html", "projects/ai-quant-research-system/index.html", "projects/final-year-project/index.html"])
  require(clean(read(join("dist", path))).length > 500, path, "required claim-bearing page missing or empty");
for (const path of pages) scopes(clean(read(path)), path);
const aqr = clean(read("dist/projects/ai-quant-research-system/index.html"));
require(!/end.to.end when the native replay|whole path.{0,50}end to end/i.test(aqr), "AI research page", "API timing must not become end-to-end platform speed");
for (const token of [/preloaded/i, /100k.message/i, /64.query/i, /including conversion/i, /loading.{0,80}checking.{0,40}excluded/i])
  require(token.test(aqr), "AI research page", `missing replay measurement boundary ${token}`);
// Scope must travel with a replay figure, not be borrowed from an unrelated paragraph.
const aqrHtml = read("dist/projects/ai-quant-research-system/index.html");
const replayBlocks = [...aqrHtml.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>|<dt\b[^>]*>[\s\S]*?<\/dt>\s*<dd\b[^>]*>[\s\S]*?<\/dd>/g)]
  .map((m) => clean(m[0])).filter((s) => /(?:2\.3|25)\s*×/.test(s));
require(replayBlocks.length >= 2, "AI research page", "replay headline and explanation missing");
for (const block of replayBlocks) {
  require(/preloaded/i.test(block) && /synthetic/i.test(block) && /100k.message/i.test(block) && /64.query/i.test(block) && /loading.{0,80}checking.{0,40}excluded/i.test(block), "replay claim block", "each caller ratio needs its own synthetic fixture and timing boundary");
  if (/25\s*×/.test(block)) require(/C\+\+ caller/.test(block), "replay claim block", "25× needs the C++ caller boundary");
  if (/2\.3\s*×/.test(block)) require(/Python API/i.test(block) && /including conversion/i.test(block), "replay claim block", "2.3× needs the Python API caller including conversion");
}
for (const path of ["public/console.js", "src/components/home/home.ts", "src/components/harbour/harbour.ts"]) scopes(read(path), path);
const pdf = execFileSync("pdftotext", ["-layout", "dist/cv/Oscar_Choi_CV.pdf", "-"], { encoding: "utf8" }).replace(/\s+/g, " ");
require(pdf.length > 500, "public CV", "PDF text missing");
scopes(pdf, "public CV");
if (bad) { console.error(`check-claim-scopes: ${bad} failure(s)`); process.exit(1); }
console.log(`check-claim-scopes: OK (${checked} assertions; ${pages.length} built pages, hidden UI claims and public CV)`);
