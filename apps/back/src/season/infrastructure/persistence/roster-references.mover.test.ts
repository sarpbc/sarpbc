import { EntityManager } from "@mikro-orm/postgresql";
import { unconstructed } from "../../../../test/doubles";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SeasonRosterReferences } from "./roster-references.mover";
import { Season } from "./season.entity";
import { SeasonAward } from "./season-award.entity";
import { SeasonParticipant } from "./season-participant.entity";
import { SeasonPathEntry } from "./season-path-entry.entity";

function award(id: string, playerId: string, seasonId: string, region: string | null) {
  return {
    id,
    player: { id: playerId },
    season: { id: seasonId },
    awardType: "regular_season_mvp",
    region,
  };
}

function awardMover(awards: ReturnType<typeof award>[]) {
  const find = vi.fn<EntityManager["find"]>().mockResolvedValue(awards);
  const nativeDelete = vi.fn<EntityManager["nativeDelete"]>();
  const nativeUpdate = vi.fn<EntityManager["nativeUpdate"]>();

  const references = new SeasonRosterReferences(
    Object.assign(unconstructed(EntityManager), { find, nativeDelete, nativeUpdate }),
  );

  return { references, nativeDelete, nativeUpdate };
}

describe("SeasonRosterReferences.movePlayer", () => {
  it("drops the duplicate's award the kept player already holds before moving the rest", async () => {
    const { references, nativeDelete, nativeUpdate } = awardMover([
      award("kept-global", "zen", "2026", null),
      award("dup-global", "zen-dup", "2026", null),
      award("dup-europe", "zen-dup", "2026", "Europe"),
      award("dup-previous", "zen-dup", "2025", null),
    ]);

    await references.movePlayer("zen-dup", "zen");

    expect(nativeDelete).toHaveBeenCalledWith(SeasonAward, { id: { $in: ["dup-global"] } });
    expect(nativeUpdate).toHaveBeenCalledWith(
      SeasonAward,
      { player: "zen-dup" },
      { player: "zen" },
    );
    expect(nativeDelete.mock.invocationCallOrder[0]).toBeLessThan(
      nativeUpdate.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("reassigns every award when the kept player holds none of them", async () => {
    const { references, nativeDelete, nativeUpdate } = awardMover([
      award("kept-europe", "zen", "2026", "Europe"),
      award("dup-global", "zen-dup", "2026", null),
    ]);

    await references.movePlayer("zen-dup", "zen");

    expect(nativeDelete).not.toHaveBeenCalled();
    expect(nativeUpdate).toHaveBeenCalledWith(
      SeasonAward,
      { player: "zen-dup" },
      { player: "zen" },
    );
  });
});

function participant(id: string, teamId: string, seasonId: string, pathNote: string | null) {
  return { id, team: { id: teamId }, season: { id: seasonId }, pathNote };
}

function participantMover(participants: ReturnType<typeof participant>[]) {
  const find = vi.fn<EntityManager["find"]>().mockResolvedValue(participants);
  const nativeDelete = vi.fn<EntityManager["nativeDelete"]>();
  const nativeUpdate = vi.fn<EntityManager["nativeUpdate"]>();

  const references = new SeasonRosterReferences(
    Object.assign(unconstructed(EntityManager), { find, nativeDelete, nativeUpdate }),
  );

  return { references, nativeDelete, nativeUpdate };
}

describe("SeasonRosterReferences.moveTeam", () => {
  let nativeDelete: ReturnType<typeof participantMover>["nativeDelete"];
  let nativeUpdate: ReturnType<typeof participantMover>["nativeUpdate"];

  beforeEach(async () => {
    const mover = participantMover([
      participant("kept-2024", "vitality", "2024", null),
      participant("dup-2024", "vitality-dup", "2024", "Won the Major."),
      participant("dup-2023", "vitality-dup", "2023", null),
    ]);

    ({ nativeDelete, nativeUpdate } = mover);

    await mover.references.moveTeam("vitality-dup", "vitality");
  });

  it("moves the season winner to the kept team", () => {
    expect(nativeUpdate).toHaveBeenCalledWith(
      Season,
      { winnerTeam: "vitality-dup" },
      { winnerTeam: "vitality" },
    );
  });

  it("folds the path entries and the note of a shared season into the kept team", () => {
    expect(nativeUpdate).toHaveBeenCalledWith(
      SeasonPathEntry,
      { participant: "dup-2024" },
      { participant: "kept-2024" },
    );
    expect(nativeUpdate).toHaveBeenCalledWith(
      SeasonParticipant,
      { id: "kept-2024" },
      { pathNote: "Won the Major." },
    );
  });

  it("deletes only the duplicate's participant of the shared season", () => {
    expect(nativeDelete).toHaveBeenCalledExactlyOnceWith(SeasonParticipant, { id: "dup-2024" });
  });

  it("reassigns the remaining participants last", () => {
    expect(nativeUpdate).toHaveBeenLastCalledWith(
      SeasonParticipant,
      { team: "vitality-dup" },
      { team: "vitality" },
    );
  });
});
