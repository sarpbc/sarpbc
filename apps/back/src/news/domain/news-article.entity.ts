import { defineEntity, p } from "@mikro-orm/core";
import { User } from "../../user/domain/user.entity";

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
  isDraft: boolean = true;
  imageUrl: string | null = null;
}

export const NewsArticleSchema = defineEntity({
  class: NewsArticle,
  indexes: [{ properties: ["title"] }, { properties: ["author"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    slug: p.string().length(255).unique(),
    title: p.string().length(255).index(),
    content: p.text(),
    titleFr: p.string().length(255).nullable(),
    contentFr: p.text().nullable(),
    author: p.manyToOne(User).index(),
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
    imageUrl: p.string().length(255).nullable(),
  },
});
