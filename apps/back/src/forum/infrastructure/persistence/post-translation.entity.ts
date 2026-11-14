import type { Post } from "./post.entity";

export class PostTranslation {
  id!: string;
  post!: Post;
  locale!: string;
  title!: string;
  content!: string;
  createdAt: Date = new Date();
  updatedAt: Date | null = null;
}
