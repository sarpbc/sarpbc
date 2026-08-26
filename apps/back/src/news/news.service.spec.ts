import { BadRequestException, NotFoundException } from "@nestjs/common";
import { NEWS_SITEMAP_CHUNK_SIZE, NewsService, newsSitemapChunkCount } from "./news.service";
import type { NewsArticle } from "./domain/news-article.entity";

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
    service = new NewsService(newsRepository as never, {} as never, {} as never);
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
