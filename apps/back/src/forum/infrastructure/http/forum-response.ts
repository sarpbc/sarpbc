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
  id: post.id,
  publicId: post.publicId,
  title: post.title,
  content: post.content,
  author: { id: post.author.id, userName: post.author.userName },
  topic: { id: post.topic.id, title: post.topic.title },
  postType: post.postType,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  translations: post.translations.map((translation) => ({
    id: translation.id,
    post: { id: translation.post.id },
    locale: translation.locale,
    title: translation.title,
    content: translation.content,
    createdAt: translation.createdAt,
    updatedAt: translation.updatedAt,
  })),
});

export const postWithSlugResponse = (post: PostRecord): PostWithSlugResponse => ({
  ...postResponse(post),
  slug: forumPostSlug(post.title),
});

export const postActivityResponse = (activity: PostActivity): PostPreview => ({
  id: activity.id,
  publicId: activity.publicId,
  title: activity.title,
  messageCount: activity.messageCount,
  lastActivity: activity.lastActivity.toISOString(),
  slug: forumPostSlug(activity.title),
});

export const topicResponse = (topic: TopicRecord): TopicResponse => ({
  id: topic.id,
  title: topic.title,
  description: topic.description,
  createdAt: topic.createdAt,
  updatedAt: topic.updatedAt,
  posts: topic.posts.map(postResponse),
});
