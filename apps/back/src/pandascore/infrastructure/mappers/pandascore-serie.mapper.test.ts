import { describe, expect, it } from "vitest";
import { incidentSchema } from "../dto/incident.dto";
import { parseProviderDeletion, toUpsertSerieCommand } from "./pandascore-serie.mapper";

interface DeletionObject {
  deleted_at?: string;
  reason: string | number | null;
  videogame_id?: number;
}

const deletionReason = (object: DeletionObject | null): string | null => {
  const incident = incidentSchema.parse({
    id: 1,
    modified_at: "2026-10-01T00:00:00Z",
    change_type: "deletion",
    type: "serie",
    object,
  });

  if (incident.change_type !== "deletion") {
    throw new Error("expected a deletion");
  }

  return incident.object;
};

const deletion = (reason: string | null) => ({
  deleted_at: "2026-10-01T00:00:00Z",
  reason,
  videogame_id: 14,
});

describe(parseProviderDeletion, () => {
  it("reads a merge into another serie", () => {
    expect(parseProviderDeletion(deletionReason(deletion("Merged with 9417")))).toStrictEqual({
      kind: "merged",
      intoId: 9417,
    });
  });

  it.each(["serie", "tournament"] as const)("reads a replacement by a %s", (entity) => {
    expect(
      parseProviderDeletion(deletionReason(deletion(`Replaced by ${entity} 512`))),
    ).toStrictEqual({
      kind: "replaced",
      entity,
      byId: 512,
    });
  });

  it.each([
    deletion("Model deleted"),
    deletion("Merged with someone"),
    deletion(null),
    { reason: 42 },
    null,
  ])("treats %p as a plain deletion", (object) => {
    expect(parseProviderDeletion(deletionReason(object))).toStrictEqual({ kind: "deleted" });
  });
});

describe("serie incidents", () => {
  it("parse leniently so an unexpected provider field cannot fail the page", () => {
    const incident = incidentSchema.parse({
      id: 1,
      modified_at: "2026-10-01T00:00:00Z",
      change_type: "update",
      type: "serie",
      object: { id: 9417, full_name: "Paris 2026", year: "2026", league: { id: 4 } },
    });

    if (incident.change_type === "deletion" || incident.type !== "serie") {
      throw new Error("expected a serie update");
    }

    expect(toUpsertSerieCommand(incident.object)).toStrictEqual({
      pandascoreId: 9417,
      fullName: "Paris 2026",
      year: undefined,
    });
  });
});
