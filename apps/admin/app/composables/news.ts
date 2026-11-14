import type { NewsArticleAdmin, NewsType, PaginatedNewsArticles } from "@sarpbc/types";

export async function createNewsArticle(body: {
  title: string;
  content: string;
  slug?: string;
  imageUrl?: string;
  titleFr?: string | null;
  contentFr?: string | null;
  type?: NewsType;
}): Promise<NewsArticleAdmin> {
  return await apiFetch<NewsArticleAdmin>("/news", { method: "POST", body });
}

export async function getNewsArticlesAdmin(range: {
  limit: number;
  offset: number;
}): Promise<PaginatedNewsArticles> {
  return await apiFetch<PaginatedNewsArticles>("/news/admin", {
    method: "GET",
    query: { page: Math.floor(range.offset / range.limit), limit: range.limit },
  });
}

export async function getNewsArticleAdmin(slug: string): Promise<NewsArticleAdmin> {
  return await apiFetch<NewsArticleAdmin>(`/news/admin/${slug}`, { method: "GET" });
}

export async function editNewsArticle(
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
): Promise<NewsArticleAdmin> {
  return await apiFetch<NewsArticleAdmin>(`/news/${slug}`, { method: "PATCH", body });
}

export async function publishNewsArticle(slug: string): Promise<void> {
  await apiFetch(`/news/${slug}/publish`, { method: "PATCH", body: {} });
}

export async function unpublishNewsArticle(slug: string): Promise<void> {
  await apiFetch(`/news/${slug}/unpublish`, { method: "PATCH", body: {} });
}

export async function deleteNewsArticle(slug: string): Promise<void> {
  await apiFetch(`/news/${slug}`, { method: "DELETE" });
}
