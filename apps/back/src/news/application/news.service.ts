import { InvalidInputError, NotFoundError, ConflictError } from "../../common/domain/errors";
import { sanitizeNewsHtml, sanitizePlainText } from "../../common/domain/html";
import { excerptFromContent } from "../domain/news-content.util";
import {
  hasFrenchTranslation,
  localizedNewsFields,
  type NewsLocale,
} from "../domain/news-locale.util";
import type { NewsArticleRecord, CreateNewsArticleInput, UpdateNewsArticleInput } from "./models";
import type { NewsQueries, NewsTransaction, NewsComments, NewsIndexing } from "./ports";
import slugify from "slugify";
import type { NewsType } from "@sarpbc/types";
import { isoWeekUtcRange } from "@sarpbc/utils";
/** Google News and sitemap-file caps; archive chunks stay at this size from day one. */
export const NEWS_SITEMAP_CHUNK_SIZE = 1000;
export const NEWS_WEEK_SHORTS_LIMIT = 100;

export interface NewsSitemapEntry {
  slug: string;
  lastmod: string;
}

export interface NewsSitemapMetaResponse {
  total: number;
  chunkSize: number;
  chunkCount: number;
}

export interface NewsSitemapChunkResponse extends NewsSitemapMetaResponse {
  chunk: number;
  data: NewsSitemapEntry[];
}

export function newsSitemapChunkCount(total: number): number {
  return Math.max(1, Math.ceil(Math.max(total, 0) / NEWS_SITEMAP_CHUNK_SIZE));
}

export interface NewsArticleListItemResponse {
  id: string;
  title: string;
  slug: string;
  createdAt: Date;
  imageUrl: string | null;
  excerpt: string;
  commentCount: number;
  type: NewsType;
}

export interface NewsArticleResponse {
  id: string;
  author: string;
  title: string;
  slug: string;
  content: string;
  createdAt: Date;
  isDraft: boolean;
  imageUrl: string | null;
  type: NewsType;
}

export interface NewsArticleAdminResponse extends NewsArticleResponse {
  titleFr: string | null;
  contentFr: string | null;
  hasFrench: boolean;
}

export interface NewsWeekResponse {
  week: string;
  start: Date;
  end: Date;
  items: NewsArticleResponse[];
}

export class NewsService {
  constructor(
    private readonly newsRepository: NewsQueries,
    private readonly transaction: NewsTransaction,
    private readonly replyService: NewsComments,
    private readonly indexing: NewsIndexing,
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  private mapListArticle(
    article: NewsArticleRecord,
    locale: NewsLocale,
    commentCount = 0,
  ): NewsArticleListItemResponse {
    const { title, content } = localizedNewsFields(article, locale);
    return {
      id: article.id,
      title,
      slug: article.slug,
      createdAt: article.createdAt,
      imageUrl: article.imageUrl,
      excerpt: excerptFromContent(content),
      commentCount,
      type: article.type,
    };
  }

  private mapArticle(article: NewsArticleRecord, locale: NewsLocale): NewsArticleResponse {
    const { title, content } = localizedNewsFields(article, locale);
    return {
      id: article.id,
      author: article.author.userName,
      title,
      slug: article.slug,
      content,
      createdAt: article.createdAt,
      isDraft: article.isDraft,
      imageUrl: article.imageUrl,
      type: article.type,
    };
  }

  private mapAdminArticle(article: NewsArticleRecord): NewsArticleAdminResponse {
    return {
      ...this.mapArticle(article, "en-US"),
      titleFr: article.titleFr,
      contentFr: article.contentFr,
      hasFrench: hasFrenchTranslation(article),
    };
  }

  private normalizeSlug(value: string): string {
    return slugify(value, { lower: true, strict: true });
  }

  private async generateUniqueSlug(source: string, articles: NewsQueries): Promise<string> {
    const base = this.normalizeSlug(source);
    if (!base) {
      throw new ConflictError(
        "Could not generate a URL slug from that title. Add a slug manually (letters, numbers, hyphens).",
      );
    }
    let slug = base;
    let suffix = 1;
    while (await articles.findBySlug(slug)) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }

  private async assertSlugAvailable(
    articles: NewsQueries,
    slug: string,
    excludeArticleId?: string,
  ): Promise<void> {
    const existing = await articles.findBySlug(slug);
    if (existing && existing.id !== excludeArticleId) {
      throw new ConflictError(
        `An article with the slug "${slug}" already exists. Choose a different slug.`,
      );
    }
  }

  async create(dto: CreateNewsArticleInput, userId: string): Promise<NewsArticleAdminResponse> {
    return this.transaction.run(async (scope) => {
      const author = await scope.users.findById(userId);
      if (!author) {
        throw new NotFoundError(`User with id "${userId}" not found`);
      }

      let slug: string;
      if (dto.slug) {
        slug = this.normalizeSlug(dto.slug);
        if (!slug) {
          throw new ConflictError(
            "Enter a valid slug using letters, numbers, and hyphens (e.g. my-article).",
          );
        }
        await this.assertSlugAvailable(scope.articles, slug);
      } else {
        slug = await this.generateUniqueSlug(dto.title, scope.articles);
      }

      const article: NewsArticleRecord = {
        id: this.id(),
        updatedAt: null,
        title: sanitizePlainText(dto.title),
        content: sanitizeNewsHtml(dto.content),
        titleFr: dto.titleFr != null ? sanitizePlainText(dto.titleFr) : null,
        contentFr: dto.contentFr != null ? sanitizeNewsHtml(dto.contentFr) : null,
        author,
        slug,
        isDraft: true,
        imageUrl: dto.imageUrl ?? null,
        type: dto.type ?? "short",
        createdAt: new Date(),
      };
      await scope.articles.save(article);
      return this.mapAdminArticle(article);
    });
  }

  async findAllPublishedArticle(
    page: number,
    limit: number,
    locale: NewsLocale = "en-US",
    type?: NewsType,
  ): Promise<{
    data: NewsArticleListItemResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [articles, total] = await this.newsRepository.listPublished(page, limit, type);
    const commentCounts = await this.replyService.countByTargetIds(
      "newsArticle",
      articles.map((article) => article.id),
    );
    return {
      data: articles.map((article) =>
        this.mapListArticle(article, locale, commentCounts.get(article.id) ?? 0),
      ),
      total,
      page,
      limit,
    };
  }

  async findPublishedShortsByWeek(
    week: string,
    locale: NewsLocale = "en-US",
  ): Promise<NewsWeekResponse> {
    const range = isoWeekUtcRange(week);
    if (!range) {
      throw new InvalidInputError("Week must be an ISO week id (e.g. 2026-W36).");
    }
    const articles = await this.newsRepository.listWeek(
      range.start,
      range.end,
      NEWS_WEEK_SHORTS_LIMIT,
    );
    return {
      week,
      start: range.start,
      end: range.end,
      items: articles.map((article) => this.mapArticle(article, locale)),
    };
  }

  async findPublishedSitemapMeta(): Promise<NewsSitemapMetaResponse> {
    const total = await this.newsRepository.countPublished();
    return {
      total,
      chunkSize: NEWS_SITEMAP_CHUNK_SIZE,
      chunkCount: newsSitemapChunkCount(total),
    };
  }

  /**
   * Chunk 0 is a stable archive (oldest first); only the last chunk grows.
   * Per-URL lastmod is `updatedAt ?? createdAt` so edits stay visible to crawlers.
   */
  async findPublishedSitemapChunk(chunk: number): Promise<NewsSitemapChunkResponse> {
    if (!Number.isInteger(chunk) || chunk < 0) {
      throw new InvalidInputError("Sitemap chunk must be a non-negative integer.");
    }

    const offset = chunk * NEWS_SITEMAP_CHUNK_SIZE;
    const [articles, total] = await this.newsRepository.sitemapChunk(
      offset,
      NEWS_SITEMAP_CHUNK_SIZE,
    );
    const chunkCount = newsSitemapChunkCount(total);
    if (chunk >= chunkCount) {
      throw new NotFoundError(`News sitemap chunk ${chunk} was not found.`);
    }

    return {
      total,
      chunkSize: NEWS_SITEMAP_CHUNK_SIZE,
      chunkCount,
      chunk,
      data: articles.map((article) => ({
        slug: article.slug,
        lastmod: (article.updatedAt ?? article.createdAt).toISOString(),
      })),
    };
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<{
    data: NewsArticleAdminResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [articles, total] = await this.newsRepository.listAdmin(page, limit);
    return {
      data: articles.map((a) => this.mapAdminArticle(a)),
      total,
      page,
      limit,
    };
  }

  async findOneBySlug(slug: string, locale: NewsLocale = "en-US"): Promise<NewsArticleResponse> {
    const article = await this.newsRepository.findBySlug(slug);
    if (!article) {
      throw new NotFoundError(`NewsArticle with slug "${slug}" not found`);
    }
    if (article.isDraft) throw new NotFoundError(`News article with slug "${slug}" not found`);
    return this.mapArticle(article, locale);
  }

  async findOneAdminBySlug(slug: string): Promise<NewsArticleAdminResponse> {
    const article = await this.newsRepository.findBySlug(slug);
    if (!article) {
      throw new NotFoundError(`NewsArticle with slug "${slug}" not found`);
    }
    return this.mapAdminArticle(article);
  }

  async findOneAdminByIdOrSlug(idOrSlug: string): Promise<NewsArticleAdminResponse> {
    const bySlug = await this.newsRepository.findBySlug(idOrSlug);
    if (bySlug) {
      return this.mapAdminArticle(bySlug);
    }

    const byId = await this.newsRepository.findById(idOrSlug);
    if (byId) {
      return this.mapAdminArticle(byId);
    }

    throw new NotFoundError(
      `News article "${idOrSlug}" was not found. Use list_news_articles to find the correct slug or id.`,
    );
  }

  async findArticleIdBySlug(slug: string): Promise<string> {
    const article = await this.newsRepository.findBySlug(slug);
    if (!article) {
      throw new NotFoundError(`NewsArticle with slug "${slug}" not found`);
    }
    return article.id;
  }

  async update(slug: string, dto: UpdateNewsArticleInput): Promise<NewsArticleAdminResponse> {
    const result = await this.transaction.run(async (scope) => {
      const article = await scope.articles.findBySlug(slug);
      if (!article) {
        throw new NotFoundError(`NewsArticle with slug "${slug}" not found`);
      }
      if (dto.title !== undefined) {
        article.title = sanitizePlainText(dto.title);
      }
      if (dto.content !== undefined) {
        article.content = sanitizeNewsHtml(dto.content);
      }
      if (dto.titleFr !== undefined) {
        article.titleFr = dto.titleFr != null ? sanitizePlainText(dto.titleFr) : null;
      }
      if (dto.contentFr !== undefined) {
        article.contentFr = dto.contentFr != null ? sanitizeNewsHtml(dto.contentFr) : null;
      }
      if (dto.imageUrl !== undefined) {
        article.imageUrl = dto.imageUrl ?? null;
      }
      if (dto.slug !== undefined) {
        const nextSlug = this.normalizeSlug(dto.slug);
        if (!nextSlug) {
          throw new ConflictError(
            "Enter a valid slug using letters, numbers, and hyphens (e.g. my-article).",
          );
        }
        if (nextSlug !== article.slug) {
          await this.assertSlugAvailable(scope.articles, nextSlug, article.id);
          article.slug = nextSlug;
        }
      }
      if (dto.type !== undefined) {
        article.type = dto.type;
      }
      await scope.articles.save(article);
      return this.mapAdminArticle(article);
    });
    if (!result.isDraft) {
      await this.indexing.submitNewsSlugs([slug, result.slug]);
    }
    return result;
  }

  async setDraftStatus(slug: string, isDraft: boolean) {
    const changed = await this.transaction.run(async (scope) => {
      const article = await scope.articles.findBySlug(slug);
      if (!article) {
        throw new NotFoundError(`NewsArticle with slug "${slug}" not found`);
      }
      const wasDraft = article.isDraft;
      article.isDraft = isDraft;
      await scope.articles.save(article);
      return wasDraft !== isDraft;
    });
    if (changed) {
      await this.indexing.submitNewsSlugs([slug]);
    }
  }

  async delete(slug: string): Promise<void> {
    const wasPublished = await this.transaction.run(async (scope) => {
      const article = await scope.articles.findBySlug(slug);
      if (!article) {
        throw new NotFoundError(`NewsArticle with slug "${slug}" not found`);
      }
      await scope.replies.deleteAllForTarget("newsArticle", article.id);
      await scope.articles.delete(article);
      return !article.isDraft;
    });
    if (wasPublished) {
      await this.indexing.submitNewsSlugs([slug]);
    }
  }
}
