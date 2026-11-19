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
) => {
  try {
    const query: GetCommentsQuery = {
      page,
      targetId,
      targetType,
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

export const refetchLimitForLoadedPages = (loadedPages: number, pageSize: number) =>
  Math.min(loadedPages * pageSize, MAX_REFETCH_LIMIT);

export const createComment = async (data: {
  content: string;
  targetType: ReplyTargetType;
  targetId: string;
  replyToId?: string;
}) => {
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

      return {
        message: String(_exhaustive),
        ok: false,
        reason: "unknown",
      } satisfies CreateCommentResult;
    }
  }

  if (isNonEmptyString(data.replyToId)) {
    body.replyToId = data.replyToId;
  }

  try {
    const res = await apiFetch<{ reply: Reply }>("/replies", {
      body,
      method: "POST",
    });

    return { comment: res.reply, ok: true } satisfies CreateCommentResult;
  } catch (error) {
    return apiFailure(error, "creating comment", {
      codes: { [FORUM_ERROR_CODES.REPLY_RATE_LIMITED]: "rate_limited" },
    });
  }
};

export const hideComment = async (commentId: string) => {
  try {
    await apiFetch(`/replies/${commentId}/hide`, { body: {}, method: "PATCH" });

    return true;
  } catch (error) {
    console.error("Error hiding comment:", error);

    return false;
  }
};

export const deleteComment = async (commentId: string) => {
  try {
    await apiFetch(`/replies/${commentId}`, { method: "DELETE" });

    return true;
  } catch (error) {
    console.error("Error deleting comment:", error);

    return false;
  }
};

export const reportComment = async (commentId: string, reason: ReplyReportReason) => {
  try {
    await apiFetch(`/replies/${commentId}/report`, {
      body: { reason },
      method: "POST",
    });

    return { ok: true } satisfies ReportCommentResult;
  } catch (error) {
    return apiFailure(error, "reporting comment", {
      codes: { [FORUM_ERROR_CODES.REPLY_ALREADY_REPORTED]: "already_reported" },
    });
  }
};
