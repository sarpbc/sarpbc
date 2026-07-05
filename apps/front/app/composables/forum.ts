import type {
  CreateForumPostResult,
  CreateForumReplyResult,
  ForumPostCreationStatus,
  Post,
  PostPreview,
  PostShort,
  Topic,
} from "~/types/forum";
import { apiFetch } from "~/utils/apiFetch";
import {
  FORUM_ERROR_CODES,
  getApiErrorCode,
  getApiErrorMessage,
  getApiErrorStatus,
} from "~/utils/apiError";

export async function getRecentForumActivities(): Promise<PostPreview[]> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ recentPosts: PostPreview[] }>(
      `${config.public.apiBase}/forum/preview`,
      {
        method: "GET",
        credentials: "include",
      },
    );

    return res.recentPosts || [];
  } catch (error) {
    console.error("Error fetching recent forum activities:", error);
    return [];
  }
}

export async function getTopics(): Promise<Topic[]> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ topics: Topic[] }>(`${config.public.apiBase}/forum/topics`, {
      method: "GET",
      credentials: "include",
    });

    return res.topics || [];
  } catch (error) {
    console.error("Error fetching forum topics:", error);
    return [];
  }
}

export async function getPosts(): Promise<PostShort[]> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ posts: PostShort[] }>(`${config.public.apiBase}/posts`, {
      method: "GET",
      credentials: "include",
    });

    return res.posts || [];
  } catch (error) {
    console.error("Error fetching forum posts:", error);
    return [];
  }
}

export async function getPostById(id: string): Promise<Post | null> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ post: Post }>(`${config.public.apiBase}/posts/${id}`, {
      method: "GET",
      credentials: "include",
    });

    return res.post || null;
  } catch (error) {
    console.error("Error fetching forum post:", error);
    return null;
  }
}

export async function getForumPostCreationStatus(): Promise<ForumPostCreationStatus | null> {
  try {
    return await apiFetch<ForumPostCreationStatus>("/posts/creation-status", {
      method: "GET",
    });
  } catch (error) {
    console.error("Error fetching forum post creation status:", error);
    return null;
  }
}

export async function createForumPost(data: {
  id: string;
  title: string;
  content: string;
  topicId: string;
}): Promise<CreateForumPostResult> {
  try {
    await apiFetch("/posts", {
      method: "POST",
      body: data,
    });

    return { ok: true };
  } catch (error) {
    const status = getApiErrorStatus(error);
    const message = getApiErrorMessage(error);
    const code = getApiErrorCode(error);

    if (status === 401) {
      return { ok: false, reason: "unauthorized", message };
    }
    if (code === FORUM_ERROR_CODES.POST_RATE_LIMITED) {
      return { ok: false, reason: "rate_limited", message };
    }
    if (status === 409) {
      return { ok: false, reason: "conflict", message };
    }

    console.error("Error creating forum post:", error);
    return { ok: false, reason: "unknown", message };
  }
}

export async function createForumReply(data: {
  content: string;
  postId: string;
  replyToId?: string;
}): Promise<CreateForumReplyResult> {
  try {
    await apiFetch("/replies", {
      method: "POST",
      body: data,
    });

    return { ok: true };
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

    console.error("Error creating forum reply:", error);
    return { ok: false, reason: "unknown", message };
  }
}

export async function deleteForumPost(postId: string): Promise<boolean> {
  try {
    await apiFetch(`/posts/${postId}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Error deleting forum post:", error);
    return false;
  }
}

export async function deleteForumReply(replyId: string): Promise<boolean> {
  try {
    await apiFetch(`/replies/${replyId}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Error deleting forum reply:", error);
    return false;
  }
}
