import { describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../common/domain/errors";
import { FORUM_ERROR_CODES } from "../../forum/domain/forum.constants";
import type { ReplyRecord } from "../domain/reply";
import { transactionalReplies } from "./composition";

const reply: ReplyRecord = {
  id: "reply",
  content: "Comment",
  author: { id: "author", userName: "Fan" },
  post: { id: "post", publicId: 1, title: "Thread" },
  newsArticle: null,
  match: null,
  replyTo: null,
  hiddenAt: null,
  createdAt: new Date("2026-01-01"),
};

function setup(failure: Error, phase: "flush" | "commit" = "flush") {
  const tx = {
    getRepository: vi.fn().mockReturnValue({}),
    findOne: vi.fn().mockResolvedValue(null),
    getReference: vi.fn((_entity, id: string) => ({ id })),
    persist: vi.fn(),
    remove: vi.fn(),
    flush: vi.fn(async () => {
      if (phase === "flush") throw failure;
    }),
  };
  const em = {
    transactional: async (work: (manager: typeof tx) => Promise<unknown>) => {
      const result = await work(tx);
      if (phase === "commit") throw failure;
      return result;
    },
  };
  return { tx, transaction: transactionalReplies(em as never) };
}

describe("reply transaction persistence errors", () => {
  it.each(["flush", "commit"] as const)(
    "preserves the deletion conflict when a delete fails during %s",
    async (phase) => {
      const failure = Object.assign(new Error("referenced"), { code: "23503" });
      const { transaction, tx } = setup(failure, phase);
      tx.findOne.mockResolvedValue({ id: reply.id });
      await expect(transaction.run((scope) => scope.replies.delete(reply))).rejects.toMatchObject({
        kind: "conflict",
        detail: {
          message:
            "This comment could not be deleted because it is still referenced. Hide it instead.",
        },
      });
      expect(tx.remove).toHaveBeenCalled();
    },
  );

  it("does not label a reply creation FK race as a deletion conflict", async () => {
    const failure = Object.assign(new Error("target was deleted"), {
      code: "23503",
      constraint: "reply_post_id_foreign",
    });
    const { transaction } = setup(failure);
    await expect(transaction.run((scope) => scope.replies.save(reply))).rejects.toBe(failure);
  });

  it("does not label a report creation FK race as a deletion conflict", async () => {
    const failure = Object.assign(new Error("reply was deleted"), {
      name: "ForeignKeyConstraintViolationException",
    });
    const { transaction } = setup(failure);
    await expect(
      transaction.run((scope) =>
        scope.reports.save({
          id: "report",
          reply,
          reporter: { id: "reporter" },
          reason: "spam",
          createdAt: new Date(),
        }),
      ),
    ).rejects.toBe(failure);
  });

  it.each(["flush", "commit"] as const)(
    "translates the duplicate reporter constraint during %s with its business code",
    async (phase) => {
      const failure = Object.assign(new Error("duplicate"), {
        code: "23505",
        constraint: "reply_report_reply_id_reporter_id_index",
      });
      const { transaction } = setup(failure, phase);
      await expect(
        transaction.run((scope) =>
          scope.reports.save({
            id: "report",
            reply,
            reporter: { id: "reporter" },
            reason: "spam",
            createdAt: new Date(),
          }),
        ),
      ).rejects.toMatchObject({
        kind: "conflict",
        detail: {
          message: "You already reported this comment.",
          code: FORUM_ERROR_CODES.REPLY_ALREADY_REPORTED,
        },
      });
    },
  );

  it.each(["reply_pkey", "reply_report_pkey", undefined])(
    "does not label unrelated uniqueness errors (%p) as duplicate reports",
    async (constraint) => {
      const failure = Object.assign(new Error("duplicate id"), { code: "23505", constraint });
      const { transaction } = setup(failure);
      await expect(transaction.run((scope) => scope.replies.save(reply))).rejects.toBe(failure);
    },
  );

  it("preserves application conflicts and unexpected errors", async () => {
    const failure = new ConflictError({ message: "Already reported", code: "existing-code" });
    const { transaction } = setup(new Error("unexpected flush"));
    await expect(
      transaction.run(async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
  });
});
