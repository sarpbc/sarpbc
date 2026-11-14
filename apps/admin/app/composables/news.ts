import type { NewsArticleAdmin, NewsType, PaginatedNewsArticles } from "@sarpbc/types";

export const createNewsArticle = async (body: {
  title: string;
  content: string;
  slug?: string;
  imageUrl?: string;
  titleFr?: string | null;
  contentFr?: string | null;
  type?: NewsType;
}): Promise<NewsArticleAdmin> =>
  await apiFetch<NewsArticleAdmin>("/news", { method: "POST", body });

export const getNewsArticlesAdmin = async (range: {
  limit: number;
  offset: number;
}): Promise<PaginatedNewsArticles> =>
  await apiFetch<PaginatedNewsArticles>("/news/admin", {
    method: "GET",
    query: { page: Math.floor(range.offset / range.limit), limit: range.limit },
  });

export const getNewsArticleAdmin = async (slug: string): Promise<NewsArticleAdmin> =>
  await apiFetch<NewsArticleAdmin>(`/news/admin/${slug}`, { method: "GET" });

export const editNewsArticle = async (
  slug: string,
  body: {
    title?: string;
    content?: string;
    slug?: string;
    imageUrl?: string | null;
    titleFr?: string | null;
    contentFr?: string | null;
    type?: NewsType;
  },
): Promise<NewsArticleAdmin> =>
  await apiFetch<NewsArticleAdmin>(`/news/${slug}`, { method: "PATCH", body });

export const publishNewsArticle = async (slug: string): Promise<void> => {
  await apiFetch(`/news/${slug}/publish`, { method: "PATCH", body: {} });
};

export const unpublishNewsArticle = async (slug: string): Promise<void> => {
  await apiFetch(`/news/${slug}/unpublish`, { method: "PATCH", body: {} });
};

export const deleteNewsArticle = async (slug: string): Promise<void> => {
  await apiFetch(`/news/${slug}`, { method: "DELETE" });
};
