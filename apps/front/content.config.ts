import { defineCollection, defineContentConfig, z } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    news: defineCollection({
      type: "page",
      source: "news/*.md",
      schema: z.object({
        title: z.string().min(1),
        author: z.string().min(1).optional(),
        twitter: z.string().optional(),
        date: z.string(),
        tags: z.array(z.string()).optional(),
        image: z.string().optional(),
      }),
    }),
    legal: defineCollection({
      type: "page",
      source: "legal/**/*.md",
      schema: z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        lastUpdated: z.string().min(1),
      }),
    }),
  },
});
