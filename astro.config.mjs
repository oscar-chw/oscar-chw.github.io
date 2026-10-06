import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import rehypeNums from "./src/lib/rehype-nums.mjs";
import rehypePartIds from "./src/lib/rehype-part-ids.mjs";

// SITE_BASE=/next/ builds the preview that is served beside the old page until Oscar approves.
export default defineConfig({
  site: "https://oscar-chw.github.io",
  base: process.env.SITE_BASE ?? "/",
  trailingSlash: "always",
  integrations: [mdx(), sitemap()],
  markdown: { rehypePlugins: [rehypeNums, rehypePartIds] },
  // projects grouped on 2026-10-06: every old page lands on its section of the group page
  redirects: Object.fromEntries(Object.entries({"point-in-time-research": "ai-quant-research-system", "factor-lab": "ai-quant-research-system", "market-making-lab": "ai-quant-research-system", "agent-harness": "ai-quant-research-system", "imc-prosperity-4": "competitions", "pokemon-tcg-ai": "competitions", "streaming-reconciliation": "supporting-work", "alpha-search": "supporting-work", "studyflow": "coursework"}).map(([old, group]) => [`/projects/${old}/`, `${(process.env.SITE_BASE ?? "/").replace(/\/$/, "")}/projects/${group}/#${old}`])),
  build: { inlineStylesheets: "always" },
  fonts: [
    {
      name: "Geist",
      cssVariable: "--font-sans",
      provider: fontProviders.google(),
      weights: ["400 700"],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      name: "Geist Mono",
      cssVariable: "--font-mono",
      provider: fontProviders.google(),
      weights: ["400 600"],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "Menlo", "monospace"],
    },
  ],
});
