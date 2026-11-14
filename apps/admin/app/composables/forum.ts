import type { ForumPost, ForumPostListItem, PaginatedReplies, Reply } from "@sarpbc/types";
import { MAX_PAGE_SIZE } from "@sarpbc/utils";

export const getPosts = async (): Promise<ForumPostListItem[]> => {
  const res = await apiFetch<{ posts: ForumPostListItem[] }>("/posts", { method: "GET" });

  return res.posts;
};

export const getPostById = async (id: string): Promise<ForumPost> => {
  const res = await apiFetch<{ post: ForumPost }>(`/posts/${id}`, { method: "GET" });

  return res.post;
};

const getRepliesPage = async (postId: string, page: number): Promise<PaginatedReplies> =>
  await apiFetch<PaginatedReplies>("/replies", {
    method: "GET",
    query: { targetType: "forumPost", targetId: postId, page, limit: MAX_PAGE_SIZE },
  });

export const getPostReplies = async (postId: string): Promise<Reply[]> => {
  const first = await getRepliesPage(postId, 0);
  const remainingPages = Math.max(Math.ceil(first.total / MAX_PAGE_SIZE) - 1, 0);

  const rest = await Promise.all(
    Array.from(
      { length: remainingPages },
      async (_, index) => await getRepliesPage(postId, index + 1),
    ),
  );

  return [first, ...rest].flatMap(({ replies }) => replies);
};

export const deleteForumPost = async (postId: string): Promise<void> => {
  await apiFetch(`/posts/${postId}`, { method: "DELETE" });
};

export const deleteForumReply = async (replyId: string): Promise<void> => {
  await apiFetch(`/replies/${replyId}`, { method: "DELETE" });
};

export const hideForumReply = async (replyId: string): Promise<void> => {
  await apiFetch(`/replies/${replyId}/hide`, { method: "PATCH", body: {} });
};
