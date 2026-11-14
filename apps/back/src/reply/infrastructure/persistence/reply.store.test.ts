import { EntityManager } from "@mikro-orm/postgresql";
import {
  type EntityName,
  ForeignKeyConstraintViolationException,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";
import { FORUM_ERROR_CODES } from "@sarpbc/types";
import { describe, expect, it, vi } from "vitest";
import type { ReplyRecord } from "../../application/models";
import { unconstructed } from "../../../../test/doubles";
import { MikroReplyStore, replyReports } from "./reply.store";

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

function entityManager(flushFailure: Error | null) {
  return {
    getRepository: vi.fn<() => object>().mockReturnValue({}),
    findOne: vi.fn<() => Promise<{ id: string }>>().mockResolvedValue({ id: reply.id }),
    getReference: vi.fn<(entity: EntityName<object>, id: string) => { id: string }>(
      (_entity, id) => ({ id }),
    ),
    persist: vi.fn<EntityManager["persist"]>(),
    remove: vi.fn<EntityManager["remove"]>(),
    flush: vi.fn<() => Promise<void>>(async () => {
      if (flushFailure) throw flushFailure;
    }),
  };
}

const asEntityManager = (em: ReturnType<typeof entityManager>): EntityManager =>
  Object.assign(unconstructed(EntityManager), em);

const report = {
  id: "report",
  reply: { id: reply.id },
  reporter: { id: "reporter" },
  reason: "spam" as const,
  createdAt: new Date(),
};

describe("MikroReplyStore.delete", () => {
  it("asks to hide a reply that is still referenced", async () => {
    const em = entityManager(new ForeignKeyConstraintViolationException(new Error("referenced")));

    await expect(new MikroReplyStore(asEntityManager(em)).delete(reply)).rejects.toMatchObject({
      kind: "conflict",
      detail: {
        message:
          "This comment could not be deleted because it is still referenced. Hide it instead.",
      },
    });
    expect(em.remove).toHaveBeenCalledExactlyOnceWith({ id: reply.id });
  });

  it("rethrows other database failures", async () => {
    const failure = new Error("connection lost");

    await expect(
      new MikroReplyStore(asEntityManager(entityManager(failure))).delete(reply),
    ).rejects.toBe(failure);
  });
});

describe("MikroReplyStore.save", () => {
  it("leaves a creation foreign key race to the transaction", async () => {
    const em = entityManager(new ForeignKeyConstraintViolationException(new Error("deleted")));

    await new MikroReplyStore(asEntityManager(em)).save(reply);

    expect(em.flush).not.toHaveBeenCalled();
  });
});

describe("replyReports.save", () => {
  it("reports a duplicate reporter with its business code", async () => {
    const em = entityManager(new UniqueConstraintViolationException(new Error("duplicate")));

    await expect(replyReports(asEntityManager(em)).save(report)).rejects.toMatchObject({
      kind: "conflict",
      detail: {
        message: "You already reported this comment.",
        code: FORUM_ERROR_CODES.REPLY_ALREADY_REPORTED,
      },
    });
  });

  it("rethrows a foreign key violation from a reply deleted meanwhile", async () => {
    const failure = new ForeignKeyConstraintViolationException(new Error("reply was deleted"));

    await expect(replyReports(asEntityManager(entityManager(failure))).save(report)).rejects.toBe(
      failure,
    );
  });
});
