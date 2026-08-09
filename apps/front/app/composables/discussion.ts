import type {
  Comment,
  CommentTargetType,
  CreateCommentResult,
  PaginatedComments,
  ReplyReportReason,
  ReportCommentResult,
} from "~/types/discussion";
import { apiFetch } from "~/utils/apiFetch";
import {
  FORUM_ERROR_CODES,
  getApiErrorCode,
  getApiErrorMessage,
  getApiErrorStatus,
} from "~/utils/apiError";

const MAX_REFETCH_LIMIT = 100;

export async function getCommentsByTarget(
  targetType: CommentTargetType,
  targetId: string,
  page = 0,
  limit?: number,
): Promise<PaginatedComments> {
  try {
    return await apiFetch<PaginatedComments>("/replies", {
      method: "GET",
      query: {
        targetType,
        targetId,
        page,
        ...(limit !== undefined ? { limit } : {}),
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
}

export function refetchLimitForLoadedPages(loadedPages: number, pageSize: number): number {
  return Math.min(loadedPages * pageSize, MAX_REFETCH_LIMIT);
}

export async function createComment(data: {
  content: string;
  targetType: CommentTargetType;
  targetId: string;
  replyToId?: string;
}): Promise<CreateCommentResult> {
  const body: Record<string, string> = {
    content: data.content,
  };

  switch (data.targetType) {
    case "forumPost":
      body.postId = data.targetId;
      break;
    case "newsArticle":
      body.newsArticleId = data.targetId;
      break;
    case "match":
      body.matchId = data.targetId;
      break;
    default: {
      const _exhaustive: never = data.targetType;
      return { ok: false, reason: "unknown", message: String(_exhaustive) };
    }
  }

  if (data.replyToId) {
    body.replyToId = data.replyToId;
  }

  try {
    const res = await apiFetch<{ reply: Comment }>("/replies", {
      method: "POST",
      body,
    });
    return { ok: true, comment: res.reply };
  } catch (error) {
    const status = getApiErrorStatus(error);
    const message = getApiErrorMessage(error);
    const code = getApiErrorCode(error);

    if (status === 401) {
      return { ok: false, reason: "unauthorized", message };
    }
    if (code === FORUM_ERROR_CODES.REPLY_RATE_LIMITED) {
      return { ok: false, reason: "rate_limited", message };
    }

    console.error("Error creating comment:", error);
    return { ok: false, reason: "unknown", message };
  }
}

export async function hideComment(commentId: string): Promise<boolean> {
  try {
    await apiFetch(`/replies/${commentId}/hide`, { method: "PATCH" });
    return true;
  } catch (error) {
    console.error("Error hiding comment:", error);
    return false;
  }
}

export async function deleteComment(commentId: string): Promise<boolean> {
  try {
    await apiFetch(`/replies/${commentId}`, { method: "DELETE" });
    return true;
  } catch (error) {
    console.error("Error deleting comment:", error);
    return false;
  }
}

export async function reportComment(
  commentId: string,
  reason: ReplyReportReason,
): Promise<ReportCommentResult> {
  try {
    await apiFetch(`/replies/${commentId}/report`, {
      method: "POST",
      body: { reason },
    });
    return { ok: true };
  } catch (error) {
    const status = getApiErrorStatus(error);
    const message = getApiErrorMessage(error);
    const code = getApiErrorCode(error);

    if (status === 401) {
      return { ok: false, reason: "unauthorized", message };
    }
    if (code === FORUM_ERROR_CODES.REPLY_ALREADY_REPORTED) {
      return { ok: false, reason: "already_reported", message };
    }

    console.error("Error reporting comment:", error);
    return { ok: false, reason: "unknown", message };
  }
}
