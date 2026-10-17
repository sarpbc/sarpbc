import type { PostView } from "../../../../domain/forum";

export interface PostResponse {
  post: PostView | null;
}
