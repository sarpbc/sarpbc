import { z } from "zod";
import { NEWS_TEXT_MAX_LENGTH } from "../../../domain/news-limits";
import { NEWS_TYPES } from "@sarpbc/types";
export const NewsCoverImageUrl = z
  .string()
  .trim()
  .max(NEWS_TEXT_MAX_LENGTH)
  .pipe(z.url({ protocol: /^(https?|ftp)$/, message: "Enter a valid cover image URL." }));
export const CreateNewsArticleDto = z.strictObject({
  title: z.string().min(1).max(NEWS_TEXT_MAX_LENGTH),
  content: z.string().min(1),
  titleFr: z
    .string()
    .trim()
    .max(NEWS_TEXT_MAX_LENGTH)
    .transform((value) => value || null)
    .nullish(),
  contentFr: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullish(),
  imageUrl: NewsCoverImageUrl.optional(),
  slug: z
    .string()
    .trim()
    .min(1, "Enter a slug, or leave empty to generate one from the title.")
    .max(NEWS_TEXT_MAX_LENGTH)
    .optional(),
  type: z.enum(NEWS_TYPES).optional(),
});

export type CreateNewsArticleDto = z.infer<typeof CreateNewsArticleDto>;
