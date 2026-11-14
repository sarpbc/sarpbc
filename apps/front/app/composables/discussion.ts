import { isNonEmptyString } from "@sarpbc/utils";
import { FORUM_ERROR_CODES } from "@sarpbc/types";
import type { PaginatedReplies, Reply, ReplyReportReason, ReplyTargetType } from "@sarpbc/types";
import type { CreateCommentResult, ReportCommentResult } from "~/types/discussion";

const MAX_REFETCH_LIMIT = 100;

interface GetCommentsQuery {
  targetType: ReplyTargetType;
  targetId: string;
  page: number;
  limit?: number;
}

interface CreateReplyBody {
  content: string;
  postId?: string;
  newsArticleId?: string;
  matchId?: string;
  replyToId?: string;
}

export const getCommentsByTarget = async (
  targetType: ReplyTargetType,
  targetId: string,
  page = 0,
  limit?: number,
): Promise<PaginatedReplies> => {
  try {
    const query: GetCommentsQuery = {
      targetType,
      targetId,
      page,
    };

    if (limit !== undefined) {
      query.limit = limit;
    }

    return await apiFetch<PaginatedReplies>("/replies", {
      method: "GET",
      query,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
};

export const refetchLimitForLoadedPages = (loadedPages: number, pageSize: number): number =>
  Math.min(loadedPages * pageSize, MAX_REFETCH_LIMIT);

export const createComment = async (data: {
  content: string;
  targetType: ReplyTargetType;
  targetId: string;
  replyToId?: string;
}): Promise<CreateCommentResult> => {
  const body: CreateReplyBody = {
    content: data.content,
  };

  switch (data.targetType) {
    case "forumPost": {
      body.postId = data.targetId;
      break;
    }

    case "newsArticle": {
      body.newsArticleId = data.targetId;
      break;
    }

    case "match": {
      body.matchId = data.targetId;
      break;
    }

    default: {
      const _exhaustive: never = data.targetType;

      return { ok: false, reason: "unknown", message: String(_exhaustive) };
    }
  }

  if (isNonEmptyString(data.replyToId)) {
    body.replyToId = data.replyToId;
  }

  try {
    const res = await apiFetch<{ reply: Reply }>("/replies", {
      method: "POST",
      body,
    });

    return { ok: true, comment: res.reply };
  } catch (error) {
    return apiFailure(error, "creating comment", {
      codes: { [FORUM_ERROR_CODES.REPLY_RATE_LIMITED]: "rate_limited" },
    });
  }
};

export const hideComment = async (commentId: string): Promise<boolean> => {
  try {
    await apiFetch(`/replies/${commentId}/hide`, { method: "PATCH", body: {} });

    return true;
  } catch (error) {
    console.error("Error hiding comment:", error);

    return false;
  }
};

export const deleteComment = async (commentId: string): Promise<boolean> => {
  try {
    await apiFetch(`/replies/${commentId}`, { method: "DELETE" });

    return true;
  } catch (error) {
    console.error("Error deleting comment:", error);

    return false;
  }
};

export const reportComment = async (
  commentId: string,
  reason: ReplyReportReason,
): Promise<ReportCommentResult> => {
  try {
    await apiFetch(`/replies/${commentId}/report`, {
      method: "POST",
      body: { reason },
    });

    return { ok: true };
  } catch (error) {
    return apiFailure(error, "reporting comment", {
      codes: { [FORUM_ERROR_CODES.REPLY_ALREADY_REPORTED]: "already_reported" },
    });
  }
};
