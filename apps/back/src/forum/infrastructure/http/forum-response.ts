import type { ForumTopic, PostPreview } from "@sarpbc/types";
import { forumPostSlug } from "@sarpbc/utils";
import type { PostType } from "../../domain/post-type.enum";
import type { PostActivity, PostRecord, TopicRecord } from "../../application/models";

export interface TranslationResponse {
  id: string;
  post: { id: string };
  locale: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface PostResponseFields {
  id: string;
  publicId: number;
  title: string;
  content: string;
  author: { id: string; userName: string };
  topic: { id: string; title: string };
  postType: PostType;
  createdAt: Date;
  updatedAt: Date | null;
  translations: TranslationResponse[];
}

export interface TopicResponse extends ForumTopic {
  createdAt: Date;
  updatedAt: Date | null;
  posts: PostResponseFields[];
}

export type PostWithSlugResponse = PostResponseFields & { slug: string };

const postResponse = (post: PostRecord): PostResponseFields => ({
  author: { id: post.author.id, userName: post.author.userName },
  content: post.content,
  createdAt: post.createdAt,
  id: post.id,
  postType: post.postType,
  publicId: post.publicId,
  title: post.title,
  topic: { id: post.topic.id, title: post.topic.title },
  translations: post.translations.map((translation) => ({
    content: translation.content,
    createdAt: translation.createdAt,
    id: translation.id,
    locale: translation.locale,
    post: { id: translation.post.id },
    title: translation.title,
    updatedAt: translation.updatedAt,
  })),
  updatedAt: post.updatedAt,
});

export const postWithSlugResponse = (post: PostRecord): PostWithSlugResponse => ({
  ...postResponse(post),
  slug: forumPostSlug(post.title),
});

export const postActivityResponse = (activity: PostActivity): PostPreview => ({
  id: activity.id,
  lastActivity: activity.lastActivity.toISOString(),
  messageCount: activity.messageCount,
  publicId: activity.publicId,
  slug: forumPostSlug(activity.title),
  title: activity.title,
});

export const topicResponse = (topic: TopicRecord): TopicResponse => ({
  createdAt: topic.createdAt,
  description: topic.description,
  id: topic.id,
  posts: topic.posts.map(postResponse),
  title: topic.title,
  updatedAt: topic.updatedAt,
});
