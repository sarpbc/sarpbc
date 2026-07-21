import { Collection, defineEntity, p } from "@mikro-orm/core";
import { NewsArticle } from "../news/domain/news-article.entity";
import { ReplyRepository } from "../reply/reply.repository";
import { Match } from "../tournament/tournament.entities";
import { User } from "../user/domain/user.entity";
import { PostRepository } from "./post/post.repository";
import { PostType } from "./post/post-type.enum";
import { TopicRepository } from "./topic/topic.repository";

export class Topic {
  id!: string;
  title!: string;
  description: string | null = null;
  posts = new Collection<Post>(this);
  createdAt: Date = new Date();
  updatedAt: Date | null = null;
}

export class Post {
  id!: string;
  title!: string;
  content!: string;
  translations = new Collection<PostTranslation>(this);
  topic!: Topic;
  author!: User;
  postType: PostType = PostType.DISCUSSION;
  replies = new Collection<Reply>(this);
  createdAt: Date = new Date();
  updatedAt: Date | null = null;
}

export class PostTranslation {
  id!: string;
  post!: Post;
  locale!: string;
  title!: string;
  content!: string;
  createdAt: Date = new Date();
  updatedAt: Date | null = null;
}

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
  /** When set, reply is hidden from public lists (admin soft-hide). */
  hiddenAt: Date | null = null;
}

export const TopicSchema = defineEntity({
  class: Topic,
  repository: () => TopicRepository,
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    title: p.string(),
    description: p.text().nullable(),
    posts: p.oneToMany(Post).mappedBy("topic"),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .nullable()
      .onUpdate(() => new Date()),
  },
});

export const PostSchema = defineEntity({
  class: Post,
  repository: () => PostRepository,
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    title: p.string(),
    content: p.text(),
    translations: p.oneToMany(PostTranslation).mappedBy("post"),
    topic: p.manyToOne(Topic),
    author: p.manyToOne(User),
    postType: p
      .enum(() => PostType)
      .columnType("text")
      .default(PostType.DISCUSSION),
    replies: p.oneToMany(Reply).mappedBy("post"),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .nullable()
      .onUpdate(() => new Date()),
  },
});

export const PostTranslationSchema = defineEntity({
  class: PostTranslation,
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    post: p.manyToOne(Post),
    locale: p.string(),
    title: p.string(),
    content: p.text(),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .nullable()
      .onUpdate(() => new Date()),
  },
});

export const ReplySchema = defineEntity({
  class: Reply,
  repository: () => ReplyRepository,
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    content: p.text(),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    author: p.manyToOne(User),
    post: p.manyToOne(Post).nullable(),
    newsArticle: p.manyToOne(NewsArticle).nullable(),
    match: p.manyToOne(Match).nullable(),
    replyTo: p.manyToOne(Reply).nullable(),
    replies: p.oneToMany(Reply).mappedBy("replyTo"),
    hiddenAt: p.datetime().type("timestamptz").nullable(),
  },
});
