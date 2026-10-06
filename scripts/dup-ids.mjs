// Gate: no built page repeats an element id (a repeated id breaks in-page links and aria references).
// Named failure: grouped project pages whose parts each produced #the-problem, #limits, ...
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = process.argv[2] ?? "dist";
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const pages = walk(DIST).filter((p) => p.endsWith(".html"));
if (!pages.length) { console.error(`dup-ids: no pages in ${DIST}`); process.exit(1); }
let bad = 0;
for (const p of pages) {
  const ids = [...readFileSync(p, "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  if (dup.length) { bad++; console.log(`FAIL ${p}: ${dup.join(", ")}`); }
}
console.log(bad ? `dup-ids: ${bad} page(s) repeat ids` : `dup-ids: OK (${pages.length} pages)`);
process.exit(bad ? 1 : 0);
