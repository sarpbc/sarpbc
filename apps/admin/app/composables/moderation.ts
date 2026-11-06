import type { ModerationReply } from "@sarpbc/types";
import { apiFetch } from "~/utils/apiFetch";

export async function getModerationReplies(limit = 50): Promise<ModerationReply[]> {
  const res = await apiFetch<{ replies: ModerationReply[] }>("/moderation/replies", {
    method: "GET",
    query: { limit },
  });
  return res.replies ?? [];
}
