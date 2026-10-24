import type { ForumPost } from "@sarpbc/types";
import type { PostShort, Reply } from "~/types/forum";
import { apiFetch } from "~/utils/apiFetch";

export async function getPosts(): Promise<PostShort[]> {
  try {
    const res = await apiFetch<{ posts: PostShort[] }>("/posts", {
      method: "GET",
    });
    return res.posts || [];
  } catch (error) {
    console.error("Error fetching forum posts:", error);
    return [];
  }
}

const REPLIES_PAGE_SIZE = 100;

export async function getPostById(id: string): Promise<ForumPost | null> {
  try {
    const res = await apiFetch<{ post: ForumPost }>(`/posts/${id}`, {
      method: "GET",
    });
    return res.post || null;
  } catch (error) {
    console.error("Error fetching forum post:", error);
    return null;
  }
}

export async function getPostReplies(postId: string): Promise<Reply[]> {
  const replies: Reply[] = [];
  for (let page = 0; ; page++) {
    const res = await apiFetch<{ replies: Reply[]; total: number }>("/replies", {
      method: "GET",
      query: { targetType: "forumPost", targetId: postId, page, limit: REPLIES_PAGE_SIZE },
    });
    replies.push(...res.replies);
    if (res.replies.length === 0 || (page + 1) * REPLIES_PAGE_SIZE >= res.total) {
      return replies;
    }
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

export async function hideForumReply(replyId: string): Promise<boolean> {
  try {
    await apiFetch(`/replies/${replyId}/hide`, {
      method: "PATCH",
      body: {},
    });
    return true;
  } catch (error) {
    console.error("Error hiding forum reply:", error);
    return false;
  }
}
