import type { NewsArticleAdmin, NewsType, PaginatedNewsArticles } from "@sarpbc/types";

export async function createNewsArticle(body: {
  title: string;
  content: string;
  slug?: string;
  imageUrl?: string;
  titleFr?: string | null;
  contentFr?: string | null;
  type?: NewsType;
}): Promise<NewsArticleAdmin | null> {
  try {
    return await apiFetch<NewsArticleAdmin>("/news", {
      method: "POST",
      body,
    });
  } catch (error) {
    console.error("Error creating news article:", error);
    return null;
  }
}

export async function getNewsArticlesAdmin(page = 0, limit = 10): Promise<PaginatedNewsArticles> {
  try {
    return await apiFetch<PaginatedNewsArticles>("/news/admin", {
      method: "GET",
      query: { page, limit },
    });
  } catch (error) {
    console.error("Error fetching all news articles (admin):", error);
    return { data: [], total: 0, page, limit };
  }
}

export async function getNewsArticleAdmin(slug: string): Promise<NewsArticleAdmin | null> {
  try {
    return await apiFetch<NewsArticleAdmin>(`/news/admin/${slug}`, {
      method: "GET",
    });
  } catch (error) {
    console.error("Error fetching news article:", error);
    return null;
  }
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
): Promise<NewsArticleAdmin | null> {
  try {
    return await apiFetch<NewsArticleAdmin>(`/news/${slug}`, {
      method: "PATCH",
      body,
    });
  } catch (error) {
    console.error("Error editing news article:", error);
    return null;
  }
}

export async function publishNewsArticle(slug: string): Promise<boolean> {
  try {
    await apiFetch(`/news/${slug}/publish`, {
      method: "PATCH",
      body: {},
    });
    return true;
  } catch (error) {
    console.error("Error publishing news article:", error);
    return false;
  }
}

export async function unpublishNewsArticle(slug: string): Promise<boolean> {
  try {
    await apiFetch(`/news/${slug}/unpublish`, {
      method: "PATCH",
      body: {},
    });
    return true;
  } catch (error) {
    console.error("Error unpublishing news article:", error);
    return false;
  }
}

export async function deleteNewsArticle(slug: string): Promise<boolean> {
  try {
    await apiFetch(`/news/${slug}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Error deleting news article:", error);
    return false;
  }
}

export async function getRecentNewsArticles(limit: number): Promise<NewsArticleAdmin[]> {
  const res = await apiFetch<PaginatedNewsArticles>("/news/admin", {
    method: "GET",
    query: { page: 0, limit },
  });
  return res.data;
}
