import type { Post, Topic } from "./forum.entities";
import type { PostRecord, TopicRecord } from "../../domain/forum";
export function postSnapshot(row: Post): PostRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    title: row.title,
    content: row.content,
    author: { id: row.author.id, userName: row.author.userName },
    topic: { id: row.topic.id, title: row.topic.title },
    postType: row.postType,
    createdAt: new Date(row.createdAt),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
    translations: row.translations.isInitialized()
      ? row.translations.getItems().map((t) => ({
          id: t.id,
          post: { id: row.id },
          locale: t.locale,
          title: t.title,
          content: t.content,
          createdAt: new Date(t.createdAt),
          updatedAt: t.updatedAt ? new Date(t.updatedAt) : null,
        }))
      : [],
  };
}
export function topicSnapshot(row: Topic): TopicRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: new Date(row.createdAt),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
    posts: row.posts.isInitialized() ? row.posts.getItems().map(postSnapshot) : [],
  };
}
