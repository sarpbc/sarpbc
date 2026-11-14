import { defineEntity, p } from "@mikro-orm/core";
import { NEWS_TYPES } from "@sarpbc/types";
import type { NewsType } from "@sarpbc/types";
import { DEFAULT_NEWS_TYPE } from "../../domain/news-type";
import { NEWS_TEXT_MAX_LENGTH } from "../../domain/news-limits";
import { User } from "../../../user/infrastructure/user-persistence";

export class NewsArticle {
  id!: string;
  slug!: string;
  title!: string;
  content!: string;
  titleFr: string | null = null;
  contentFr: string | null = null;
  author!: User;
  createdAt: Date = new Date();
  updatedAt: Date | null = null;
  isDraft = true;
  imageUrl: string | null = null;
  type: NewsType = DEFAULT_NEWS_TYPE;
}

export const NewsArticleSchema = defineEntity({
  class: NewsArticle,
  indexes: [{ properties: ["title"] }, { properties: ["author"] }, { properties: ["type"] }],
  properties: {
    author: p.manyToOne(User),
    content: p.text(),
    contentFr: p.text().nullable(),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    imageUrl: p.string().length(NEWS_TEXT_MAX_LENGTH).nullable(),
    isDraft: p.boolean().default(true),
    slug: p.string().length(NEWS_TEXT_MAX_LENGTH).unique(),
    title: p.string().length(NEWS_TEXT_MAX_LENGTH),
    titleFr: p.string().length(NEWS_TEXT_MAX_LENGTH).nullable(),
    type: p
      .enum([...NEWS_TYPES])
      .columnType("text")
      .default(DEFAULT_NEWS_TYPE),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .nullable()
      .onUpdate(() => new Date()),
  },
});
