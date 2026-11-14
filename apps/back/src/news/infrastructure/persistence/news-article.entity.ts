import { defineEntity, p } from "@mikro-orm/core";
import { NEWS_TYPES, type NewsType } from "@sarpbc/types";
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
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    slug: p.string().length(NEWS_TEXT_MAX_LENGTH).unique(),
    title: p.string().length(NEWS_TEXT_MAX_LENGTH),
    content: p.text(),
    titleFr: p.string().length(NEWS_TEXT_MAX_LENGTH).nullable(),
    contentFr: p.text().nullable(),
    author: p.manyToOne(User),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .nullable()
      .onUpdate(() => new Date()),
    isDraft: p.boolean().default(true),
    imageUrl: p.string().length(NEWS_TEXT_MAX_LENGTH).nullable(),
    type: p
      .enum([...NEWS_TYPES])
      .columnType("text")
      .default(DEFAULT_NEWS_TYPE),
  },
});
