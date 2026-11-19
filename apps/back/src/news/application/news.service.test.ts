import { beforeEach, describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NewsService } from "./news.service";
import type { NewsArticleRecord } from "./models";
import type { NewsComments, NewsIndexing } from "./ports";
import { MemoryNewsStore } from "./news-store.test-utils";

const comments: NewsComments = {
  countByTargetIds: async () => await Promise.resolve(new Map<string, number>()),
};

const draftArticle = (overrides: Partial<NewsArticleRecord>) => {
  const base = {
    author: { id: "editor", userName: "Editor" },
    content: "Final results",
    contentFr: null,
    createdAt: new Date("2026-10-17T12:00:00Z"),
    id: "news-1",
    imageUrl: null,
    isDraft: false,
    slug: "old-slug",
    title: "RLCS final",
    titleFr: null,
    type: "article",
    updatedAt: null,
  } satisfies NewsArticleRecord;

  return { ...base, ...overrides };
};

const short = (title: string, createdAt: string, isDraft = false) =>
  draftArticle({
    createdAt: new Date(createdAt),
    id: title,
    isDraft,
    slug: title,
    title,
    type: "short",
  });

const noIndexing: NewsIndexing = {
  submitNewsSlugs: async () => {
    await Promise.resolve();
  },
};

const serviceOver = (store: MemoryNewsStore) =>
  new NewsService(store, store.transaction, comments, noIndexing);

describe("NewsService findPublishedShortsByWeek", () => {
  it("rejects an invalid ISO week id", async () => {
    const service = serviceOver(new MemoryNewsStore());

    await expect(service.findPublishedShortsByWeek("2026-W99")).rejects.toBeInstanceOf(
      InvalidInputError,
    );
  });

  it("loads published shorts in that UTC week newest first", async () => {
    const service = serviceOver(
      new MemoryNewsStore([
        short("before", "2026-08-30T23:59:59.000Z"),
        short("monday", "2026-08-31T00:00:00.000Z"),
        short("sunday", "2026-09-06T23:59:59.000Z"),
        short("draft", "2026-09-02T10:00:00.000Z", true),
        short("after", "2026-09-07T00:00:00.000Z"),
      ]),
    );

    const week = await service.findPublishedShortsByWeek("2026-W36", "en-US");

    expect(week.start).toStrictEqual(new Date("2026-08-31T00:00:00.000Z"));
    expect(week.end).toStrictEqual(new Date("2026-09-07T00:00:00.000Z"));
    expect(week.items.map(({ title }) => title)).toStrictEqual(["sunday", "monday"]);
  });
});

describe("news publication notifications", () => {
  let store: MemoryNewsStore;
  let article: NewsArticleRecord;
  let committedAtSubmission: boolean[];
  let submissions: string[][];
  let service: NewsService;

  beforeEach(() => {
    article = draftArticle({});
    store = new MemoryNewsStore([article]);
    committedAtSubmission = [];
    submissions = [];

    const indexing: NewsIndexing = {
      submitNewsSlugs: async (slugs) => {
        submissions.push(slugs);
        committedAtSubmission.push(store.commits > 0);
        await Promise.resolve();
      },
    };

    service = new NewsService(store, store.transaction, comments, indexing);
  });

  it("notifies both the old and new URLs only after the article transaction commits", async () => {
    await service.update("old-slug", { slug: "new-slug" });
    expect(submissions).toStrictEqual([["old-slug", "new-slug"]]);
    expect(committedAtSubmission).toStrictEqual([true]);
  });

  it("does not expose changes to unpublished drafts", async () => {
    article.isDraft = true;
    await service.update("old-slug", { title: "Unpublished changes" });
    expect(submissions).toStrictEqual([]);
  });

  it.each([true, false])("notifies when draft status changes to %s", async (draft) => {
    article.isDraft = !draft;
    await service.setDraftStatus("old-slug", draft);
    expect(submissions).toStrictEqual([["old-slug"]]);
    expect(committedAtSubmission).toStrictEqual([true]);
  });

  it("does not notify when publishing an already published article", async () => {
    await service.setDraftStatus("old-slug", false);
    expect(submissions).toStrictEqual([]);
  });

  it("notifies after a published article is deleted", async () => {
    await service.delete("old-slug");
    expect(submissions).toStrictEqual([["old-slug"]]);
    expect(committedAtSubmission).toStrictEqual([true]);
  });

  it("does not notify when deleting a draft", async () => {
    article.isDraft = true;
    await service.delete("old-slug");
    expect(submissions).toStrictEqual([]);
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
  });

  it("does not notify when committing fails", async () => {
    store.commitFailure = new Error("Database unavailable");
    await expect(service.update("old-slug", { title: "New title" })).rejects.toThrow(
      "Database unavailable",
    );
    expect(submissions).toStrictEqual([]);
  });
});
