import { Collection, defineEntity, p } from "@mikro-orm/core";
import { Post } from "../../../forum/infrastructure/forum-persistence";
import { NewsArticle } from "../../../news/infrastructure/news-persistence";
import { Match } from "../../../tournament/infrastructure/competition-persistence";
import { User } from "../../../user/infrastructure/user-persistence";
import type { ReplyReportReason } from "@sarpbc/types";

export class Reply {
  id!: string;
  content!: string;
  createdAt: Date = new Date();
  author!: User;
  post: Post | null = null;
  newsArticle: NewsArticle | null = null;
  match: Match | null = null;
  replyTo: Reply | null = null;
  replies = new Collection<Reply>(this);
  hiddenAt: Date | null = null;
  reports = new Collection<ReplyReport>(this);
}

export class ReplyReport {
  id!: string;
  reply!: Reply;
  reporter!: User;
  reason!: ReplyReportReason;
  createdAt: Date = new Date();
}

export const ReplySchema = defineEntity({
  class: Reply,
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    content: p.text(),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    author: p.manyToOne(User),
    post: p.manyToOne(Post).nullable(),
    newsArticle: p.manyToOne(NewsArticle).nullable(),
    match: p.manyToOne(Match).nullable(),
    replyTo: p.manyToOne(Reply).nullable(),
    replies: p.oneToMany(Reply).mappedBy("replyTo"),
    hiddenAt: p.datetime().type("timestamptz").nullable(),
    reports: p.oneToMany(ReplyReport).mappedBy("reply"),
  },
});

export const ReplyReportSchema = defineEntity({
  class: ReplyReport,
  indexes: [
    { properties: ["reply", "reporter"], options: { unique: true } },
    { properties: ["reply"] },
    { properties: ["createdAt"] },
  ],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    reply: p.manyToOne(Reply).deleteRule("cascade"),
    reporter: p.manyToOne(User),
    reason: p.string(),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
  },
});
