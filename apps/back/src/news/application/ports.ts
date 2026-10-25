import type { NewsArticleRecord, NewsSitemapRecord } from "./models";
import type { NewsType } from "@sarpbc/types";
export interface NewsQueries {
  findBySlug(slug: string): Promise<NewsArticleRecord | null>;
  findById(id: string): Promise<NewsArticleRecord | null>;
  listPublished(
    page: number,
    limit: number,
    type?: NewsType,
  ): Promise<[NewsArticleRecord[], number]>;
  listWeek(start: Date, end: Date, limit: number): Promise<NewsArticleRecord[]>;
  countPublished(): Promise<number>;
  sitemapChunk(offset: number, limit: number): Promise<[NewsSitemapRecord[], number]>;
  listAdmin(page: number, limit: number): Promise<[NewsArticleRecord[], number]>;
}
export interface NewsWriteScope {
  articles: NewsQueries & {
    save(article: NewsArticleRecord): Promise<void>;
    delete(article: NewsArticleRecord): Promise<void>;
  };
  users: { findById(id: string): Promise<{ id: string; userName: string } | null> };
  replies: { deleteAllForTarget(type: "newsArticle", id: string): Promise<void> };
}
export interface NewsTransaction {
  run<T>(work: (scope: NewsWriteScope) => Promise<T>): Promise<T>;
}
export interface NewsComments {
  countByTargetIds(type: "newsArticle", ids: string[]): Promise<Map<string, number>>;
}
export interface NewsIndexing {
  submitNewsSlugs(slugs: string[]): Promise<void>;
}
