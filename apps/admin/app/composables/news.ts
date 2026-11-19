import type { NewsArticleAdmin, NewsType, PaginatedNewsArticles } from "@sarpbc/types";

export const createNewsArticle = async (body: {
  title: string;
  content: string;
  slug?: string;
  imageUrl?: string;
  titleFr?: string | null;
  contentFr?: string | null;
  type?: NewsType;
}) => await apiFetch<NewsArticleAdmin>("/news", { body, method: "POST" });

export const getNewsArticlesAdmin = async (range: { limit: number; offset: number }) =>
  await apiFetch<PaginatedNewsArticles>("/news/admin", {
    method: "GET",
    query: { limit: range.limit, page: Math.floor(range.offset / range.limit) },
  });

export const getNewsArticleAdmin = async (slug: string) =>
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
) => await apiFetch<NewsArticleAdmin>(`/news/${slug}`, { body, method: "PATCH" });

export const publishNewsArticle = async (slug: string) => {
  await apiFetch(`/news/${slug}/publish`, { body: {}, method: "PATCH" });
};

export const unpublishNewsArticle = async (slug: string) => {
  await apiFetch(`/news/${slug}/unpublish`, { body: {}, method: "PATCH" });
};

export const deleteNewsArticle = async (slug: string) => {
  await apiFetch(`/news/${slug}`, { method: "DELETE" });
};
