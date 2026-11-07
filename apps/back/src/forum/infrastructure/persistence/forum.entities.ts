import { Collection, defineEntity, p } from "@mikro-orm/core";
import { User } from "../../../user/infrastructure/user-persistence";
import { PostRepository } from "./post.repository";
import { PostType } from "../../domain/post-type.enum";
import { TopicRepository } from "./topic.repository";

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
  publicId!: number;
  title!: string;
  content!: string;
  translations = new Collection<PostTranslation>(this);
  topic!: Topic;
  author!: User;
  postType: PostType = PostType.DISCUSSION;
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
    publicId: p.integer().autoincrement().generated("identity").unique(),
    title: p.string(),
    content: p.text(),
    translations: p.oneToMany(PostTranslation).mappedBy("post"),
    topic: p.manyToOne(Topic),
    author: p.manyToOne(User),
    postType: p
      .enum(() => PostType)
      .columnType("text")
      .default(PostType.DISCUSSION),
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
