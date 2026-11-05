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

export async function getNewsArticle(slug: string, locale?: string): Promise<NewsArticle | null> {
  return apiFetch<NewsArticle>(`/news/${slug}`, {
    method: "GET",
    query: { locale },
  });
}
