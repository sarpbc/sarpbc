import type { Post } from "./post.entity";
import type { Topic } from "./topic.entity";

export const postSnapshot = (row: Post) => ({
  author: { id: row.author.id, userName: row.author.userName },
  content: row.content,
  createdAt: new Date(row.createdAt),
  id: row.id,
  postType: row.postType,
  publicId: row.publicId,
  title: row.title,
  topic: { id: row.topic.id, title: row.topic.title },
  translations: row.translations.isInitialized()
    ? row.translations.getItems().map((t) => ({
        content: t.content,
        createdAt: new Date(t.createdAt),
        id: t.id,
        locale: t.locale,
        post: { id: row.id },
        title: t.title,
        updatedAt: t.updatedAt ? new Date(t.updatedAt) : null,
      }))
    : [],
  updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
});

export const topicSnapshot = (row: Topic) => ({
  createdAt: new Date(row.createdAt),
  description: row.description,
  id: row.id,
  posts: row.posts.isInitialized() ? row.posts.getItems().map(postSnapshot) : [],
  title: row.title,
  updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
});
