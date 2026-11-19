import type { NewsType } from "@sarpbc/types";
import type { NewsArticle, NewsWeek, PaginatedNewsArticles } from "~/types/news";

export const getNewsArticles = async (page = 0, limit = 10, locale?: string, type?: NewsType) =>
  await apiFetch<PaginatedNewsArticles>(`/news`, {
    method: "GET",
    query: { limit, locale, page, type },
  });

export const getNewsWeek = async (week: string, locale?: string) =>
  await apiFetch<NewsWeek>(`/news/weeks/${week}`, {
    method: "GET",
    query: { locale },
  });

export const getNewsArticle = async (slug: string, locale?: string) =>
  await apiFetch<NewsArticle>(`/news/${slug}`, {
    method: "GET",
    query: { locale },
  });
