import { describe, expect, it } from "vitest";
import { EntityManager } from "@mikro-orm/postgresql";
import { unconstructed } from "../../../../test/doubles";
import { TournamentRosterReferences } from "./roster-references.mover";
import { TournamentPrize } from "./tournament-prize.entities";

type Entity = Parameters<EntityManager["nativeDelete"]>[0];

type Where = Parameters<EntityManager["nativeDelete"]>[1];

type Data = Parameters<EntityManager["nativeUpdate"]>[2];

const prize = (id: string, teamId: string, tournamentId: string, playerIds: string[]) => {
  const added: { id: string }[][] = [];

  return {
    added,
    id,
    players: {
      add: (items: { id: string }[]) => {
        added.push(items);
      },
      getItems: () => playerIds.map((playerId) => ({ id: playerId })),
    },
    team: { id: teamId },
    tournament: { id: tournamentId },
  };
};

const mover = (prizes: ReturnType<typeof prize>[]) => {
  const writes: { entity: Entity; kind: "delete" | "update"; where: Where; data?: Data }[] = [];

  const references = new TournamentRosterReferences(
    Object.assign(unconstructed(EntityManager), {
      find: async () => prizes,
      nativeDelete: async (entity: Entity, where: Where) => {
        writes.push({ entity, kind: "delete", where });

        return 0;
      },
      nativeUpdate: async (entity: Entity, where: Where, data: Data) => {
        writes.push({ data, entity, kind: "update", where });

        return 0;
      },
    }),
  );

  return { references, writes };
};

describe("TournamentRosterReferences.moveTeam prizes", () => {
  it("folds a duplicate prize on a shared tournament into the kept team before moving the rest", async () => {
    const kept = prize("kept-cup", "kc", "cup", ["zen"]);
    const duplicate = prize("dup-cup", "kc-dup", "cup", ["vatira"]);
    const moved = prize("dup-open", "kc-dup", "open", ["atow"]);

    const { references, writes } = mover([kept, duplicate, moved]);

    await references.moveTeam("kc-dup", "kc");

    const prizeWrites = writes.filter(({ entity }) => entity === TournamentPrize);

    expect(kept.added).toStrictEqual([[{ id: "vatira" }]]);
    expect(prizeWrites).toStrictEqual([
      { entity: TournamentPrize, kind: "delete", where: { id: { $in: ["dup-cup"] } } },
      {
        data: { team: "kc" },
        entity: TournamentPrize,
        kind: "update",
        where: { team: "kc-dup" },
      },
    ]);
  });

  it("moves prizes without deleting when the teams never shared a tournament", async () => {
    const { references, writes } = mover([prize("dup-open", "kc-dup", "open", [])]);

    await references.moveTeam("kc-dup", "kc");

    expect(writes.filter(({ kind }) => kind === "delete")).toStrictEqual([]);
    expect(writes).toContainEqual({
      data: { team: "kc" },
      entity: TournamentPrize,
      kind: "update",
      where: { team: "kc-dup" },
    });
  });
});
