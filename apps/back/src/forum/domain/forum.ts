import type { ReplyAuthor } from "../../reply/domain/reply";
import type { PostType } from "./post-type.enum";
export interface TopicRecord {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  posts: PostSummary[];
}
export interface PostSummary {
  id: string;
  publicId: number;
  title: string;
  content: string;
  author: ReplyAuthor;
  createdAt: Date;
  updatedAt: Date | null;
  postType: PostType;
  topic: { id: string; title: string };
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
  translations?: { locale: "en-US" | "fr-FR"; title: string; content: string }[];
}
export interface CreatedPost {
  publicId: number;
  slug: string;
}
export interface PostCreationStatus {
  canCreate: boolean;
  nextAvailableAt: string | null;
  cooldownHours: number;
}
