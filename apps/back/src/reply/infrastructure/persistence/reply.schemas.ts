import { defineEntity, p } from "@mikro-orm/core";
import { Post } from "../../../forum/infrastructure/forum-persistence";
import { NewsArticle } from "../../../news/infrastructure/news-persistence";
import { Match } from "../../../tournament/infrastructure/competition-persistence";
import { User } from "../../../user/infrastructure/user-persistence";
import { Reply } from "./reply.entity";
import { ReplyReport } from "./reply-report.entity";

export const ReplySchema = defineEntity({
  class: Reply,
  properties: {
    author: p.manyToOne(User),
    content: p.text(),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    hiddenAt: p.datetime().type("timestamptz").nullable(),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    match: p.manyToOne(Match).nullable(),
    newsArticle: p.manyToOne(NewsArticle).nullable(),
    post: p.manyToOne(Post).nullable(),
    replies: p.oneToMany(Reply).mappedBy("replyTo"),
    replyTo: p.manyToOne(Reply).nullable(),
    reports: p.oneToMany(ReplyReport).mappedBy("reply"),
  },
});

export const ReplyReportSchema = defineEntity({
  class: ReplyReport,
  indexes: [
    { options: { unique: true }, properties: ["reply", "reporter"] },
    { properties: ["reply"] },
    { properties: ["createdAt"] },
  ],
  properties: {
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    reason: p.string(),
    reply: p.manyToOne(Reply).deleteRule("cascade"),
    reporter: p.manyToOne(User),
  },
});
