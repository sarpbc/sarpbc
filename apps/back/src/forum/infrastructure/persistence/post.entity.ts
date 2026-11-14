import { Collection } from "@mikro-orm/core";
import type { User } from "../../../user/infrastructure/user-persistence";
import { PostType } from "../../domain/post-type.enum";
import type { Topic } from "./topic.entity";
import type { PostTranslation } from "./post-translation.entity";

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
