import type { EntityManager } from "@mikro-orm/postgresql";
import type { ReplyTargetType } from "@sarpbc/types";
import { Post } from "../../../forum/infrastructure/forum-persistence";
import { NewsArticle } from "../../../news/infrastructure/news-persistence";
import { Match, toMatchSlug } from "../../../tournament/infrastructure/competition-persistence";
import { REPLY_TARGETS } from "../../domain/reply";
import type { ReplyTargetFields } from "../../domain/reply";
import type { Reply } from "./reply.entity";

export const REPLY_POPULATE = [
  "author",
  "replyTo",
  "replyTo.author",
  "post",
  "newsArticle",
  "match",
  "match.participants.team",
  "match.participants.players",
  "match.tournament.event",
] as const;

/** A reply whose target was removed has no page to link to. */
export const REPLY_HAS_TARGET: Partial<Record<keyof ReplyTargetFields, { $ne: null }>>[] =
  Object.values(REPLY_TARGETS).map(({ field }) => ({ [field]: { $ne: null } }));

const postFields = (row: Post) => ({ id: row.id, publicId: row.publicId, title: row.title });

const newsArticleFields = (row: NewsArticle) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
});

const matchFields = (row: Match) => ({
  id: row.id,
  name: row.name,
  publicId: row.publicId,
  slug: toMatchSlug(row),
});

export const REPLY_TARGET_LOADERS = {
  forumPost: async (em, id) => {
    const row = await em.findOne(Post, { id });

    return row && { post: postFields(row) };
  },
  match: async (em, id) => {
    const row = await em.findOne(
      Match,
      { id },
      { populate: ["participants.team", "participants.players", "tournament.event"] },
    );

    return row && { match: matchFields(row) };
  },
  newsArticle: async (em, id) => {
    const row = await em.findOne(NewsArticle, { id });

    return row && { newsArticle: newsArticleFields(row) };
  },
} satisfies Record<
  ReplyTargetType,
  (em: EntityManager, id: string) => Promise<Partial<ReplyTargetFields> | null>
>;

export const replySnapshot = (row: Reply) => ({
  author: { id: row.author.id, userName: row.author.userName },
  content: row.content,
  createdAt: new Date(row.createdAt),
  hiddenAt: row.hiddenAt ? new Date(row.hiddenAt) : null,
  id: row.id,
  match: row.match ? matchFields(row.match) : null,
  newsArticle: row.newsArticle ? newsArticleFields(row.newsArticle) : null,
  post: row.post ? postFields(row.post) : null,
  replyTo: row.replyTo ? { id: row.replyTo.id } : null,
});
