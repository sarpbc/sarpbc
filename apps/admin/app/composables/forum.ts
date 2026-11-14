import type { ForumPost, ForumPostListItem, PaginatedReplies, Reply } from "@sarpbc/types";
import { MAX_PAGE_SIZE } from "@sarpbc/utils";

export async function getPosts(): Promise<ForumPostListItem[]> {
  const res = await apiFetch<{ posts: ForumPostListItem[] }>("/posts", { method: "GET" });

  return res.posts;
}

export async function getPostById(id: string): Promise<ForumPost> {
  const res = await apiFetch<{ post: ForumPost }>(`/posts/${id}`, { method: "GET" });

  return res.post;
}

export async function getPostReplies(postId: string): Promise<Reply[]> {
  const replies: Reply[] = [];

  for (let page = 0; ; page++) {
    const res = await apiFetch<PaginatedReplies>("/replies", {
      method: "GET",
      query: { targetType: "forumPost", targetId: postId, page, limit: MAX_PAGE_SIZE },
    });

    replies.push(...res.replies);

    if (res.replies.length === 0 || (page + 1) * MAX_PAGE_SIZE >= res.total) {
      return replies;
    }
  }
}

export async function deleteForumPost(postId: string): Promise<void> {
  await apiFetch(`/posts/${postId}`, { method: "DELETE" });
}

export async function deleteForumReply(replyId: string): Promise<void> {
  await apiFetch(`/replies/${replyId}`, { method: "DELETE" });
}

export async function hideForumReply(replyId: string): Promise<void> {
  await apiFetch(`/replies/${replyId}/hide`, { method: "PATCH", body: {} });
}
