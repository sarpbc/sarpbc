import { defineEntity, p } from "@mikro-orm/core";
import { User } from "../../../user/infrastructure/user-persistence";
import { PostRepository } from "./post.repository";
import { PostType } from "../../domain/post-type.enum";
import { TopicRepository } from "./topic.repository";
import { Topic } from "./topic.entity";
import { Post } from "./post.entity";
import { PostTranslation } from "./post-translation.entity";

export const TopicSchema = defineEntity({
  class: Topic,
  properties: {
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    description: p.text().nullable(),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    posts: p.oneToMany(Post).mappedBy("topic"),
    title: p.string(),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .nullable()
      .onUpdate(() => new Date()),
  },
  repository: () => TopicRepository,
});

export const PostSchema = defineEntity({
  class: Post,
  properties: {
    author: p.manyToOne(User),
    content: p.text(),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    postType: p
      .enum(() => PostType)
      .columnType("text")
      .default(PostType.DISCUSSION),
    publicId: p.integer().autoincrement().generated("identity").unique(),
    title: p.string(),
    topic: p.manyToOne(Topic),
    translations: p.oneToMany(PostTranslation).mappedBy("post"),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .nullable()
      .onUpdate(() => new Date()),
  },
  repository: () => PostRepository,
});

export const PostTranslationSchema = defineEntity({
  class: PostTranslation,
  properties: {
    content: p.text(),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    locale: p.string(),
    post: p.manyToOne(Post),
    title: p.string(),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .nullable()
      .onUpdate(() => new Date()),
  },
});
