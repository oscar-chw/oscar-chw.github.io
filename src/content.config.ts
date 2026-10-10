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
    group: z.enum(["Research platforms", "Quant research", "Competitions", "Engineering and AI", "Coursework"]),
    role: z.string(),
    period: z.string().optional(),
    stack: z.array(z.string()),
    partOf: z.string().optional(),
    // headline figures; each value is checked by scripts/check-numbers.mjs
    metrics: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
    links: z.array(z.object({ label: z.string(), href: z.url() })).default([]),
    sources: z.array(z.string()).default([]),
    // a flagship's engineering case study (CaseStudy.astro), shown in place of the decorative project graphic
    casestudy: z.object({
      problem: z.string(), constraints: z.array(z.string()).min(1), experiment: z.string(), result: z.string(),
      tradeoff: z.object({ chose: z.string(), over: z.string(), why: z.string(), cost: z.string() }),
      contribution: z.string(), evidence: z.array(z.object({ label: z.string(), href: z.url() })).min(1),
    }).optional(),
    // a merged open-source contribution, shown as a callout under the summary
    contribution: z.object({ heading: z.string(), body: z.string(), label: z.string(), href: z.url(), facts: z.string() }).optional(),
  }),
});

export const collections = { projects };
