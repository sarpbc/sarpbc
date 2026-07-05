import { Reply } from "../../forum/forum.entities";

export interface IReplyRepository {
  findByPostId(postId: string): Promise<Reply[]>;
  findByNewsArticleId(newsArticleId: string): Promise<Reply[]>;
  findById(id: string): Promise<Reply | null>;
  findLatestByUser(userId: string): Promise<Reply | null>;
  save(reply: Reply): Promise<void>;
}
