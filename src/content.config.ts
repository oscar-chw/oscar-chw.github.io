import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number(),
    featured: z.boolean().default(false),
    group: z.enum(["Research platforms", "Quant research", "Competitions", "Engineering and AI"]),
    role: z.string(),
    period: z.string().optional(),
    stack: z.array(z.string()),
    partOf: z.string().optional(),
    // headline figures; each value is checked by scripts/check-numbers.mjs
    metrics: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
    links: z.array(z.object({ label: z.string(), href: z.url() })).default([]),
    sources: z.array(z.string()).default([]),
  }),
});

export const collections = { projects };
