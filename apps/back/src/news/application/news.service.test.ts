import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InvalidInputError as BadRequestException,
  NotFoundError as NotFoundException,
} from "../../common/domain/errors";
import { NEWS_SITEMAP_CHUNK_SIZE, NewsService, newsSitemapChunkCount } from "./news.service";
import type { NewsArticleRecord as NewsArticle } from "./models";
import type { NewsTransaction, NewsWriteScope } from "./ports";

describe("newsSitemapChunkCount", () => {
  it("always exposes at least chunk 0 so the index can list a news urlset", () => {
    expect(newsSitemapChunkCount(0)).toBe(1);
  });

  it("fills complete 1,000-URL archives before opening a new chunk", () => {
    expect(newsSitemapChunkCount(1)).toBe(1);
    expect(newsSitemapChunkCount(NEWS_SITEMAP_CHUNK_SIZE)).toBe(1);
    expect(newsSitemapChunkCount(NEWS_SITEMAP_CHUNK_SIZE + 1)).toBe(2);
  });
});

describe("NewsService sitemap", () => {
  let service: NewsService;
  const newsRepository = {
    countPublished: vi.fn(),
    sitemapChunk: vi.fn(),
  };

  beforeEach(() => {
    service = new NewsService(newsRepository as never, {} as never, {} as never, {} as never);
    vi.clearAllMocks();
  });

  function publishedArticle(
    overrides: Pick<NewsArticle, "slug"> & Partial<NewsArticle>,
  ): NewsArticle {
    return {
      id: overrides.id ?? "id-1",
      slug: overrides.slug,
      createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: overrides.updatedAt ?? null,
    } as NewsArticle;
  }

  describe("findPublishedSitemapMeta", () => {
    it("counts published articles only", async () => {
      newsRepository.countPublished.mockResolvedValue(2);

      await expect(service.findPublishedSitemapMeta()).resolves.toEqual({
        total: 2,
        chunkSize: NEWS_SITEMAP_CHUNK_SIZE,
        chunkCount: 1,
      });
      expect(newsRepository.countPublished).toHaveBeenCalledWith();
    });
  });

  describe("findPublishedSitemapChunk", () => {
    it("rejects a negative chunk index", async () => {
      await expect(service.findPublishedSitemapChunk(-1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(newsRepository.sitemapChunk).not.toHaveBeenCalled();
    });

    it("404s chunks past the archive", async () => {
      newsRepository.sitemapChunk.mockResolvedValue([[], 1]);

      await expect(service.findPublishedSitemapChunk(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns published slugs in stable createdAt, id order and omits drafts", async () => {
      newsRepository.sitemapChunk.mockResolvedValue([
        [
          publishedArticle({
            id: "older",
            slug: "published-one",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: null,
          }),
          publishedArticle({
            id: "newer",
            slug: "published-two",
            createdAt: new Date("2026-02-01T00:00:00.000Z"),
            updatedAt: new Date("2026-03-01T12:00:00.000Z"),
          }),
        ],
        2,
      ]);

      const result = await service.findPublishedSitemapChunk(0);

      expect(newsRepository.sitemapChunk).toHaveBeenCalledWith(0, NEWS_SITEMAP_CHUNK_SIZE);
      expect(result.data.map((entry) => entry.slug)).toEqual(["published-one", "published-two"]);
      expect(result.data.map((entry) => entry.slug)).not.toContain("secret-draft");
      expect(result.data[0]?.lastmod).toBe("2026-01-01T00:00:00.000Z");
      expect(result.data[1]?.lastmod).toBe("2026-03-01T12:00:00.000Z");
      expect(result).toMatchObject({
        total: 2,
        chunk: 0,
        chunkSize: NEWS_SITEMAP_CHUNK_SIZE,
        chunkCount: 1,
      });
    });

    it("serves an empty chunk 0 when nothing is published yet", async () => {
      newsRepository.sitemapChunk.mockResolvedValue([[], 0]);

      await expect(service.findPublishedSitemapChunk(0)).resolves.toEqual({
        total: 0,
        chunkSize: NEWS_SITEMAP_CHUNK_SIZE,
        chunkCount: 1,
        chunk: 0,
        data: [],
      });
    });
  });
});

describe("NewsService findAllPublishedArticle", () => {
  let service: NewsService;
  const newsRepository = {
    listPublished: vi.fn(),
  };
  const replyService = {
    countByTargetIds: vi.fn(),
  };

  beforeEach(() => {
    service = new NewsService(
      newsRepository as never,
      {} as never,
      replyService as never,
      {} as never,
    );
    vi.clearAllMocks();
    replyService.countByTargetIds.mockResolvedValue(new Map());
  });

  it("filters published articles by type when provided", async () => {
    newsRepository.listPublished.mockResolvedValue([[], 0]);

    await service.findAllPublishedArticle(0, 20, "en-US", "article");

    expect(newsRepository.listPublished).toHaveBeenCalledWith(0, 20, "article");
  });

  it("omits type from the filter when listing the mixed feed", async () => {
    newsRepository.listPublished.mockResolvedValue([[], 0]);

    await service.findAllPublishedArticle(0, 20, "en-US");

    expect(newsRepository.listPublished).toHaveBeenCalledWith(0, 20, undefined);
  });
});

describe("NewsService findPublishedShortsByWeek", () => {
  let service: NewsService;
  const newsRepository = {
    listWeek: vi.fn(),
  };

  beforeEach(() => {
    service = new NewsService(newsRepository as never, {} as never, {} as never, {} as never);
    vi.clearAllMocks();
  });

  it("rejects an invalid ISO week id", async () => {
    await expect(service.findPublishedShortsByWeek("2026-W99")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(newsRepository.listWeek).not.toHaveBeenCalled();
  });

  it("loads published shorts in that UTC week newest first", async () => {
    newsRepository.listWeek.mockResolvedValue([]);

    await service.findPublishedShortsByWeek("2026-W36", "en-US");

    expect(newsRepository.listWeek).toHaveBeenCalledWith(
      new Date("2026-08-31T00:00:00.000Z"),
      new Date("2026-09-07T00:00:00.000Z"),
      100,
    );
  });
});

describe("news publication notifications", () => {
  let article: NewsArticle;
  let committed = false;
  const commit = vi.fn(async () => {
    committed = true;
  });
  const articles = {
    findBySlug: vi.fn(),
    findById: vi.fn(),
    listPublished: vi.fn(),
    listWeek: vi.fn(),
    countPublished: vi.fn(),
    sitemapChunk: vi.fn(),
    listAdmin: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };
  const scope: NewsWriteScope = {
    articles,
    users: { findById: vi.fn() },
    replies: { deleteAllForTarget: vi.fn() },
  };
  const transaction: NewsTransaction = {
    async run(work) {
      const result = await work(scope);
      await commit();
      return result;
    },
  };
  const indexing = {
    submitNewsSlugs: vi.fn(async (_slugs: string[]) => {
      expect(committed).toBe(true);
    }),
  };
  const service = new NewsService(articles, transaction, { countByTargetIds: vi.fn() }, indexing);

  beforeEach(() => {
    vi.clearAllMocks();
    committed = false;
    article = {
      id: "news-1",
      slug: "old-slug",
      title: "RLCS final",
      content: "Final results",
      titleFr: null,
      contentFr: null,
      author: { id: "editor", userName: "Editor" },
      createdAt: new Date("2026-10-17T12:00:00Z"),
      updatedAt: null,
      isDraft: false,
      imageUrl: null,
      type: "article",
    };
    articles.findBySlug.mockImplementation(async (slug: string) =>
      slug === article.slug ? article : null,
    );
  });

  it("notifies both the old and new URLs only after the article transaction commits", async () => {
    await service.update("old-slug", { slug: "new-slug" });
    expect(indexing.submitNewsSlugs).toHaveBeenCalledWith(["old-slug", "new-slug"]);
  });

  it("does not expose changes to unpublished drafts", async () => {
    article.isDraft = true;
    await service.update("old-slug", { title: "Unpublished changes" });
    expect(indexing.submitNewsSlugs).not.toHaveBeenCalled();
  });

  it.each([true, false])("notifies when draft status changes to %s", async (draft) => {
    article.isDraft = !draft;
    await service.setDraftStatus("old-slug", draft);
    expect(indexing.submitNewsSlugs).toHaveBeenCalledWith(["old-slug"]);
  });

  it("does not notify when publishing an already published article", async () => {
    await service.setDraftStatus("old-slug", false);
    expect(indexing.submitNewsSlugs).not.toHaveBeenCalled();
  });

  it("notifies after a published article is deleted", async () => {
    await service.delete("old-slug");
    expect(indexing.submitNewsSlugs).toHaveBeenCalledWith(["old-slug"]);
  });

  it("does not notify when deleting a draft", async () => {
    article.isDraft = true;
    await service.delete("old-slug");
    expect(indexing.submitNewsSlugs).not.toHaveBeenCalled();
  });

  it("does not notify when committing fails", async () => {
    commit.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(service.update("old-slug", { title: "New title" })).rejects.toThrow(
      "Database unavailable",
    );
    expect(indexing.submitNewsSlugs).not.toHaveBeenCalled();
  });
});
