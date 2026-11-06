import type { NewsType } from "@sarpbc/types";
import type { NewsArticle, NewsWeek, PaginatedNewsArticles } from "~/types/news";

export async function getNewsArticles(
  page = 0,
  limit = 10,
  locale?: string,
  type?: NewsType,
): Promise<PaginatedNewsArticles> {
  return apiFetch<PaginatedNewsArticles>(`/news`, {
    method: "GET",
    query: { page, limit, locale, type },
  });
}

export async function getNewsWeek(week: string, locale?: string): Promise<NewsWeek> {
  return apiFetch<NewsWeek>(`/news/weeks/${week}`, {
    method: "GET",
    query: { locale },
  });
}

export async function getNewsArticle(slug: string, locale?: string): Promise<NewsArticle | null> {
  return apiFetch<NewsArticle>(`/news/${slug}`, {
    method: "GET",
    query: { locale },
  });
}
