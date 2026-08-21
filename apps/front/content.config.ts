import { defineCollection, defineContentConfig, z } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    legal: defineCollection({
      type: "page",
      source: "legal/**/*.md",
      schema: z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        lastUpdated: z.string().min(1),
      }),
    }),
    about: defineCollection({
      type: "page",
      source: "about/**/*.md",
      schema: z.object({
        title: z.string().min(1),
        description: z.string().min(1),
      }),
    }),
    contact: defineCollection({
      type: "page",
      source: "contact/**/*.md",
      schema: z.object({
        title: z.string().min(1),
        description: z.string().min(1),
      }),
    }),
  },
});
