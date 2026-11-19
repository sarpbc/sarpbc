const COMMENT_HASH_PREFIX = "comment-";

export const commentAnchorId = (commentId: string) => `${COMMENT_HASH_PREFIX}${commentId}`;

export const parseCommentHash = (hash: string) => {
  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;

  if (!normalized.startsWith(COMMENT_HASH_PREFIX)) {
    return null;
  }

  const commentId = normalized.slice(COMMENT_HASH_PREFIX.length);

  return commentId.length > 0 ? commentId : null;
};

export const commentPermalinkHash = (commentId: string) => `#${commentAnchorId(commentId)}`;
