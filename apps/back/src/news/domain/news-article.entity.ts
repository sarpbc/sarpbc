import { defineEntity, p } from "@mikro-orm/core";
import { User } from "../../user/domain/user.entity";

export class NewsArticle {
  id!: string;
  slug!: string;
  title!: string;
  content!: string;
  author!: User;
  createdAt: Date = new Date();
  updatedAt: Date | null = null;
  isDraft: boolean = true;
}

export const NewsArticleSchema = defineEntity({
  class: NewsArticle,
  indexes: [{ properties: ["title"] }, { properties: ["author"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    slug: p.string().length(255).unique(),
    title: p.string().length(255).index(),
    content: p.text(),
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
  },
});
