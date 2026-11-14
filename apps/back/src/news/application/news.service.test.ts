import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NewsService } from "./news.service";
import type { NewsArticleRecord } from "./models";
import type {
  NewsComments,
  NewsIndexing,
  NewsQueries,
  NewsTransaction,
  NewsWriteScope,
} from "./ports";

const unused = async (): Promise<never> => await Promise.reject(new Error("unused"));

describe("NewsService findPublishedShortsByWeek", () => {
  let service: NewsService;

  const newsRepository = {
    findBySlug: unused,
    findById: unused,
    listPublished: unused,
    listWeek: vi.fn<NewsQueries["listWeek"]>(),
    listAdmin: unused,
  } satisfies NewsQueries;

  beforeEach(() => {
    service = new NewsService(
      newsRepository,
      { run: unused },
      { countByTargetIds: unused },
      { submitNewsSlugs: unused },
    );
    vi.clearAllMocks();
  });

  it("rejects an invalid ISO week id", async () => {
    await expect(service.findPublishedShortsByWeek("2026-W99")).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(newsRepository.listWeek).not.toHaveBeenCalled();
  });

  it("loads published shorts in that UTC week newest first", async () => {
    newsRepository.listWeek.mockResolvedValue([]);

    await service.findPublishedShortsByWeek("2026-W36", "en-US");

    expect(newsRepository.listWeek).toHaveBeenCalledExactlyOnceWith(
      new Date("2026-08-31T00:00:00.000Z"),
      new Date("2026-09-07T00:00:00.000Z"),
      expect.any(Number),
    );
  });
});

describe("news publication notifications", () => {
  let article: NewsArticleRecord;
  let committed = false;

  let committedAtSubmission: boolean[] = [];

  const commit = vi.fn<() => Promise<void>>(async () => {
    committed = true;
  });

  const articles = {
    findBySlug: vi.fn<NewsWriteScope["articles"]["findBySlug"]>(),
    findById: vi.fn<NewsWriteScope["articles"]["findById"]>(),
    listPublished: vi.fn<NewsWriteScope["articles"]["listPublished"]>(),
    listWeek: vi.fn<NewsWriteScope["articles"]["listWeek"]>(),
    listAdmin: vi.fn<NewsWriteScope["articles"]["listAdmin"]>(),
    save: vi.fn<NewsWriteScope["articles"]["save"]>(),
    delete: vi.fn<NewsWriteScope["articles"]["delete"]>(),
  };

  const scope: NewsWriteScope = {
    articles,
    users: { findById: vi.fn<NewsWriteScope["users"]["findById"]>() },
    replies: {
      deleteAllForTarget: vi.fn<NewsWriteScope["replies"]["deleteAllForTarget"]>(),
    },
  };

  const transaction: NewsTransaction = {
    async run(work) {
      const result = await work(scope);
      await commit();

      return result;
    },
  };

  const indexing = {
    submitNewsSlugs: vi.fn<NewsIndexing["submitNewsSlugs"]>(async () => {
      committedAtSubmission.push(committed);
    }),
  };

  const service = new NewsService(
    articles,
    transaction,
    { countByTargetIds: vi.fn<NewsComments["countByTargetIds"]>() },
    indexing,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    committed = false;
    committedAtSubmission = [];
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
    articles.findBySlug.mockImplementation(async (slug) =>
      slug === article.slug ? article : null,
    );
  });

  it("notifies both the old and new URLs only after the article transaction commits", async () => {
    await service.update("old-slug", { slug: "new-slug" });
    expect(indexing.submitNewsSlugs).toHaveBeenCalledExactlyOnceWith(["old-slug", "new-slug"]);
    expect(committedAtSubmission).toStrictEqual([true]);
  });

  it("does not expose changes to unpublished drafts", async () => {
    article.isDraft = true;
    await service.update("old-slug", { title: "Unpublished changes" });
    expect(indexing.submitNewsSlugs).not.toHaveBeenCalled();
  });

  it.each([true, false])("notifies when draft status changes to %s", async (draft) => {
    article.isDraft = !draft;
    await service.setDraftStatus("old-slug", draft);
    expect(indexing.submitNewsSlugs).toHaveBeenCalledExactlyOnceWith(["old-slug"]);
    expect(committedAtSubmission).toStrictEqual([true]);
  });

  it("does not notify when publishing an already published article", async () => {
    await service.setDraftStatus("old-slug", false);
    expect(indexing.submitNewsSlugs).not.toHaveBeenCalled();
  });

  it("notifies after a published article is deleted", async () => {
    await service.delete("old-slug");
    expect(indexing.submitNewsSlugs).toHaveBeenCalledExactlyOnceWith(["old-slug"]);
    expect(committedAtSubmission).toStrictEqual([true]);
  });

  it("does not notify when deleting a draft", async () => {
    article.isDraft = true;
    await service.delete("old-slug");
    expect(indexing.submitNewsSlugs).not.toHaveBeenCalled();
  });

  it("stores match blocks in English and French bodies", async () => {
    const block = ':matches{tournament="a3c5e7f9-1b2d-4f6a-8c0e-2d4f6a8c0e33" limit="3"}';
    await service.update("old-slug", {
      content: `Bracket\n\n${block}`,
      contentFr: `Tableau\n\n${block}`,
    });
    expect(article.content).toBe(`Bracket\n\n${block}`);
    expect(article.contentFr).toBe(`Tableau\n\n${block}`);
  });

  it("rejects an invalid match block before saving", async () => {
    await expect(
      service.update("old-slug", { contentFr: 'Tableau\n\n:matches{team="falcons"}' }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(article.contentFr).toBeNull();
    expect(articles.save).not.toHaveBeenCalled();
  });

  it("does not notify when committing fails", async () => {
    commit.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(service.update("old-slug", { title: "New title" })).rejects.toThrow(
      "Database unavailable",
    );
    expect(indexing.submitNewsSlugs).not.toHaveBeenCalled();
  });
});
