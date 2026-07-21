import { Reply } from "../../forum/forum.entities";

export interface IReplyRepository {
  findByPostId(postId: string, includeHidden?: boolean): Promise<Reply[]>;
  findByNewsArticleId(newsArticleId: string, includeHidden?: boolean): Promise<Reply[]>;
  findByMatchId(matchId: string, includeHidden?: boolean): Promise<Reply[]>;
  findById(id: string): Promise<Reply | null>;
  findLatestByUser(userId: string): Promise<Reply | null>;
  save(reply: Reply): Promise<void>;
  delete(reply: Reply): Promise<void>;
}
