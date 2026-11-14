import type { ModerationReply } from "@sarpbc/types";

export const MODERATION_REPLIES_LIMIT = 50;

export const getModerationReplies = async (): Promise<ModerationReply[]> => {
  const res = await apiFetch<{ replies: ModerationReply[] }>("/moderation/replies", {
    method: "GET",
    query: { limit: MODERATION_REPLIES_LIMIT },
  });

  return res.replies;
};
