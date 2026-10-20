import { describe, expect, it, vi } from "vitest";
import { ReplyService } from "./reply.service";
import type { ReplyWriteScope, ReplyTransaction } from "./ports";
import type { ReplyRecord, ReplyAuthor } from "../domain/reply";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
const now = new Date("2026-10-15T12:00:00Z");
const author: ReplyAuthor = { id: "author", userName: "Fan" };
function reply(overrides: Partial<ReplyRecord> = {}): ReplyRecord {
  return {
    id: "parent",
    author,
    content: "hello",
    post: { id: "p", publicId: 1, title: "Thread" },
    newsArticle: null,
    match: null,
    replyTo: null,
    hiddenAt: null,
    createdAt: new Date(now.getTime() - 120000),
    ...overrides,
  };
}
function setup() {
  const saved: ReplyRecord[] = [];
  const notified: { recipientId: string; replyId: string }[] = [];
  const replies = {
    findByTarget: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(reply()),
    findLatestByUser: vi.fn().mockResolvedValue(null),
    countRootsByTarget: vi.fn().mockResolvedValue(0),
    countByTargetIds: vi.fn().mockResolvedValue(new Map()),
    findDescendantsForRoots: vi.fn().mockResolvedValue([]),
    findRecentForModeration: vi.fn().mockResolvedValue([]),
    findChildren: vi.fn().mockResolvedValue([]),
    save: vi.fn(async (model: ReplyRecord) => {
      saved.push(model);
    }),
    delete: vi.fn(),
  };
  const scope: ReplyWriteScope = {
    replies,
    reports: { findByReplyAndReporter: vi.fn().mockResolvedValue(null), save: vi.fn() },
    users: { findById: vi.fn().mockResolvedValue(author) },
    targets: {
      find: vi.fn().mockResolvedValue({
        post: { id: "p", publicId: 1, title: "Thread" },
        newsArticle: null,
        match: null,
      }),
    },
    notifications: {
      createForDirectReply: vi.fn(async (recipientId: string, replyId: string) => {
        notified.push({ recipientId, replyId });
      }),
    },
  };
  let commits = 0;
  const transaction: ReplyTransaction = {
    async run(work) {
      const result = await work(scope);
      commits++;
      return result;
    },
  };
  const service = new ReplyService(
    replies,
    transaction,
    () => now,
    () => "new-reply",
  );
  return { scope, replies, service, saved, notified, commits: () => commits };
}
describe("reply invariants without Nest or ORM", () => {
  it("writes the direct notification in the same application transaction", async () => {
    const f = setup();
    f.replies.findById.mockResolvedValue(reply({ author: { id: "other", userName: "Other" } }));
    const result = await f.service.create("author", {
      content: " <b>Hello</b> ",
      postId: "p",
      replyToId: "parent",
    });
    expect(result.content).toBe("Hello");
    expect(f.saved).toHaveLength(1);
    expect(f.notified).toEqual([{ recipientId: "other", replyId: "new-reply" }]);
    expect(f.commits()).toBe(1);
  });
  it("waits for notification completion before committing", async () => {
    const f = setup();
    f.replies.findById.mockResolvedValue(reply({ author: { id: "other", userName: "Other" } }));
    f.scope.notifications.createForDirectReply = async () => {
      throw new Error("notification failed");
    };
    await expect(
      f.service.create("author", { content: "Hi", postId: "p", replyToId: "parent" }),
    ).rejects.toThrow("notification failed");
    expect(f.commits()).toBe(0);
  });
  it("does not notify an author replying to themselves", async () => {
    const f = setup();
    await f.service.create("author", { content: "Hi", postId: "p", replyToId: "parent" });
    expect(f.notified).toEqual([]);
  });
  it("does not notify on a root reply", async () => {
    const f = setup();
    await f.service.create("author", { content: "Hi", postId: "p" });
    expect(f.notified).toEqual([]);
  });
  it("rejects a parent from another target before saving", async () => {
    const f = setup();
    f.replies.findById.mockResolvedValue(
      reply({ post: { id: "different", publicId: 2, title: "Other" } }),
    );
    await expect(
      f.service.create("author", { content: "Hi", postId: "p", replyToId: "parent" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(f.saved).toEqual([]);
  });
  it("rejects a hidden parent before saving", async () => {
    const f = setup();
    f.replies.findById.mockResolvedValue(reply({ hiddenAt: now }));
    await expect(
      f.service.create("author", { content: "Hi", postId: "p", replyToId: "parent" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(f.saved).toEqual([]);
  });
  it("enforces the full one-minute cooldown including its boundary", async () => {
    const f = setup();
    f.replies.findLatestByUser.mockResolvedValue(
      reply({ createdAt: new Date(now.getTime() - 60000) }),
    );
    await expect(f.service.create("author", { content: "Hi", postId: "p" })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(f.saved).toEqual([]);
  });
  it("rejects reports on the author own comment", async () => {
    const f = setup();
    await expect(f.service.report("author", "parent", "spam")).rejects.toBeInstanceOf(
      InvalidInputError,
    );
  });
  it("rejects a duplicate report with the existing public error code", async () => {
    const f = setup();
    f.replies.findById.mockResolvedValue(reply({ author: { id: "other", userName: "Other" } }));
    f.scope.reports.findByReplyAndReporter = async () => ({
      id: "report",
      reply: { id: "parent" },
      reporter: { id: "author" },
      reason: "spam",
      createdAt: now,
    });
    await expect(f.service.report("author", "parent", "spam")).rejects.toMatchObject({
      kind: "conflict",
      detail: { code: "REPLY_ALREADY_REPORTED" },
    });
  });
  it("deletes child replies before their parent in one transaction", async () => {
    const f = setup(),
      order: string[] = [];
    f.replies.findChildren.mockImplementation(async (id: string) =>
      id === "parent" ? [reply({ id: "child", replyTo: { id: "parent" } })] : [],
    );
    f.replies.findById.mockImplementation(async (id: string) => reply({ id }));
    f.replies.delete.mockImplementation(async (model: ReplyRecord) => {
      order.push(model.id);
    });
    await f.service.delete("parent");
    expect(order).toEqual(["child", "parent"]);
    expect(f.commits()).toBe(1);
  });
});
