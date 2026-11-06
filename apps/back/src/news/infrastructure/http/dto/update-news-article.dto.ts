import { z } from "zod";
import { NEWS_TEXT_MAX_LENGTH } from "../../../domain/news-limits";
import { CreateNewsArticleDto, NewsCoverImageUrl } from "./create-news-article.dto";
export const UpdateNewsArticleDto = CreateNewsArticleDto.partial().extend({
  imageUrl: NewsCoverImageUrl.optional().nullable(),
  slug: z
    .string()
    .trim()
    .min(1, "Enter a slug, or leave the field unchanged.")
    .max(NEWS_TEXT_MAX_LENGTH)
    .optional(),
});
export type UpdateNewsArticleDto = z.infer<typeof UpdateNewsArticleDto>;
