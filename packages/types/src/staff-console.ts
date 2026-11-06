import type { ReplyTargetType } from "./reply";

export interface TrackedStreamer {
  id: string;
  login: string;
  displayName: string | null;
  createdAt: string;
}

export interface PatToken {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreatedPatToken {
  id: string;
  name: string;
  createdAt: string;
  token: string;
}

export interface ModerationReply {
  id: string;
  content: string;
  createdAt: string;
  hiddenAt: string | null;
  author: { id: string; userName: string };
  targetType: ReplyTargetType;
  targetId: string;
  targetLabel: string;
  targetPath: string;
  reportCount: number;
}
