import { EntityManager } from "@mikro-orm/postgresql";
import { unconstructed } from "../../../../test/doubles";
import {
  ForeignKeyConstraintViolationException,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";
import type { EntityName } from "@mikro-orm/core";
import { describe, expect, it } from "vitest";
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

const storeFailingWith = (failure: Error) => {
  const flushing = { flush: async () => await Promise.reject(failure) };

  const em = {
    findOne: async () => await Promise.resolve(null),
    flush: flushing.flush,
    getReference: (_entity: EntityName<object>, id: string) => ({ id }),
    persist: () => flushing,
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
