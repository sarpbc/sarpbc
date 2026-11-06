import type { Author } from "../../common/domain/author";
import type { ReplyTargetFields } from "../domain/reply";

export interface ReplyRecord extends ReplyTargetFields {
  id: string;
  content: string;
  createdAt: Date;
  hiddenAt: Date | null;
  author: Author;
  replyTo: { id: string } | null;
}

export interface CreateReplyInput {
  content: string;
  postId?: string;
  newsArticleId?: string;
  matchId?: string;
  replyToId?: string;
}
