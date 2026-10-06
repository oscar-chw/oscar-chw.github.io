import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import rehypeNums from "./src/lib/rehype-nums.mjs";

// SITE_BASE=/next/ builds the preview that is served beside the old page until Oscar approves.
export default defineConfig({
  site: "https://oscar-chw.github.io",
  base: process.env.SITE_BASE ?? "/",
  trailingSlash: "always",
  integrations: [mdx(), sitemap()],
  markdown: { rehypePlugins: [rehypeNums] },
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
