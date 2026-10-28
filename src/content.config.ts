import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// A source is a path in the tachyoncms repo at v0.1.0, with an optional #anchor
// (README.md#access-rules), or the https:// page that holds a fact the repo can't.
const source = z.string().regex(/^(https:\/\/\S+|[\w.][\w./-]*(#[\w-]+)?)$/, 'a repo path at v0.1.0, or an https:// URL');

export const collections = {
  // One entry per product page: its copy, and where every fact in it comes from.
  features: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/features' }),
    schema: z.object({
      title: z.string(),
      summary: z.string(),
      // today: ships in v0.1.0. headed: where TachyonCMS is going, told as direction.
      status: z.enum(['today', 'headed']),
      sources: z.array(source).min(1),
    }),
  }),
  // One entry per product we compare against. Every row cites the other product's own site.
  compare: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/compare' }),
    schema: z.object({
      name: z.string(),
      summary: z.string(),
      checked: z.coerce.date(),
      rows: z
        .array(z.object({ topic: z.string(), tachyon: z.string(), them: z.string(), source: z.url() }))
        .min(1),
      // Where TachyonCMS isn't there yet. Every page has to say.
      notYet: z.array(z.string()).min(1),
    }),
  }),
};
