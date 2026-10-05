// Gate: every link on the built site resolves.
//   node scripts/link-check.mjs <dist> [--external] [--base /next]
// Internal href/src must name a file in dist (after stripping the deploy base).
// With --external, every distinct http(s) link is fetched; anything but 2xx/3xx
// fails. LinkedIn answers bots with HTTP 999 and Instagram rate-limits CI runners with 429,
// whatever the URL, so for those hosts alone that code counts as "exists"; the exception is
// printed, not hidden.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const args = process.argv.slice(2);
const bi = args.indexOf("--base");
const BASE = bi >= 0 ? args[bi + 1].replace(/\/$/, "") : "";
const DIST = args.find((a, i) => !a.startsWith("--") && !(bi >= 0 && i === bi + 1)) ?? "dist";
const EXTERNAL = args.includes("--external");
const BOT_WALLED = { "www.linkedin.com": 999, "linkedin.com": 999, "www.instagram.com": 429, "instagram.com": 429 };

if (!existsSync(DIST)) { console.error(`link-check: ${DIST}/ missing`); process.exit(1); }
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const pages = walk(DIST).filter((p) => p.endsWith(".html"));
if (!pages.length) { console.error("link-check: no pages"); process.exit(1); }

let bad = 0;
const external = new Map();
const exists = (p) => {
  const clean = decodeURIComponent(p.split("#")[0].split("?")[0]);
  const full = join(DIST, clean);
  return existsSync(full) && (statSync(full).isFile() || existsSync(join(full, "index.html")));
};
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  for (const [, url] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    if (/^(mailto:|tel:|data:|javascript:|#)/.test(url)) continue;
    // The site's own absolute URLs (canonical, og:url) are checked against the build, not the network:
    // before launch they would 404 live, after launch they would only test the previous deploy.
    const own = url.match(/^https?:\/\/oscar-chw\.github\.io(\/.*)?$/);
    if (/^https?:\/\//.test(url) && !own) { if (!external.has(url)) external.set(url, relative(DIST, page)); continue; }
    const target = own ? own[1] ?? "/" : url;
    let path = target.startsWith("/") ? target : "/" + join(relative(DIST, dirname(page)), target);
    if (BASE && path.startsWith(BASE + "/")) path = path.slice(BASE.length);
    else if (BASE && target.startsWith("/")) { console.error(`FAIL ${relative(DIST, page)}: ${url} ignores the base ${BASE}`); bad++; continue; }
    if (!exists(path)) { console.error(`FAIL ${relative(DIST, page)}: broken internal link ${url}`); bad++; }
  }
}

if (EXTERNAL) {
  const urls = [...external.keys()];
  const check = async (url) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "user-agent": "Mozilla/5.0 link-check" } });
        const host = new URL(url).host;
        if (r.ok || BOT_WALLED[host] === r.status) { if (!r.ok) console.log(`note ${url}: ${r.status} (bot wall, counted as exists)`); return; }
        if (attempt) { console.error(`FAIL ${external.get(url)}: ${url} -> HTTP ${r.status}`); bad++; }
      } catch (e) { if (attempt) { console.error(`FAIL ${external.get(url)}: ${url} -> ${e.name}`); bad++; } }
    }
  };
  for (let i = 0; i < urls.length; i += 8) await Promise.all(urls.slice(i, i + 8).map(check));
  console.log(`link-check: ${urls.length} external links fetched`);
}
if (bad) { console.error(`link-check: ${bad} broken`); process.exit(1); }
console.log(`link-check: OK (${pages.length} pages)`);
