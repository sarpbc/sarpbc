import { defineCollection, defineContentConfig, z } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    about: defineCollection({
      schema: z.object({
        description: z.string().min(1),
        title: z.string().min(1),
      }),
      source: "about/**/*.md",
      type: "page",
    }),
    contact: defineCollection({
      schema: z.object({
        description: z.string().min(1),
        title: z.string().min(1),
      }),
      source: "contact/**/*.md",
      type: "page",
    }),
    legal: defineCollection({
      schema: z.object({
        description: z.string().min(1),
        lastUpdated: z.string().min(1),
        title: z.string().min(1),
      }),
      source: "legal/**/*.md",
      type: "page",
    }),
  },
});
