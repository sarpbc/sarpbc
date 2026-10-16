import type { NewsType } from "@sarpbc/types";
export interface NewsArticleRecord {
  id: string;
  slug: string;
  title: string;
  content: string;
  titleFr: string | null;
  contentFr: string | null;
  author: { id: string; userName: string };
  createdAt: Date;
  updatedAt: Date | null;
  isDraft: boolean;
  imageUrl: string | null;
  type: NewsType;
}
export interface CreateNewsArticleInput {
  title: string;
  content: string;
  titleFr?: string | null;
  contentFr?: string | null;
  imageUrl?: string;
  slug?: string;
  type?: NewsType;
}
export type UpdateNewsArticleInput = Omit<Partial<CreateNewsArticleInput>, "imageUrl"> & {
  imageUrl?: string | null;
};
export type NewsSitemapRecord = Pick<NewsArticleRecord, "id" | "slug" | "createdAt" | "updatedAt">;
