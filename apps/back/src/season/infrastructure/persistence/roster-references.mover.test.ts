import { EntityManager } from "@mikro-orm/postgresql";
import { unconstructed } from "../../../../test/doubles";
import { beforeEach, describe, expect, it } from "vitest";
import { SeasonRosterReferences } from "./roster-references.mover";
import { Season } from "./season.entity";
import { SeasonAward } from "./season-award.entity";
import { SeasonParticipant } from "./season-participant.entity";
import { SeasonPathEntry } from "./season-path-entry.entity";

const award = (id: string, playerId: string, seasonId: string, region: string | null) => ({
  awardType: "regular_season_mvp",
  id,
  player: { id: playerId },
  region,
  season: { id: seasonId },
});

type Entity =
  | typeof Season
  | typeof SeasonAward
  | typeof SeasonParticipant
  | typeof SeasonPathEntry;

type Criteria = Record<string, string | null | { $in: string[] }>;

interface Operation {
  kind: "delete" | "update";
  entity: Entity;
  where: Criteria;
  data?: Criteria;
}

const moverOver = (rows: object[]) => {
  const operations: Operation[] = [];

  const manager = Object.assign(unconstructed(EntityManager), {
    find: async () => rows,
    nativeDelete: async (entity: Entity, where: Criteria) => {
      operations.push({ entity, kind: "delete", where });

      return 1;
    },
    nativeUpdate: async (entity: Entity, where: Criteria, data: Criteria) => {
      operations.push({ data, entity, kind: "update", where });

      return 1;
    },
  });

  return { operations, references: new SeasonRosterReferences(manager) };
};

describe("SeasonRosterReferences.movePlayer", () => {
  it("drops the duplicate's award the kept player already holds before moving the rest", async () => {
    const { references, operations } = moverOver([
      award("kept-global", "zen", "2026", null),
      award("dup-global", "zen-dup", "2026", null),
      award("dup-europe", "zen-dup", "2026", "Europe"),
      award("dup-previous", "zen-dup", "2025", null),
    ]);

    await references.movePlayer("zen-dup", "zen");

    expect(operations).toStrictEqual([
      { entity: SeasonAward, kind: "delete", where: { id: { $in: ["dup-global"] } } },
      {
        data: { player: "zen" },
        entity: SeasonAward,
        kind: "update",
        where: { player: "zen-dup" },
      },
    ]);
  });

  it("reassigns every award when the kept player holds none of them", async () => {
    const { references, operations } = moverOver([
      award("kept-europe", "zen", "2026", "Europe"),
      award("dup-global", "zen-dup", "2026", null),
    ]);

    await references.movePlayer("zen-dup", "zen");

    expect(operations).toStrictEqual([
      {
        data: { player: "zen" },
        entity: SeasonAward,
        kind: "update",
        where: { player: "zen-dup" },
      },
    ]);
  });
});

const participant = (id: string, teamId: string, seasonId: string, pathNote: string | null) => ({
  id,
  pathNote,
  season: { id: seasonId },
  team: { id: teamId },
});

describe("SeasonRosterReferences.moveTeam", () => {
  let operations: Operation[];

  const updates = (entity: Entity) =>
    operations.filter((operation) => operation.kind === "update" && operation.entity === entity);

  beforeEach(async () => {
    const mover = moverOver([
      participant("kept-2024", "vitality", "2024", null),
      participant("dup-2024", "vitality-dup", "2024", "Won the Major."),
      participant("dup-2023", "vitality-dup", "2023", null),
    ]);

    ({ operations } = mover);

    await mover.references.moveTeam("vitality-dup", "vitality");
  });

  it("moves the season winner to the kept team", () => {
    expect(updates(Season)).toStrictEqual([
      {
        data: { winnerTeam: "vitality" },
        entity: Season,
        kind: "update",
        where: { winnerTeam: "vitality-dup" },
      },
    ]);
  });

  it("folds the path entries and the note of a shared season into the kept team", () => {
    expect(updates(SeasonPathEntry)).toStrictEqual([
      {
        data: { participant: "kept-2024" },
        entity: SeasonPathEntry,
        kind: "update",
        where: { participant: "dup-2024" },
      },
    ]);
    expect(operations).toContainEqual({
      data: { pathNote: "Won the Major." },
      entity: SeasonParticipant,
      kind: "update",
      where: { id: "kept-2024" },
    });
  });

  it("deletes only the duplicate's participant of the shared season", () => {
    expect(operations.filter(({ kind }) => kind === "delete")).toStrictEqual([
      { entity: SeasonParticipant, kind: "delete", where: { id: "dup-2024" } },
    ]);
  });

  it("reassigns the remaining participants last", () => {
    expect(operations.at(-1)).toStrictEqual({
      data: { team: "vitality" },
      entity: SeasonParticipant,
      kind: "update",
      where: { team: "vitality-dup" },
    });
  });
});
