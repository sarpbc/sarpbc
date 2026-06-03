import { Post } from "./post.entity";
import { PostType } from "../post-type.enum";
import { PostTranslation } from "./post-translation.entity";

export interface CreatePostData {
  title: string;
  content: string;
  topicId: string;
  postType: PostType;
  translations?: Array<{ locale: string; title: string; content: string }>;
}

export interface IPostRepository {
  findPaginated(options: { limit?: number; offset?: number }): Promise<Post[]>;
  findByTopicId(topicId: string): Promise<Post[]>;
  findById(id: string): Promise<Post | null>;
  findWithDetails(id: string): Promise<Post | null>;
  findRecentActivity(limit: number): Promise<
    Array<{
      id: string;
      title: string;
      messageCount: number;
      lastActivity: Date;
    }>
  >;
  hasRecentPostByUser(userId: string, sinceDate: Date): Promise<boolean>;
  save(post: Post): Promise<void>;
  saveTranslation(translation: PostTranslation): Promise<void>;
}
