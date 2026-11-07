import { z } from "zod";
import { NEWS_TEXT_MAX_LENGTH } from "../../../domain/news-limits";
import { createNewsArticleFields, NewsCoverImageUrl } from "./create-news-article.dto";
export const updateNewsArticleFields = {
  ...createNewsArticleFields,
  title: createNewsArticleFields.title.optional(),
  content: createNewsArticleFields.content.optional(),
  imageUrl: NewsCoverImageUrl.optional().nullable(),
  slug: z
    .string()
    .trim()
    .min(1, "Enter a slug, or leave the field unchanged.")
    .max(NEWS_TEXT_MAX_LENGTH)
    .optional(),
};
export const UpdateNewsArticleDto = z.strictObject(updateNewsArticleFields);
export type UpdateNewsArticleDto = z.infer<typeof UpdateNewsArticleDto>;
