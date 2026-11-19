import { EntityManager } from "@mikro-orm/postgresql";
import { unconstructed } from "../../../../test/doubles";
import { describe, expect, it } from "vitest";
import type { CircuitStageTeam } from "./circuit-stage-team.entity";
import { CircuitRosterReferences } from "./roster-references.mover";

interface Row {
  id: string;
  stage: { id: string };
  team: { id: string };
}

const entry = (id: string, teamId: string, stageId: string) => ({
  id,
  stage: { id: stageId },
  team: { id: teamId },
});

const mover = (initial: Row[]) => {
  const rows = [...initial];

  const em = {
    find: async () => await Promise.resolve([...rows]),
    nativeDelete: async (_entity: typeof CircuitStageTeam, where: { id: { $in: string[] } }) => {
      for (const id of where.id.$in) {
        rows.splice(
          rows.findIndex((row) => row.id === id),
          1,
        );
      }

      return await Promise.resolve(where.id.$in.length);
    },
    nativeUpdate: async (
      _entity: typeof CircuitStageTeam,
      where: { team: string },
      data: { team: string },
    ) => {
      const moved = rows.filter((row) => row.team.id === where.team);

      if (
        moved.some((row) =>
          rows.some((other) => other.team.id === data.team && other.stage.id === row.stage.id),
        )
      ) {
        throw new Error("duplicate stage team");
      }

      for (const row of moved) {
        row.team = { id: data.team };
      }

      return await Promise.resolve(moved.length);
    },
  };

  const references = new CircuitRosterReferences(Object.assign(unconstructed(EntityManager), em));

  return { references, rows };
};

describe("CircuitRosterReferences.moveTeam", () => {
  it("drops the duplicate's entry in a stage the kept team already has, then moves the rest", async () => {
    const { references, rows } = mover([
      entry("kept-major", "kc", "major"),
      entry("dup-major", "kc-dup", "major"),
      entry("dup-open", "kc-dup", "open"),
    ]);

    await references.moveTeam("kc-dup", "kc");

    expect(rows).toStrictEqual([
      entry("kept-major", "kc", "major"),
      entry("dup-open", "kc", "open"),
    ]);
  });

  it("moves every entry when the kept team has none in the same stages", async () => {
    const { references, rows } = mover([entry("dup-open", "kc-dup", "open")]);

    await references.moveTeam("kc-dup", "kc");

    expect(rows).toStrictEqual([entry("dup-open", "kc", "open")]);
  });
});
