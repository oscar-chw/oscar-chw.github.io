// Parts of a grouped project page (src/content/projects/_*.mdx) are compiled one by one, so each would
// give its "Limits" heading the same id and a link to #limits would always land on the first part.
// Prefix every heading id in a part with the part's name: #factor-lab-limits. Astro keeps ids already set.
import { basename } from "node:path";

const text = (n) => n.type === "text" ? n.value : (n.children ?? []).map(text).join("");
const slug = (s) => s.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-");

export default function rehypePartIds() {
  return (tree, file) => {
    const name = basename(file.path ?? file.history?.[0] ?? "");
    if (!name.startsWith("_")) return;
    const part = name.slice(1).replace(/\.mdx?$/, "");
    const walk = (n) => {
      if (n.type === "element" && /^h[1-6]$/.test(n.tagName)) { n.properties ??= {}; n.properties.id ??= `${part}-${slug(text(n))}`; }
      (n.children ?? []).forEach(walk);
    };
    walk(tree);
  };
}
