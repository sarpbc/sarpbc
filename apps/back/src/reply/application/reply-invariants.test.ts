import { describe, expect, it } from "vitest";
import { ReplyService } from "./reply.service";
import { InMemoryReplyScope } from "./reply-store.test-utils";
import type { Author } from "../../common/domain/author";
import type { ReplyRecord } from "./models";
import { FORUM_ERROR_CODES } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";

const now = new Date("2026-10-15T12:00:00Z");
const author: Author = { id: "author", userName: "Fan" };

const reply = (overrides: Partial<ReplyRecord> = {}) => ({
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
  const scope = new InMemoryReplyScope();
  scope.addUser(author);
  scope.replies.add(reply());

  scope.addTarget(
    { id: "p", kind: "forumPost" },
    { match: null, newsArticle: null, post: { id: "p", publicId: 1, title: "Thread" } },
  );

  const service = new ReplyService(
    scope.replies,
    scope,
    () => now,
    () => "new-reply",
  );

  return { scope, service };
};

describe("reply invariants without Nest or ORM", () => {
  it("writes the direct notification in the same application transaction", async () => {
    const f = setup();
    f.scope.replies.add(reply({ author: { id: "other", userName: "Other" } }));

    const result = await f.service.create("author", {
      content: " <b>Hello</b> ",
      postId: "p",
      replyToId: "parent",
    });

    expect(result.content).toBe("Hello");
    expect(f.scope.replies.saved).toHaveLength(1);
    expect(f.scope.notified).toStrictEqual([{ recipientId: "other", replyId: "new-reply" }]);
    expect(f.scope.commits).toBe(1);
  });

  it("waits for notification completion before committing", async () => {
    const f = setup();
    f.scope.replies.add(reply({ author: { id: "other", userName: "Other" } }));
    f.scope.failNotificationsWith(new Error("notification failed"));

    await expect(
      f.service.create("author", { content: "Hi", postId: "p", replyToId: "parent" }),
    ).rejects.toThrow("notification failed");
    expect(f.scope.commits).toBe(0);
  });

  it("does not notify an author replying to themselves", async () => {
    const f = setup();
    await f.service.create("author", { content: "Hi", postId: "p", replyToId: "parent" });
    expect(f.scope.notified).toStrictEqual([]);
  });

  it("does not notify on a root reply", async () => {
    const f = setup();
    await f.service.create("author", { content: "Hi", postId: "p" });
    expect(f.scope.notified).toStrictEqual([]);
  });

  it("rejects a parent from another target before saving", async () => {
    const f = setup();
    f.scope.replies.add(reply({ post: { id: "different", publicId: 2, title: "Other" } }));
    await expect(
      f.service.create("author", { content: "Hi", postId: "p", replyToId: "parent" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(f.scope.replies.saved).toStrictEqual([]);
  });

  it("rejects a hidden parent before saving", async () => {
    const f = setup();
    f.scope.replies.add(reply({ hiddenAt: now }));
    await expect(
      f.service.create("author", { content: "Hi", postId: "p", replyToId: "parent" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(f.scope.replies.saved).toStrictEqual([]);
  });

  it("enforces the full one-minute cooldown including its boundary", async () => {
    const f = setup();
    f.scope.replies.add(reply({ createdAt: new Date(now.getTime() - 60_000), id: "recent" }));
    await expect(f.service.create("author", { content: "Hi", postId: "p" })).rejects.toMatchObject({
      detail: { code: FORUM_ERROR_CODES.REPLY_RATE_LIMITED },
    });
    expect(f.scope.replies.saved).toStrictEqual([]);
  });

  it("rejects reports on the author own comment", async () => {
    const f = setup();
    await expect(f.service.report("author", "parent", "spam")).rejects.toBeInstanceOf(
      InvalidInputError,
    );
  });

  it("rejects a duplicate report with the existing public error code", async () => {
    const f = setup();
    f.scope.replies.add(reply({ author: { id: "other", userName: "Other" } }));
    f.scope.reports.add({
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
    f.scope.replies.add(reply({ id: "child", replyTo: { id: "parent" } }));

    await f.service.delete("parent");
    expect(f.scope.replies.deleted).toStrictEqual(["child", "parent"]);
    expect(f.scope.commits).toBe(1);
  });
});
