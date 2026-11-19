import type { NewsType } from "@sarpbc/types";
import type { NewsArticleRecord } from "./models";
import type { NewsTransaction, NewsWriteScope } from "./ports";

type NewsArticleStore = NewsWriteScope["articles"];

export class MemoryNewsStore implements NewsArticleStore {
  commits = 0;
  commitFailure: Error | null = null;
  readonly articles: NewsArticleRecord[];

  readonly scope: NewsWriteScope = {
    articles: this,
    replies: {
      deleteAllForTarget: async () => {
        await Promise.resolve();
      },
    },
    users: { findById: async () => await Promise.resolve(null) },
  };

  readonly transaction: NewsTransaction = {
    run: async (work) => {
      const result = await work(this.scope);

      if (this.commitFailure) {
        throw this.commitFailure;
      }

      this.commits += 1;

      return result;
    },
  };

  constructor(articles: NewsArticleRecord[] = []) {
    this.articles = [...articles];
  }

  async findBySlug(slug: string) {
    return await Promise.resolve(this.articles.find((article) => article.slug === slug) ?? null);
  }

  async findById(id: string) {
    return await Promise.resolve(this.articles.find((article) => article.id === id) ?? null);
  }

  async listPublished(page: number, limit: number, type?: NewsType) {
    const published = this.articles
      .filter((article) => !article.isDraft && (type === undefined || article.type === type))
      .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return await Promise.resolve<[NewsArticleRecord[], number]>([
      published.slice(page * limit, (page + 1) * limit),
      published.length,
    ]);
  }

  async listWeek(start: Date, end: Date, limit: number) {
    return await Promise.resolve(
      this.articles
        .filter(
          (article) =>
            !article.isDraft &&
            article.type === "short" &&
            article.createdAt >= start &&
            article.createdAt < end,
        )
        .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit),
    );
  }

  async listAdmin(page: number, limit: number) {
    const sorted = this.articles.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return await Promise.resolve<[NewsArticleRecord[], number]>([
      sorted.slice(page * limit, (page + 1) * limit),
      sorted.length,
    ]);
  }

  async save(article: NewsArticleRecord) {
    if (!this.articles.includes(article)) {
      this.articles.push(article);
    }

    await Promise.resolve();
  }

  async delete(article: NewsArticleRecord) {
    this.articles.splice(this.articles.indexOf(article), 1);

    await Promise.resolve();
  }
}
