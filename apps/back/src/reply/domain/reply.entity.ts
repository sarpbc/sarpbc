import { Entity, ManyToOne, OneToMany, PrimaryKey, Property, Collection } from "@mikro-orm/core";
import { User } from "../../user/domain/user.entity";
import { Post } from "../../forum/post/domain/post.entity";
import { NewsArticle } from "../../news/domain/news-article.entity";
import { ReplyRepository } from "../reply.repository";

@Entity({ repository: () => ReplyRepository })
export class Reply {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @Property({ type: "text" })
  content!: string;

  @Property({ type: "datetime", onCreate: () => new Date() })
  createdAt: Date = new Date();

  @ManyToOne(() => User)
  author!: User;

  @ManyToOne(() => Post, { nullable: true })
  post: Post | null = null;

  @ManyToOne(() => NewsArticle, { nullable: true })
  newsArticle: NewsArticle | null = null;

  @ManyToOne(() => Reply, { nullable: true })
  replyTo: Reply | null = null;

  @OneToMany(() => Reply, (reply) => reply.replyTo)
  replies = new Collection<Reply>(this);
}
