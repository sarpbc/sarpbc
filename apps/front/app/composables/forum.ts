import { FORUM_ERROR_CODES, type ForumPost } from "@sarpbc/types";
import { getApiErrorStatus } from "@sarpbc/utils";
import type {
  CreateForumPostResult,
  ForumPostCreationStatus,
  PostPreview,
  PostShort,
  Topic,
} from "~/types/forum";

export async function getRecentForumActivities(): Promise<PostPreview[]> {
  try {
    const res = await apiFetch<{ recentPosts: PostPreview[] }>(`/forum/preview`, {
      method: "GET",
    });

    return res.recentPosts || [];
  } catch (error) {
    console.error("Error fetching recent forum activities:", error);
    return [];
  }
}

export async function getTopics(): Promise<Topic[]> {
  try {
    const res = await apiFetch<{ topics: Topic[] }>(`/forum/topics`, {
      method: "GET",
    });

    return res.topics || [];
  } catch (error) {
    console.error("Error fetching forum topics:", error);
    return [];
  }
}

export async function getPosts(): Promise<PostShort[]> {
  const res = await apiFetch<{ posts: PostShort[] }>(`/posts`, {
    method: "GET",
  });

  return res.posts || [];
}

export async function getPostById(id: string): Promise<ForumPost | null> {
  try {
    const res = await apiFetch<{ post: ForumPost }>(`/posts/${id}`, {
      method: "GET",
    });

    return res.post || null;
  } catch (error) {
    if (getApiErrorStatus(error) === 404) {
      return null;
    }
    throw error;
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
    const post = await apiFetch<{ publicId: number; slug: string }>("/posts", {
      method: "POST",
      body: data,
    });

    return { ok: true, post };
  } catch (error) {
    return apiFailure(error, "creating forum post", {
      codes: { [FORUM_ERROR_CODES.POST_RATE_LIMITED]: "rate_limited" },
      statuses: { 409: "conflict" },
    });
  }
}
