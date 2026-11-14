export const COMMENT_HASH_PREFIX = "comment-";

export const commentAnchorId = (commentId: string): string => `${COMMENT_HASH_PREFIX}${commentId}`;

export const parseCommentHash = (hash: string): string | null => {
  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;

  if (!normalized.startsWith(COMMENT_HASH_PREFIX)) {
    return null;
  }

  const commentId = normalized.slice(COMMENT_HASH_PREFIX.length);

  return commentId.length > 0 ? commentId : null;
};

export const commentPermalinkHash = (commentId: string): string => `#${commentAnchorId(commentId)}`;
