import { BadRequestException, NotFoundException } from "@nestjs/common";
import { NEWS_SITEMAP_CHUNK_SIZE, NewsService, newsSitemapChunkCount } from "./news.service";
import { NewsArticle } from "./domain/news-article.entity";

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
    count: jest.fn(),
    findAndCount: jest.fn(),
  };

  beforeEach(() => {
    service = new NewsService(newsRepository as never, {} as never, {} as never, {} as never);
    jest.clearAllMocks();
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
      newsRepository.count.mockResolvedValue(2);

      await expect(service.findPublishedSitemapMeta()).resolves.toEqual({
        total: 2,
        chunkSize: NEWS_SITEMAP_CHUNK_SIZE,
        chunkCount: 1,
      });
      expect(newsRepository.count).toHaveBeenCalledWith({ isDraft: false });
    });
  });

  describe("findPublishedSitemapChunk", () => {
    it("rejects a negative chunk index", async () => {
      await expect(service.findPublishedSitemapChunk(-1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(newsRepository.findAndCount).not.toHaveBeenCalled();
    });

    it("404s chunks past the archive", async () => {
      newsRepository.findAndCount.mockResolvedValue([[], 1]);

      await expect(service.findPublishedSitemapChunk(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns published slugs in stable createdAt, id order and omits drafts", async () => {
      newsRepository.findAndCount.mockResolvedValue([
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

      expect(newsRepository.findAndCount).toHaveBeenCalledWith(
        { isDraft: false },
        {
          fields: ["id", "slug", "createdAt", "updatedAt"],
          orderBy: { createdAt: "ASC", id: "ASC" },
          limit: NEWS_SITEMAP_CHUNK_SIZE,
          offset: 0,
        },
      );
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
      newsRepository.findAndCount.mockResolvedValue([[], 0]);

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
    findAndCount: jest.fn(),
  };
  const replyService = {
    countByTargetIds: jest.fn(),
  };

  beforeEach(() => {
    service = new NewsService(
      newsRepository as never,
      {} as never,
      replyService as never,
      {} as never,
    );
    jest.clearAllMocks();
    replyService.countByTargetIds.mockResolvedValue(new Map());
  });

  it("filters published articles by type when provided", async () => {
    newsRepository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAllPublishedArticle(0, 20, "en-US", "article");

    expect(newsRepository.findAndCount).toHaveBeenCalledWith(
      { isDraft: false, type: "article" },
      { orderBy: { createdAt: "DESC" }, limit: 20, offset: 0 },
    );
  });

  it("omits type from the filter when listing the mixed feed", async () => {
    newsRepository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAllPublishedArticle(0, 20, "en-US");

    expect(newsRepository.findAndCount).toHaveBeenCalledWith(
      { isDraft: false },
      { orderBy: { createdAt: "DESC" }, limit: 20, offset: 0 },
    );
  });
});

describe("NewsService findPublishedShortsByWeek", () => {
  let service: NewsService;
  const newsRepository = {
    find: jest.fn(),
  };

  beforeEach(() => {
    service = new NewsService(newsRepository as never, {} as never, {} as never, {} as never);
    jest.clearAllMocks();
  });

  it("rejects an invalid ISO week id", async () => {
    await expect(service.findPublishedShortsByWeek("2026-W99")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(newsRepository.find).not.toHaveBeenCalled();
  });

  it("loads published shorts in that UTC week newest first", async () => {
    newsRepository.find.mockResolvedValue([]);

    await service.findPublishedShortsByWeek("2026-W36", "en-US");

    expect(newsRepository.find).toHaveBeenCalledWith(
      {
        isDraft: false,
        type: "short",
        createdAt: {
          $gte: new Date("2026-08-31T00:00:00.000Z"),
          $lt: new Date("2026-09-07T00:00:00.000Z"),
        },
      },
      {
        populate: ["author"],
        orderBy: { createdAt: "DESC" },
        limit: 100,
      },
    );
  });
});

describe("news publication notifications", () => {
  const article = Object.assign(new NewsArticle(), {
    id: "news-1",
    slug: "old-slug",
    title: "RLCS final",
    content: "Final results",
    author: { userName: "Editor" },
  });
  const flush = jest.fn();
  const entityManager = { flush, remove: jest.fn() };
  const repository = { findOne: jest.fn(), getEntityManager: () => entityManager };
  const replyService = { deleteAllForTarget: jest.fn() };
  const indexNow = { submitNewsSlugs: jest.fn() };
  const service = new NewsService(
    repository as never,
    {} as never,
    replyService as never,
    indexNow as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    article.isDraft = false;
    article.slug = "old-slug";
    repository.findOne.mockImplementation(async ({ slug }) =>
      slug === article.slug ? article : null,
    );
    entityManager.remove.mockReturnValue(entityManager);
    flush.mockResolvedValue(undefined);
    indexNow.submitNewsSlugs.mockResolvedValue(undefined);
  });

  it("notifies both the old and new URLs after a published article is saved", async () => {
    await service.update("old-slug", { slug: "new-slug" });
    expect(indexNow.submitNewsSlugs).toHaveBeenCalledWith(["old-slug", "new-slug"]);
    expect(flush.mock.invocationCallOrder[0]).toBeLessThan(
      indexNow.submitNewsSlugs.mock.invocationCallOrder[0]!,
    );
  });

  it("does not expose changes to unpublished drafts", async () => {
    article.isDraft = true;
    await service.update("old-slug", { title: "Unpublished changes" });
    expect(indexNow.submitNewsSlugs).not.toHaveBeenCalled();
  });

  it.each([true, false])("notifies when draft status changes to %s", async (draft) => {
    article.isDraft = !draft;
    await service.setDraftStatus("old-slug", draft);
    expect(indexNow.submitNewsSlugs).toHaveBeenCalledWith(["old-slug"]);
  });

  it("does not notify when publishing an already published article", async () => {
    await service.setDraftStatus("old-slug", false);
    expect(indexNow.submitNewsSlugs).not.toHaveBeenCalled();
  });

  it("notifies search engines when a published article is deleted", async () => {
    await service.delete("old-slug");
    expect(indexNow.submitNewsSlugs).toHaveBeenCalledWith(["old-slug"]);
  });

  it("does not notify when deleting a draft", async () => {
    article.isDraft = true;
    await service.delete("old-slug");
    expect(indexNow.submitNewsSlugs).not.toHaveBeenCalled();
  });

  it("does not notify when saving fails", async () => {
    flush.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(service.update("old-slug", { title: "New title" })).rejects.toThrow(
      "Database unavailable",
    );
    expect(indexNow.submitNewsSlugs).not.toHaveBeenCalled();
  });
});
