export const REPLY_TARGET_TYPES = ["forumPost", "newsArticle", "match"] as const;

export type ReplyTargetType = (typeof REPLY_TARGET_TYPES)[number];
