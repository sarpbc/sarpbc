import type { SupportedLocale } from "@sarpbc/types";
import type { Author } from "../../common/domain/author";
import type { PostType } from "../domain/post-type.enum";

export interface TopicRecord {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  posts: PostRecord[];
}

export interface PostSummary {
  id: string;
  publicId: number;
  title: string;
  content: string;
  author: Author;
  createdAt: Date;
  updatedAt: Date | null;
  postType: PostType;
  topic: { id: string; title: string };
}

export interface PostActivity {
  id: string;
  publicId: number;
  title: string;
  messageCount: number;
  lastActivity: Date;
}

export interface TranslationRecord {
  id: string;
  post: { id: string };
  locale: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface PostRecord extends PostSummary {
  translations: TranslationRecord[];
}

export type NewPostRecord = Omit<PostRecord, "publicId">;

export interface CreatePostInput {
  id: string;
  title: string;
  content: string;
  topicId: string;
  translations?: { locale: SupportedLocale; title: string; content: string }[];
}

export interface CreatedPost {
  publicId: number;
  slug: string;
}
