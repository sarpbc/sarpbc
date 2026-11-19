import { describe, expect, it } from "vitest";
import { incidentSchema } from "../dto/incident.dto";
import { parseProviderDeletion, toUpsertSerieCommand } from "./pandascore-serie.mapper";

interface DeletionObject {
  deleted_at?: string;
  reason: string | number | null;
  videogame_id?: number;
}

const deletionReason = (object: DeletionObject | null) => {
  const incident = incidentSchema.parse({
    change_type: "deletion",
    id: 1,
    modified_at: "2026-10-01T00:00:00Z",
    object,
    type: "serie",
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
      intoId: 9417,
      kind: "merged",
    });
  });

  it.each(["serie", "tournament"] as const)("reads a replacement by a %s", (entity) => {
    expect(
      parseProviderDeletion(deletionReason(deletion(`Replaced by ${entity} 512`))),
    ).toStrictEqual({
      byId: 512,
      entity,
      kind: "replaced",
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
      change_type: "update",
      id: 1,
      modified_at: "2026-10-01T00:00:00Z",
      object: { full_name: "Paris 2026", id: 9417, league: { id: 4 }, year: "2026" },
      type: "serie",
    });

    if (incident.change_type === "deletion" || incident.type !== "serie") {
      throw new Error("expected a serie update");
    }

    expect(toUpsertSerieCommand(incident.object)).toStrictEqual({
      fullName: "Paris 2026",
      pandascoreId: 9417,
      year: undefined,
    });
  });
});
