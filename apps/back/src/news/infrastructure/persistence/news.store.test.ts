import { EntityManager } from "@mikro-orm/postgresql";
import { unconstructed } from "../../../../test/doubles";
import {
  ForeignKeyConstraintViolationException,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";
import type { EntityName } from "@mikro-orm/core";
import { describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../common/domain/errors/conflict-error";
import type { NewsArticleRecord } from "../../application/models";
import { MikroNewsStore } from "./news.store";

const article: NewsArticleRecord = {
  author: { id: "22222222-2222-4222-8222-222222222222", userName: "writer" },
  content: "<p>Body</p>",
  contentFr: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  id: "11111111-1111-4111-8111-111111111111",
  imageUrl: null,
  isDraft: true,
  slug: "taken",
  title: "Title",
  titleFr: null,
  type: "short",
  updatedAt: null,
};

const storeFailingWith = (error: Error) => {
  const em = {
    findOne: vi.fn<EntityManager["findOne"]>().mockResolvedValue(null),
    flush: vi.fn<EntityManager["flush"]>().mockRejectedValue(error),
    getReference: vi.fn<(entity: EntityName<object>, id: string) => { id: string }>(
      (_entity, id) => ({ id }),
    ),
    persist: vi.fn<() => void>(),
  };

  return new MikroNewsStore(Object.assign(unconstructed(EntityManager), em));
};

describe("MikroNewsStore.save", () => {
  it("reports a unique violation as a slug conflict", async () => {
    const store = storeFailingWith(new UniqueConstraintViolationException(new Error("duplicate")));

    await expect(store.save(article)).rejects.toThrow(ConflictError);
  });

  it("does not report other database failures as a slug conflict", async () => {
    const failure = new ForeignKeyConstraintViolationException(new Error("missing author"));

    await expect(storeFailingWith(failure).save(article)).rejects.toBe(failure);
  });
});
