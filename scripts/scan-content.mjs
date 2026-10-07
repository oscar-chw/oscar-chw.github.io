// Gate: nothing on the "never publish" list reaches the built site or its sources.
// Named failures: a phone number, student ID, GPA, a second email address, a
// withheld result (Kaggle rank, alpha-gp-lab test IC, the asof 0-of-120 study,
// the researcher-only FYP figures), or any term from the private denylist(s).
//
// SCAN_DENYLIST: colon-separated regex files kept outside this repo (one
// case-insensitive regex per line). If the variable names a file that does
// not exist, the scan FAILS rather than silently skipping it.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const TARGETS = ["dist", "src", "public"];
const BUILTIN = {
  "phone (HK)": /(?:\+?852[\s-]?)?\b[2-9]\d{3}[\s-]?\d{4}\b(?![\s-]?\d)/,
  "student id": /\b1155\d{6}\b/,
  "gpa": /\bGPA\b|\bcGPA\b/i,
  "kaggle rank": /2,043|\b2043(?:rd)?\b/,
  "alpha-gp-lab test IC": /0\.082|\bt\s*0\.22\b/,
  "asof 0-of-120": /\b0[- ]of[- ]120\b|120 hypotheses/i,
  "researcher-only FYP": /32% violated|fine-tuned 4B/i,
  "finance minor or BBA (the minor is called Business)": /finance minor|minor in finance|\bBBA\b/i,
  "English is \"fluent\", never native or near-native": /English\s*\((?:[^)]*\b)?(?:near-)?native\b/i,
  "tel link": /\btel:/i,
  // FatQat's default GPU mode rounds its sums (within 2.9 eps), so it is "error-compensated", never "exact";
  // shot branching and the simplifier really are exact and keep the word.
  // QTS: 0.09 s was a repeated read from a cache (first load 0.19 s); quote "under 0.2 s". The server has
  // health probes and verification gates, not "health checks"; the relay claims below were never made.
  "QTS query time is under 0.2 s, never 0.09 s": /\b0\.09 s\b/,
  "QTS: health probes and verification gates, not health checks": /automated health checks/i,
  // the relay's packet-loss figure waits on its 24-hour acceptance check (CONTENT.md); not shown until it passes
  "QTS relay packet-loss claim pending acceptance": /packet loss/i,
  "QTS relay overclaims": /rewritten in Go|zero downtime|guaranteed no leaks|fully signed off/i,
  // streaming-reconciliation was retired on 2026-10-08 (replaced by crypto-trading-pipeline) and goes private.
  "retired repo streaming-reconciliation": /streaming[- ]reconciliation/i,
  // Oscar 2026-10-08: the pipeline is exchange-agnostic; never name the hackathon's exchange.
  "hackathon exchange named": /Roostoo/i,
  "FatQat default mode is error-compensated, not exact": /exact[- ](?:GPU |arithmetic|mode\b)/i,
  // BRAIN rules forbid automation as a source of alpha ideas: no counts, no "-style", no companion framing.
  // "BRAIN"/"WorldQuant" may appear only in the experience entry on the about page (checked below).
  "BRAIN simulation count": /17,000|17000/,
  "WorldQuant-style": /WorldQuant[- ]style/i,
  "companion framing": /\bcompanion\b/i,
};
const ALLOWED_EMAIL = /^(choiheiwang@gmail\.com|\d+\+oscar-chw@users\.noreply\.github\.com)$/i;

const extra = [];
for (const f of (process.env.SCAN_DENYLIST ?? "").split(":").filter(Boolean)) {
  if (!existsSync(f)) { console.error(`scan-content: denylist ${f} not found`); process.exit(1); }
  readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .forEach((p, i) => extra.push([`denylist ${f.split("/").pop()}#${i + 1}`, new RegExp(p, "i")]));
}

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = TARGETS.filter(existsSync).flatMap(walk).filter((p) => /\.(html|md|mdx|astro|ts|js|json|txt|xml|svg|vcf)$/.test(p));
if (!files.some((f) => f.startsWith("dist/"))) { console.error("scan-content: no built site in dist/; build first"); process.exit(1); }

// For HTML: visible text plus every attribute value (a phone number can hide in href="tel:…" or
// aria-label), but not scripts, styles or data: URIs, whose digit runs are not contact details.
const visible = (html) => {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ");
  const GEOMETRY = /^(d|points|viewBox|transform|x[12]?|y[12]?|cx|cy|r|width|height|stroke-dasharray|style|srcset|sizes)$/;
  const attrs = [...body.matchAll(/\s([\w:-]+)="([^"]*)"/g)].filter(([, n, v]) => !GEOMETRY.test(n) && !v.startsWith("data:")).map((m) => m[2]);
  return body.replace(/<[^>]+>/g, " ") + "\n" + attrs.join("\n");
};

let bad = 0;
for (const f of files) {
  const raw = readFileSync(f, "utf8");
  // embedded data: URIs (images, filter maps) are encoded bytes, not prose; their digit runs are not phone numbers
  const text = (f.endsWith(".html") ? visible(raw) : raw).replace(/data:[^"')\s]+/g, "data:…");
  // a vCard must never carry a phone field at all, and its base64 photo (PHOTO plus folded lines) is not prose
  if (f.endsWith(".vcf") && /^(TEL|item\d*\.TEL)[;:]/im.test(raw)) { console.error(`FAIL ${relative(".", f)}: vCard has a phone (TEL) field`); bad++; }
  const lines = text.split("\n");
  const isCode = /\.(ts|js|json|svg)$/.test(f) || f.startsWith("dist/") && !f.endsWith(".html");
  lines.forEach((line, i) => {
    const aboutPage = /(^|\/)about(\.mdx|\/index\.html)$/.test(f);
    if (!aboutPage && /\bBRAIN\b|WorldQuant/i.test(line)) { console.error(`FAIL ${relative(".", f)}:${i + 1}: WorldQuant/BRAIN outside the about page's experience entry`); bad++; }
    for (const [kind, re] of [...Object.entries(BUILTIN), ...extra]) {
      if (kind === "phone (HK)" && isCode) continue;        // numeric data arrays are not phone numbers
      if (re.test(line)) { console.error(`FAIL ${relative(".", f)}:${i + 1}: ${kind}`); bad++; }
    }
    for (const m of line.matchAll(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g)) {
      if (!ALLOWED_EMAIL.test(m[0]) && !/@(?:astrojs|example)\./.test(m[0])) { console.error(`FAIL ${relative(".", f)}:${i + 1}: email ${m[0].replace(/^[^@]+/, "***")}`); bad++; }
    }
  });
  // FatQat was inspired by CENG5280 but is not coursework. Named failure: the two in one sentence.
  // Tested on the raw file, with the window stopped at a tag or string boundary: on flattened HTML,
  // nav and list items with no full stop between them would read as one long "sentence".
  if (/(?:fatqat|CENG\s?5280)[^.<>"\n]{0,200}coursework|coursework[^.<>"\n]{0,200}(?:fatqat|CENG\s?5280)/i.test(raw)) { console.error(`FAIL ${relative(".", f)}: FatQat or CENG5280 called coursework`); bad++; }
  // FatQat's 35–42× is the r9 release's figure; the current code differs. Named failure: the figure
  // shown as if it described the current code. Every occurrence needs "r9" close by.
  for (const m of text.matchAll(/35\s*[–-]\s*42\s*×/g)) {
    if (!/\br9\b/.test(text.slice(Math.max(0, m.index - 240), m.index + 280))) { console.error(`FAIL ${relative(".", f)}: "35–42×" without its r9 label nearby`); bad++; }
  }
}
if (bad) { console.error(`scan-content: ${bad} finding(s)`); process.exit(1); }
console.log(`scan-content: OK (${files.length} files, ${extra.length} denylist terms)`);
