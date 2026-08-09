export const COMMENT_HASH_PREFIX = "comment-";

export function commentAnchorId(commentId: string): string {
  return `${COMMENT_HASH_PREFIX}${commentId}`;
}

export function parseCommentHash(hash: string): string | null {
  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalized.startsWith(COMMENT_HASH_PREFIX)) {
    return null;
  }
  const commentId = normalized.slice(COMMENT_HASH_PREFIX.length);
  return commentId.length > 0 ? commentId : null;
}

export function commentPermalinkHash(commentId: string): string {
  return `#${commentAnchorId(commentId)}`;
}
