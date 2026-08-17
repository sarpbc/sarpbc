import type { Post, PostShort } from "~/types/forum";
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

export async function getPostById(id: string): Promise<Post | null> {
  try {
    const res = await apiFetch<{ post: Post }>(`/posts/${id}`, {
      method: "GET",
    });
    return res.post || null;
  } catch (error) {
    console.error("Error fetching forum post:", error);
    return null;
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
