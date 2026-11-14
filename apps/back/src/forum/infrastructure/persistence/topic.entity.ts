import { Collection } from "@mikro-orm/core";
import type { Post } from "./post.entity";

export class Topic {
  id!: string;
  title!: string;
  description: string | null = null;
  posts = new Collection<Post>(this);
  createdAt: Date = new Date();
  updatedAt: Date | null = null;
}
