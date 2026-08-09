import type { Comment } from "~/types/discussion";

export function findCommentInTree(comments: Comment[], commentId: string): boolean {
  for (const comment of comments) {
    if (comment.id === commentId) {
      return true;
    }
    if (comment.replies?.length && findCommentInTree(comment.replies, commentId)) {
      return true;
    }
  }
  return false;
}
