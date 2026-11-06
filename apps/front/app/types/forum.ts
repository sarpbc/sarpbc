export type CreateForumPostResult =
  | { ok: true; post: { publicId: number; slug: string } }
  | {
      ok: false;
      reason: "unauthorized" | "rate_limited" | "conflict" | "unknown";
      message?: string;
    };
