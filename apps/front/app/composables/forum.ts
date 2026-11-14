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

export async function getRecentForumActivities(): Promise<PostPreview[]> {
  const res = await apiFetch<{ recentPosts: PostPreview[] }>(`/forum/preview`, {
    method: "GET",
  });

  return res.recentPosts;
}

export async function getTopics(): Promise<ForumTopic[]> {
  const res = await apiFetch<{ topics: ForumTopic[] }>(`/forum/topics`, {
    method: "GET",
  });

  return res.topics;
}

export async function getPosts(): Promise<ForumPostListItem[]> {
  const res = await apiFetch<{ posts: ForumPostListItem[] }>(`/posts`, {
    method: "GET",
  });

  return res.posts;
}

export async function getPostById(id: string): Promise<ForumPost | null> {
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
