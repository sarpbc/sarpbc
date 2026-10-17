import { z } from "zod";
import { CreateNewsArticleDto } from "./create-news-article.dto";
export const UpdateNewsArticleDto = CreateNewsArticleDto.partial().extend({
  imageUrl: CreateNewsArticleDto.shape.imageUrl.nullable(),
  slug: z.string().trim().min(1, "Enter a slug, or leave the field unchanged.").max(255).optional(),
});
export type UpdateNewsArticleDto = z.infer<typeof UpdateNewsArticleDto>;
