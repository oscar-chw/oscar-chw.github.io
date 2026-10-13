// Falsification checks run in an isolated copy, so serving dist/ is never mutated.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync, execFileSync } from "node:child_process";

const root = process.cwd(), tmp = mkdtempSync(join(tmpdir(), "website-claim-probes-"));
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
for (const path of [...walk("dist").filter((p) => p.endsWith(".html")), "dist/cv/Oscar_Choi_CV.pdf", "public/console.js", "src/components/home/home.ts", "src/components/harbour/harbour.ts"]) {
  mkdirSync(dirname(join(tmp, path)), { recursive: true });
  writeFileSync(join(tmp, path), readFileSync(path));
}
const run = () => {
  const r = spawnSync(process.execPath, [join(root, "scripts/check-claim-scopes.mjs")], { cwd: tmp, encoding: "utf8" });
  return { exit: r.status, output: r.stdout + r.stderr };
};
const control = run();
if (control.exit !== 0) throw Error(control.output);
const probes = [
  ["withdrawn-latency", "public/console.js", (s) => s.replace('ping: "pong"', 'ping: "pong · under 0.2 s"'), "withdrawn QTS"],
  ["missing-snapshot", "dist/projects/qts-research-platform/index.html", (s) => s.replaceAll("2026-10-05", "undated"), "dated snapshot"],
  ["wrong-fixture", "src/components/harbour/harbour.ts", (s) => s.replaceAll("420,000", "42000000"), "separate concurrency fixture"],
  ["unbounded-speed", "dist/projects/fatqat-gpu-backend/index.html", (s) => s.replaceAll("warm", "cold"), "warm complex128"],
  ["unbounded-precision", "dist/projects/fatqat-gpu-backend/index.html", (s) => s.replaceAll("small circuits", "circuits"), "small-circuit oracle"],
  ["missing-replay-boundary", "dist/projects/ai-quant-research-system/index.html", (s) => s.replaceAll("preloaded", "unloaded"), "replay measurement boundary"],
  ["unscoped-cpp-paragraph", "dist/projects/ai-quant-research-system/index.html", (s) => s.replace(/<p\b[^>]*>On a [\s\S]*?<\/p>/, (p) => p.replaceAll("preloaded", "unloaded")), "replay claim block"],
  ["missing-synthetic-fixture", "dist/projects/ai-quant-research-system/index.html", (s) => s.replaceAll("synthetic", "market"), "replay claim block"],
  ["wrong-python-caller", "dist/projects/ai-quant-research-system/index.html", (s) => s.replaceAll("Python API", "browser API"), "replay claim block"],
  ["unscoped-fyp", "dist/about/index.html", (s) => s.replaceAll("tasks with rule violations", "rule violations"), "FYP reduction"],
];
const records = [];
for (const [name, path, mutate, expected] of probes) {
  const full = join(tmp, path), saved = readFileSync(full);
  try {
    const modified = mutate(saved.toString());
    if (modified === saved.toString()) throw Error(`Vacuous mutation: ${name}`);
    writeFileSync(full, modified);
    const result = run();
    if (result.exit !== 1 || !result.output.includes(expected)) throw Error(name + JSON.stringify(result));
    records.push({ name, exit: result.exit, caught: true });
  } finally { writeFileSync(full, saved); }
}
const missing = join(tmp, "dist/projects/qts-research-platform/index.html");
try {
  renameSync(missing, missing + ".held");
  const result = run();
  if (result.exit !== 1 || !result.output.includes("ENOENT")) throw Error(JSON.stringify(result));
  records.push({ name: "missing-qts-page", exit: result.exit, caught: true });
} finally { renameSync(missing + ".held", missing); }
// A fixed historical revision keeps this probe useful after the new CV is committed.
const pdf = join(tmp, "dist/cv/Oscar_Choi_CV.pdf"), saved = readFileSync(pdf);
try {
  writeFileSync(pdf, execFileSync("git", ["show", "1efb4b9:public/cv/Oscar_Choi_CV.pdf"]));
  const result = run();
  if (result.exit !== 1 || !result.output.includes("public CV: withdrawn")) throw Error(result.output);
  records.push({ name: "old-public-cv", exit: result.exit, caught: true });
} finally { writeFileSync(pdf, saved); }
const restored = run();
if (restored.exit !== 0) throw Error(restored.output);
const report = { checkedAt: new Date().toISOString(), control, records, restored };
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n");
console.log(`claim gate: clean control PASS; ${records.length} mutations caught; restored control PASS`);
