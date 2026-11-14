import { Collection } from "@mikro-orm/core";
import type { Post } from "../../../forum/infrastructure/forum-persistence";
import type { NewsArticle } from "../../../news/infrastructure/news-persistence";
import type { Match } from "../../../tournament/infrastructure/competition-persistence";
import type { User } from "../../../user/infrastructure/user-persistence";
import type { ReplyReport } from "./reply-report.entity";

export class Reply {
  id!: string;
  content!: string;
  createdAt: Date = new Date();
  author!: User;
  post: Post | null = null;
  newsArticle: NewsArticle | null = null;
  match: Match | null = null;
  replyTo: Reply | null = null;
  replies = new Collection<Reply>(this);
  hiddenAt: Date | null = null;
  reports = new Collection<ReplyReport>(this);
}
