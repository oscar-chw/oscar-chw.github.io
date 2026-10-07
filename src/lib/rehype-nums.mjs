// Wraps figures in prose ("2.18", "40%", "25×", "11") in <span class="num"> so they read as data:
// mono, accent-coloured. Code, links and headings keep their own styling, so they are skipped, and so
// are issue and path numbers (#52, v/3): they are references, not figures.
const SKIP = new Set(["code", "pre", "a", "script", "style", "svg", "h1", "h2", "h3", "h4", "kbd"]);
export const NUM = /(?<![\w.\-−#/])[−-]?\d+(?:[.,]\d+)*(?:%|×|x|k|M|B)?\+?(?![\w])/g;

export function wrapNums(text) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(NUM)) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    out.push({ type: "element", tagName: "span", properties: { className: ["num"] }, children: [{ type: "text", value: m[0] }] });
    last = m.index + m[0].length;
  }
  if (!out.length) return null;
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

function walk(node) {
  if (!node.children || SKIP.has(node.tagName) || SKIP.has(node.name)) return;
  node.children = node.children.flatMap((c) => (c.type === "text" ? wrapNums(c.value) ?? [c] : (walk(c), [c])));
}

export default function rehypeNums() {
  return (tree) => walk(tree);
}
