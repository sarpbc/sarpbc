import { EntityManager } from "@mikro-orm/postgresql";
import { describe, expect, it, vi } from "vitest";
import { SeasonRosterReferences } from "./roster-references.mover";
import { SeasonAward } from "./season.entities";

describe("SeasonRosterReferences.movePlayer", () => {
  function award(id: string, playerId: string, seasonId: string, region: string | null) {
    return {
      id,
      player: { id: playerId },
      season: { id: seasonId },
      awardType: "regular_season_mvp",
      region,
    };
  }

  function mover(awards: ReturnType<typeof award>[]) {
    const find = vi.fn().mockResolvedValue(awards);
    const nativeDelete = vi.fn();
    const nativeUpdate = vi.fn();
    const references = new SeasonRosterReferences(
      Object.assign(Object.create(EntityManager.prototype), { find, nativeDelete, nativeUpdate }),
    );
    return { references, nativeDelete, nativeUpdate };
  }

  it("drops the duplicate's award the kept player already holds before moving the rest", async () => {
    const { references, nativeDelete, nativeUpdate } = mover([
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
    const { references, nativeDelete, nativeUpdate } = mover([
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
