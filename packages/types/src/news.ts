export type NewsType = "short" | "article";

export interface NewsArticleAdmin {
  id: string;
  author: string;
  title: string;
  slug: string;
  content: string;
  createdAt: string;
  isDraft: boolean;
  imageUrl: string | null;
  type: NewsType;
  titleFr: string | null;
  contentFr: string | null;
  hasFrench: boolean;
}

export interface PaginatedNewsArticles {
  data: NewsArticleAdmin[];
  total: number;
  page: number;
  limit: number;
}
