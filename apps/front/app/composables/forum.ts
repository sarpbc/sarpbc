import { FORUM_ERROR_CODES } from "@sarpbc/types";
import type {
  ForumPost,
  ForumPostCreationStatus,
  ForumPostListItem,
  ForumTopic,
  PostPreview,
} from "@sarpbc/types";
import { getApiErrorStatus } from "@sarpbc/utils";
import type { CreateForumPostResult } from "~/types/forum";

export const getRecentForumActivities = async () => {
  const res = await apiFetch<{ recentPosts: PostPreview[] }>(`/forum/preview`, {
    method: "GET",
  });

  return res.recentPosts;
};

export const getTopics = async () => {
  const res = await apiFetch<{ topics: ForumTopic[] }>(`/forum/topics`, {
    method: "GET",
  });

  return res.topics;
};

export const getPosts = async () => {
  const res = await apiFetch<{ posts: ForumPostListItem[] }>(`/posts`, {
    method: "GET",
  });

  return res.posts;
};

export const getPostById = async (id: string) => {
  try {
    const res = await apiFetch<{ post: ForumPost }>(`/posts/${id}`, {
      method: "GET",
    });

    return res.post;
  } catch (error) {
    if (getApiErrorStatus(error) === 404) {
      return null;
    }

    throw error;
  }
};

export const getForumPostCreationStatus = async () => {
  try {
    return await apiFetch<ForumPostCreationStatus>("/posts/creation-status", {
      method: "GET",
    });
  } catch (error) {
    console.error("Error fetching forum post creation status:", error);

    return null;
  }
};

export const createForumPost = async (data: {
  id: string;
  title: string;
  content: string;
  topicId: string;
}) => {
  try {
    const post = await apiFetch<{ publicId: number; slug: string }>("/posts", {
      body: data,
      method: "POST",
    });

    return { ok: true, post } satisfies CreateForumPostResult;
  } catch (error) {
    return apiFailure(error, "creating forum post", {
      codes: { [FORUM_ERROR_CODES.POST_RATE_LIMITED]: "rate_limited" },
      statuses: { 409: "conflict" },
    });
  }
};
