import { z } from "zod";
import { NEWS_TYPES } from "@sarpbc/types";
export const CreateNewsArticleDto = z.strictObject({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  titleFr: z
    .string()
    .trim()
    .max(255)
    .transform((value) => value || null)
    .nullish(),
  contentFr: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullish(),
  imageUrl: z
    .string()
    .trim()
    .max(255)
    .pipe(z.url({ protocol: /^(https?|ftp)$/, message: "Enter a valid cover image URL." }))
    .optional(),
  slug: z
    .string()
    .trim()
    .min(1, "Enter a slug, or leave empty to generate one from the title.")
    .max(255)
    .optional(),
  type: z.enum(NEWS_TYPES).optional(),
});

export type CreateNewsArticleDto = z.infer<typeof CreateNewsArticleDto>;
