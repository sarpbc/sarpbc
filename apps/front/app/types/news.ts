import type { NewsType } from "@sarpbc/types";

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
