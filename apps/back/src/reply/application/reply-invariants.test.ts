import { describe, expect, it, vi } from "vitest";
import { ReplyService } from "./reply.service";
import type { ReplyWriteScope, ReplyTransaction, ReplyWrites } from "./ports";
import type { Author } from "../../common/domain/author";
import type { ReplyRecord } from "./models";
import { FORUM_ERROR_CODES } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";

const now = new Date("2026-10-15T12:00:00Z");
const author: Author = { id: "author", userName: "Fan" };

const reply = (overrides: Partial<ReplyRecord> = {}): ReplyRecord => ({
  author,
  content: "hello",
  createdAt: new Date(now.getTime() - 120_000),
  hiddenAt: null,
  id: "parent",
  match: null,
  newsArticle: null,
  post: { id: "p", publicId: 1, title: "Thread" },
  replyTo: null,
  ...overrides,
});

const setup = () => {
  const saved: ReplyRecord[] = [];
  const notified: { recipientId: string; replyId: string }[] = [];

  const replies = {
    countByTargetIds: vi.fn<ReplyWrites["countByTargetIds"]>().mockResolvedValue(new Map()),
    countRootsByTarget: vi.fn<ReplyWrites["countRootsByTarget"]>().mockResolvedValue(0),
    delete: vi.fn<ReplyWrites["delete"]>(),
    findById: vi.fn<ReplyWrites["findById"]>().mockResolvedValue(reply()),
    findByTarget: vi.fn<ReplyWrites["findByTarget"]>().mockResolvedValue([]),
    findChildren: vi.fn<ReplyWrites["findChildren"]>().mockResolvedValue([]),
    findDescendantsForRoots: vi.fn<ReplyWrites["findDescendantsForRoots"]>().mockResolvedValue([]),
    findLatestByUser: vi.fn<ReplyWrites["findLatestByUser"]>().mockResolvedValue(null),
    findRecentForModeration: vi.fn<ReplyWrites["findRecentForModeration"]>().mockResolvedValue([]),
    save: vi.fn<ReplyWrites["save"]>(async (model) => {
      saved.push(model);
    }),
  };

  const scope: ReplyWriteScope = {
    notifications: {
      createForDirectReply: vi.fn<ReplyWriteScope["notifications"]["createForDirectReply"]>(
        async (recipientId, replyId) => {
          notified.push({ recipientId, replyId });
        },
      ),
    },
    replies,
    reports: {
      findByReplyAndReporter: vi
        .fn<ReplyWriteScope["reports"]["findByReplyAndReporter"]>()
        .mockResolvedValue(null),
      save: vi.fn<ReplyWriteScope["reports"]["save"]>(),
    },
    targets: {
      find: vi.fn<ReplyWriteScope["targets"]["find"]>().mockResolvedValue({
        match: null,
        newsArticle: null,
        post: { id: "p", publicId: 1, title: "Thread" },
      }),
    },
    users: { findById: vi.fn<ReplyWriteScope["users"]["findById"]>().mockResolvedValue(author) },
  };

  let commits = 0;

  const transaction: ReplyTransaction = {
    async run(work) {
      const result = await work(scope);
      commits += 1;

      return result;
    },
  };

  const service = new ReplyService(
    replies,
    transaction,
    () => now,
    () => "new-reply",
  );

  return { commits: () => commits, notified, replies, saved, scope, service };
};

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
    expect(f.notified).toStrictEqual([{ recipientId: "other", replyId: "new-reply" }]);
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
    expect(f.notified).toStrictEqual([]);
  });

  it("does not notify on a root reply", async () => {
    const f = setup();
    await f.service.create("author", { content: "Hi", postId: "p" });
    expect(f.notified).toStrictEqual([]);
  });

  it("rejects a parent from another target before saving", async () => {
    const f = setup();
    f.replies.findById.mockResolvedValue(
      reply({ post: { id: "different", publicId: 2, title: "Other" } }),
    );
    await expect(
      f.service.create("author", { content: "Hi", postId: "p", replyToId: "parent" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(f.saved).toStrictEqual([]);
  });

  it("rejects a hidden parent before saving", async () => {
    const f = setup();
    f.replies.findById.mockResolvedValue(reply({ hiddenAt: now }));
    await expect(
      f.service.create("author", { content: "Hi", postId: "p", replyToId: "parent" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(f.saved).toStrictEqual([]);
  });

  it("enforces the full one-minute cooldown including its boundary", async () => {
    const f = setup();
    f.replies.findLatestByUser.mockResolvedValue(
      reply({ createdAt: new Date(now.getTime() - 60_000) }),
    );
    await expect(f.service.create("author", { content: "Hi", postId: "p" })).rejects.toMatchObject({
      detail: { code: FORUM_ERROR_CODES.REPLY_RATE_LIMITED },
    });
    expect(f.saved).toStrictEqual([]);
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
      createdAt: now,
      id: "report",
      reason: "spam",
      reply: { id: "parent" },
      reporter: { id: "author" },
    });
    await expect(f.service.report("author", "parent", "spam")).rejects.toMatchObject({
      detail: { code: "REPLY_ALREADY_REPORTED" },
      kind: "conflict",
    });
  });

  it("deletes child replies before their parent in one transaction", async () => {
    const f = setup();
    const order: string[] = [];

    f.replies.findChildren.mockImplementation(async (id: string) =>
      id === "parent" ? [reply({ id: "child", replyTo: { id: "parent" } })] : [],
    );
    f.replies.findById.mockImplementation(async (id: string) => reply({ id }));
    f.replies.delete.mockImplementation(async (model: ReplyRecord) => {
      order.push(model.id);
    });
    await f.service.delete("parent");
    expect(order).toStrictEqual(["child", "parent"]);
    expect(f.commits()).toBe(1);
  });
});
