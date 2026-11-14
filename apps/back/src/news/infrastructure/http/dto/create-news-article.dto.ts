import { z } from "zod";
import { NEWS_TEXT_MAX_LENGTH } from "../../../domain/news-limits";
import { NEWS_TYPES } from "@sarpbc/types";

export const NewsCoverImageUrl = z
  .string()
  .trim()
  .max(NEWS_TEXT_MAX_LENGTH)
  .pipe(z.url({ message: "Enter a valid cover image URL.", protocol: /^(?:https?|ftp)$/u }));

export const createNewsArticleFields = {
  content: z.string().min(1),
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
  title: z.string().min(1).max(NEWS_TEXT_MAX_LENGTH),
  titleFr: z
    .string()
    .trim()
    .max(NEWS_TEXT_MAX_LENGTH)
    .transform((value) => value || null)
    .nullish(),
  type: z.enum(NEWS_TYPES).optional(),
};

export const CreateNewsArticleDto = z.strictObject(createNewsArticleFields);

export type CreateNewsArticleInput = z.infer<typeof CreateNewsArticleDto>;
