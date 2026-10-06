// The search experiment's corpus: every section of this site's own write-ups as plain text, with a
// link to that section. Built at build time from the MDX sources; fetched only when the experiment opens.
import type { APIRoute } from "astro";

const raw = import.meta.glob<string>(["../../content/projects/*.mdx", "../../content/pages/about.mdx"], { query: "?raw", import: "default", eager: true });
const name = (p: string) => p.split("/").pop()!.replace(/\.mdx$/, "");
const slug = (s: string) => s.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-");
const plain = (s: string) => s
  .replace(/^import .*$/gm, "")
  .replace(/<([A-Z]\w*)\b[^>]*?\/>/gs, "")                 // self-closing components (Flow, Part, parts)
  .replace(/<\/?[A-Za-z][^>]*>/g, "")                       // tags around text (Term, p): keep the text
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/[*_`]+/g, "")
  .replace(/^\s*[-•]\s+/gm, "")
  .replace(/\s+/g, " ").trim();

function split(body: string) {
  const out: { heading: string; text: string }[] = [];
  let heading = "", buf: string[] = [];
  for (const line of body.split("\n")) {
    const m = /^#{2,3}\s+(.*)$/.exec(line);
    if (m) { out.push({ heading, text: plain(buf.join("\n")) }); heading = m[1].trim(); buf = []; } else buf.push(line);
  }
  out.push({ heading, text: plain(buf.join("\n")) });
  return out.filter((s) => s.text.length > 40);
}

export const GET: APIRoute = () => {
  const files = Object.entries(raw).map(([p, src]) => {
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(src);
    return { id: name(p), title: fm ? /^title:\s*"?(.+?)"?\s*$/m.exec(fm[1])?.[1] ?? "" : "", body: fm ? src.slice(fm[0].length) : src };
  });
  // which group page shows each part, and under which heading
  const owner = new Map<string, { group: string; title: string; heading: string }>();
  for (const f of files) {
    if (f.id.startsWith("_")) continue;
    for (const m of f.body.matchAll(/^## (.+)\n\n<Part [^\n]*\/>\n\n<P_(\w+) \/>/gm))
      owner.set(m[2].replace(/_/g, "-"), { group: f.id, title: f.title, heading: m[1] });
  }
  const passages = files.flatMap((f) => {
    if (f.id.startsWith("_")) {
      const part = f.id.slice(1), o = owner.get(part);
      if (!o) return [];
      return split(f.body).map((s, i) => ({ id: `${part}-${i}`, title: `${o.heading}${s.heading ? ` · ${s.heading}` : ""}`,
        href: `/projects/${o.group}/#${s.heading ? `${part}-${slug(s.heading)}` : part}`, text: s.text }));
    }
    const page = f.id === "about" ? { href: "/about/", title: "About" } : { href: `/projects/${f.id}/`, title: f.title };
    return split(f.body).map((s, i) => ({ id: `${f.id}-${i}`, title: `${page.title}${s.heading ? ` · ${s.heading}` : ""}`,
      href: `${page.href}${s.heading ? `#${slug(s.heading)}` : ""}`, text: s.text }));
  });
  // the about page's Experience entry is the one place a restricted employer name may appear (content rule):
  // it is never copied into the index, so search cannot surface it elsewhere. scan-content checks the output.
  const allowed = passages.filter((p) => !/^About · Experience/.test(p.title));
  return new Response(JSON.stringify(allowed), { headers: { "content-type": "application/json" } });
};
