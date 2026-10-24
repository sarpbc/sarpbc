import { toMatchSlug } from "../../../tournament/infrastructure/persistence/competition.mapper";
import type { Reply } from "../../../forum/infrastructure/persistence/forum.entities";
import type { ReplyRecord } from "../../application/models";
export function replySnapshot(row: Reply): ReplyRecord {
  return {
    id: row.id,
    content: row.content,
    createdAt: new Date(row.createdAt),
    hiddenAt: row.hiddenAt ? new Date(row.hiddenAt) : null,
    author: { id: row.author.id, userName: row.author.userName },
    replyTo: row.replyTo ? { id: row.replyTo.id } : null,
    post: row.post ? { id: row.post.id, publicId: row.post.publicId, title: row.post.title } : null,
    newsArticle: row.newsArticle
      ? { id: row.newsArticle.id, title: row.newsArticle.title, slug: row.newsArticle.slug }
      : null,
    match: row.match
      ? {
          id: row.match.id,
          publicId: row.match.publicId,
          name: row.match.name,
          slug: toMatchSlug(row.match),
        }
      : null,
  };
}
