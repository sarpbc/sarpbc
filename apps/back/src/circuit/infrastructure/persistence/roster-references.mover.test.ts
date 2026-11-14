import { EntityManager } from "@mikro-orm/postgresql";
import { unconstructed } from "../../../../test/doubles";
import { describe, expect, it, vi } from "vitest";
import { CircuitStageTeam } from "./circuit-stage-team.entity";
import { CircuitRosterReferences } from "./roster-references.mover";

function entry(id: string, teamId: string, stageId: string) {
  return { id, team: { id: teamId }, stage: { id: stageId } };
}

function mover(entries: ReturnType<typeof entry>[]) {
  const find = vi.fn().mockResolvedValue(entries);
  const nativeDelete = vi.fn();
  const nativeUpdate = vi.fn();

  const references = new CircuitRosterReferences(
    Object.assign(unconstructed(EntityManager), { find, nativeDelete, nativeUpdate }),
  );

  return { references, nativeDelete, nativeUpdate };
}

describe("CircuitRosterReferences.moveTeam", () => {
  it("drops the duplicate's entry in a stage the kept team already has, then moves the rest", async () => {
    const { references, nativeDelete, nativeUpdate } = mover([
      entry("kept-major", "kc", "major"),
      entry("dup-major", "kc-dup", "major"),
      entry("dup-open", "kc-dup", "open"),
    ]);

    await references.moveTeam("kc-dup", "kc");

    expect(nativeDelete).toHaveBeenCalledWith(CircuitStageTeam, { id: { $in: ["dup-major"] } });
    expect(nativeUpdate).toHaveBeenCalledWith(CircuitStageTeam, { team: "kc-dup" }, { team: "kc" });
    expect(nativeDelete.mock.invocationCallOrder[0]).toBeLessThan(
      nativeUpdate.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("moves every entry when the kept team has none in the same stages", async () => {
    const { references, nativeDelete, nativeUpdate } = mover([entry("dup-open", "kc-dup", "open")]);

    await references.moveTeam("kc-dup", "kc");

    expect(nativeDelete).not.toHaveBeenCalled();
    expect(nativeUpdate).toHaveBeenCalledWith(CircuitStageTeam, { team: "kc-dup" }, { team: "kc" });
  });
});
