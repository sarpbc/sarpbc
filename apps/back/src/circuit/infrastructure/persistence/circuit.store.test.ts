import { EntityManager } from "@mikro-orm/postgresql";
import {
  ForeignKeyConstraintViolationException,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";
import type { CircuitSummary } from "@sarpbc/types";
import { unconstructed } from "../../../../test/doubles";
import { describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../common/domain/errors/conflict-error";
import { CircuitPersistence } from "./circuit.store";

const circuit: CircuitSummary = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "season-2026",
  name: "RLCS 2026",
  season: 2026,
  region: null,
  description: null,
  sourceUrl: "https://example.org/rules",
  qualificationSpots: null,
};

function storeFailingWith(error: Error) {
  const em = {
    findOne: vi.fn().mockResolvedValue(null),
    persist: vi.fn().mockReturnThis(),
    flush: vi.fn().mockRejectedValue(error),
  };

  return new CircuitPersistence(Object.assign(unconstructed(EntityManager), em));
}

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
