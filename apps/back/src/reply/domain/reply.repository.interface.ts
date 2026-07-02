import { Reply } from "../../forum/forum.entities";

export interface IReplyRepository {
  findByPostId(postId: string): Promise<Reply[]>;
  findByNewsArticleId(newsArticleId: string): Promise<Reply[]>;
  findById(id: string): Promise<Reply | null>;
  hasRecentReplyByUser(userId: string, sinceDate: Date): Promise<boolean>;
  save(reply: Reply): Promise<void>;
}
