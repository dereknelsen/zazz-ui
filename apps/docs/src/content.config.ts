import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/** A page in a sidebar-driven area (Docs, API). */
const page = z.object({
  title: z.string(),
  description: z.string().optional(),
  /** Sidebar group. */
  section: z.string(),
  /** Position within the group. */
  order: z.number().default(0),
  /** Position of the group; the lowest value among its pages wins. */
  sectionOrder: z.number().optional(),
});

export const collections = {
  docs: defineCollection({
    loader: glob({ pattern: "**/*.mdoc", base: "./src/content/docs" }),
    schema: page,
  }),
  api: defineCollection({
    loader: glob({ pattern: "**/*.mdoc", base: "./src/content/api" }),
    schema: page.extend({
      /** For a primitive page: the identity whose attributes and hooks tables render. */
      primitive: z.string().optional(),
    }),
  }),
  blog: defineCollection({
    loader: glob({ pattern: "**/*.mdoc", base: "./src/content/blog" }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      draft: z.boolean().default(false),
      tags: z.array(z.string()).default([]),
    }),
  }),
};
