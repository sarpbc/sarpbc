import type { ModerationReply } from "@sarpbc/types";

export async function getModerationReplies(limit = 50): Promise<ModerationReply[]> {
  const res = await apiFetch<{ replies: ModerationReply[] }>("/moderation/replies", {
    method: "GET",
    query: { limit },
  });
  return res.replies ?? [];
}
