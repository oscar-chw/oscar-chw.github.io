import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// SITE_BASE=/next/ builds the preview that is served beside the old page until Oscar approves.
export default defineConfig({
  site: "https://oscar-chw.github.io",
  base: process.env.SITE_BASE ?? "/",
  trailingSlash: "always",
  integrations: [mdx(), sitemap()],
  build: { inlineStylesheets: "always" },
  fonts: [
    {
      name: "Instrument Sans",
      cssVariable: "--font-sans",
      provider: fontProviders.google(),
      weights: ["400 700"],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["system-ui", "sans-serif"],
    },
  ],
});
