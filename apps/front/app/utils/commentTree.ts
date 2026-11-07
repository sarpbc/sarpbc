import type { Reply } from "@sarpbc/types";

export function findCommentInTree(comments: Reply[], commentId: string): boolean {
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
