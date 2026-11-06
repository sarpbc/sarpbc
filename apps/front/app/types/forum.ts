export interface Topic {
  id: string;
  title: string;
  description: string;
}

export interface ForumPostCreationStatus {
  canCreate: boolean;
  nextAvailableAt: string | null;
  cooldownHours: number;
}

export type CreateForumPostResult =
  | { ok: true; post: { publicId: number; slug: string } }
  | {
      ok: false;
      reason: "unauthorized" | "rate_limited" | "conflict" | "unknown";
      message?: string;
    };
