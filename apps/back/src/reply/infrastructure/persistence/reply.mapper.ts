import type { EntityManager } from "@mikro-orm/postgresql";
import type { ReplyTargetType } from "@sarpbc/types";
import { Post } from "../../../forum/infrastructure/forum-persistence";
import { NewsArticle } from "../../../news/infrastructure/news-persistence";
import { Match, toMatchSlug } from "../../../tournament/infrastructure/competition-persistence";
import type { ReplyRecord } from "../../application/models";
import { REPLY_TARGETS, type ReplyTargetFields } from "../../domain/reply";
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
  title: row.title,
  slug: row.slug,
});

const matchFields = (row: Match) => ({
  id: row.id,
  publicId: row.publicId,
  name: row.name,
  slug: toMatchSlug(row),
});

export const REPLY_TARGET_LOADERS = {
  forumPost: async (em, id) => {
    const row = await em.findOne(Post, { id });

    return row && { post: postFields(row) };
  },
  newsArticle: async (em, id) => {
    const row = await em.findOne(NewsArticle, { id });

    return row && { newsArticle: newsArticleFields(row) };
  },
  match: async (em, id) => {
    const row = await em.findOne(
      Match,
      { id },
      { populate: ["participants.team", "participants.players", "tournament.event"] },
    );

    return row && { match: matchFields(row) };
  },
} satisfies Record<
  ReplyTargetType,
  (em: EntityManager, id: string) => Promise<Partial<ReplyTargetFields> | null>
>;

export function replySnapshot(row: Reply): ReplyRecord {
  return {
    id: row.id,
    content: row.content,
    createdAt: new Date(row.createdAt),
    hiddenAt: row.hiddenAt ? new Date(row.hiddenAt) : null,
    author: { id: row.author.id, userName: row.author.userName },
    replyTo: row.replyTo ? { id: row.replyTo.id } : null,
    post: row.post ? postFields(row.post) : null,
    newsArticle: row.newsArticle ? newsArticleFields(row.newsArticle) : null,
    match: row.match ? matchFields(row.match) : null,
  };
}
