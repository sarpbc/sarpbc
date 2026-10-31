import type { NewsType } from "@sarpbc/types";
import { apiFetch } from "~/utils/apiFetch";

export type NewsArticleListItem = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  imageUrl: string | null;
  type: NewsType;
  /** Plain-text teaser from list endpoints; omitted on full article payloads. */
  excerpt?: string;
  commentCount?: number;
};

export type NewsArticle = NewsArticleListItem & {
  author: string;
  content: string;
  isDraft: boolean;
};

export type PaginatedNewsArticles = {
  data: NewsArticleListItem[];
  total: number;
  page: number;
  limit: number;
};

export type NewsWeek = {
  week: string;
  start: string;
  end: string;
  items: NewsArticle[];
};

export async function createNewsArticle(body: {
  title: string;
  content: string;
  slug?: string;
  imageUrl?: string;
  type?: NewsType;
}): Promise<NewsArticle | null> {
  try {
    return await apiFetch<NewsArticle>(`/news`, {
      method: "POST",
      body,
    });
  } catch (error) {
    console.error("Error creating news article:", error);
    return null;
  }
}

export async function getNewsArticles(
  page = 0,
  limit = 10,
  locale?: string,
  type?: NewsType,
): Promise<PaginatedNewsArticles> {
  return apiFetch<PaginatedNewsArticles>(`/news`, {
    method: "GET",
    query: type ? { page, limit, locale, type } : { page, limit, locale },
  });
}

export async function getNewsWeek(week: string, locale?: string): Promise<NewsWeek | null> {
  try {
    return await apiFetch<NewsWeek>(`/news/weeks/${week}`, {
      method: "GET",
      query: { locale },
    });
  } catch (error) {
    console.error("Error fetching news week:", error);
    return null;
  }
}

export async function getNewsArticlesAdmin(page = 0, limit = 10): Promise<PaginatedNewsArticles> {
  try {
    const res = await apiFetch<PaginatedNewsArticles>(`/news/admin`, {
      method: "GET",
      query: { page, limit },
    });

    return res;
  } catch (error) {
    console.error("Error fetching all news articles (admin):", error);
    return { data: [], total: 0, page, limit };
  }
}

export async function getNewsArticle(slug: string, locale?: string): Promise<NewsArticle | null> {
  return apiFetch<NewsArticle>(`/news/${slug}`, {
    method: "GET",
    query: { locale },
  });
}

export async function getNewsArticleAdmin(slug: string): Promise<NewsArticle | null> {
  try {
    const res = await apiFetch<NewsArticle>(`/news/admin/${slug}`, {
      method: "GET",
    });

    return res;
  } catch (error) {
    console.error("Error fetching news article:", error);
    return null;
  }
}

export async function editNewsArticle(
  slug: string,
  body: {
    title: string;
    content: string;
    slug?: string;
    type?: NewsType;
  },
): Promise<NewsArticle | null> {
  try {
    return await apiFetch<NewsArticle>(`/news/${slug}`, {
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
