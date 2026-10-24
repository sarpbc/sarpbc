import type { EntityRef } from "../../common/domain/entity-ref";
import type { NewPostRecord, PostRecord, TopicRecord, TranslationRecord } from "./models";
import type { ReplyAuthor } from "../../reply/domain/reply";
export interface PostStore {
  findPaginated(options: { limit?: number; offset?: number }): Promise<PostRecord[]>;
  findByTopicId(id: string): Promise<PostRecord[]>;
  findById(id: string): Promise<PostRecord | null>;
  findWithDetails(ref: EntityRef): Promise<PostRecord | null>;
  findLatestByUser(id: string): Promise<PostRecord | null>;
  findRecentActivity(limit: number): Promise<
    {
      id: string;
      publicId: number;
      title: string;
      messageCount: number;
      lastActivity: Date;
    }[]
  >;
  save(post: NewPostRecord): Promise<void>;
  saveTranslation(translation: TranslationRecord): Promise<void>;
  deleteTranslations(post: PostRecord): Promise<void>;
  delete(post: PostRecord): Promise<void>;
}
export interface TopicStore {
  findAllTopics(): Promise<TopicRecord[]>;
  findById(id: string): Promise<TopicRecord | null>;
  findByTitle(title: string): Promise<TopicRecord | null>;
  save(topic: TopicRecord): Promise<void>;
}
export interface ForumWriteScope {
  posts: PostStore;
  topics: TopicStore;
  users: { findById(id: string): Promise<ReplyAuthor | null> };
  replies: { deleteAllForPost(id: string): Promise<void> };
}
export interface ForumTransaction {
  run<T>(work: (scope: ForumWriteScope) => Promise<T>): Promise<T>;
}
