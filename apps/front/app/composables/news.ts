import type { NewsType } from "@sarpbc/types";
import type { NewsArticle, NewsWeek, PaginatedNewsArticles } from "~/types/news";

export const getNewsArticles = async (
  page = 0,
  limit = 10,
  locale?: string,
  type?: NewsType,
): Promise<PaginatedNewsArticles> =>
  await apiFetch<PaginatedNewsArticles>(`/news`, {
    method: "GET",
    query: { page, limit, locale, type },
  });

export const getNewsWeek = async (week: string, locale?: string): Promise<NewsWeek> =>
  await apiFetch<NewsWeek>(`/news/weeks/${week}`, {
    method: "GET",
    query: { locale },
  });

export const getNewsArticle = async (slug: string, locale?: string): Promise<NewsArticle | null> =>
  await apiFetch<NewsArticle>(`/news/${slug}`, {
    method: "GET",
    query: { locale },
  });
