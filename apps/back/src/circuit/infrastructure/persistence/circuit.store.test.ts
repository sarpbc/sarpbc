import { EntityManager } from "@mikro-orm/postgresql";
import {
  ForeignKeyConstraintViolationException,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";
import type { CircuitSummary } from "@sarpbc/types";
import { unconstructed } from "../../../../test/doubles";
import { describe, expect, it } from "vitest";
import { ConflictError } from "../../../common/domain/errors/conflict-error";
import { CircuitPersistence } from "./circuit.store";

const circuit: CircuitSummary = {
  description: null,
  id: "11111111-1111-4111-8111-111111111111",
  name: "RLCS 2026",
  qualificationSpots: null,
  region: null,
  season: 2026,
  slug: "season-2026",
  sourceUrl: "https://example.org/rules",
};

const storeFailingWith = (failure: Error) => {
  const flushing = { flush: async () => await Promise.reject(failure) };

  const em = {
    findOne: async () => await Promise.resolve(null),
    flush: flushing.flush,
    persist: () => flushing,
  };

  return new CircuitPersistence(Object.assign(unconstructed(EntityManager), em));
};

describe("CircuitPersistence.save", () => {
  it("reports a unique violation from a concurrent twin as a conflict", async () => {
    const store = storeFailingWith(new UniqueConstraintViolationException(new Error("duplicate")));

    await expect(store.save(circuit)).rejects.toThrow(ConflictError);
  });

  it("does not report other database failures as a conflict", async () => {
    const failure = new ForeignKeyConstraintViolationException(new Error("broken"));

    await expect(storeFailingWith(failure).save(circuit)).rejects.toBe(failure);
  });
});
